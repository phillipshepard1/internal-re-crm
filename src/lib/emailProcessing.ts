import { createClient } from '@supabase/supabase-js'

interface EmailProcessingRequest {
  emailData: {
    from: string
    subject: string
    body: string
    to?: string
    date?: string
  }
  userId: string
}

interface EmailProcessingResult {
  success: boolean
  message: string
  person?: any
  analysis?: {
    confidence: number
    reasons: string[]
    source: string
    extracted_fields?: string[]
  } | any
  error?: string
  details?: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * Create structured notes from lead data and email
 */
function createStructuredNotesFromLeadData(leadData: any, emailData: any): string {
  const notes = []
  
  // Add email source information
  notes.push(`Email Source: ${emailData.from}`)
  notes.push(`Subject: ${emailData.subject}`)
  notes.push(`Date: ${emailData.date || new Date().toISOString()}`)
  notes.push(`Lead Source: ${leadData.lead_source}`)
  notes.push(`Confidence Score: ${(leadData.confidence_score * 100).toFixed(1)}%`)
  
  // Add extracted information
  if (leadData.company) notes.push(`Company: ${leadData.company}`)
  if (leadData.position) notes.push(`Position: ${leadData.position}`)
  if (leadData.property_address) notes.push(`Property Address: ${leadData.property_address}`)
  if (leadData.property_details) notes.push(`Property Details: ${leadData.property_details}`)
  
  // Add message content (truncated)
  if (leadData.message) {
    const truncatedMessage = leadData.message.length > 500 
      ? leadData.message.substring(0, 500) + '...'
      : leadData.message
    notes.push(`Message: ${truncatedMessage}`)
  }
  
  return notes.join('\n')
}

export async function processEmailAsLead(request: EmailProcessingRequest): Promise<EmailProcessingResult> {
  try {
    const { emailData, userId } = request

    if (!emailData || !userId) {
      return {
        success: false,
        message: 'Email data and user ID are required',
        error: 'Email data and user ID are required'
      }
    }

    const { from, subject, body: emailBody, to, date } = emailData

    // Validate required email fields
    if (!from || !subject || !emailBody) {
      return {
        success: false,
        message: 'Email from, subject, and body are required',
        error: 'Email from, subject, and body are required'
      }
    }

    console.log('Processing email:', { from, subject: subject.substring(0, 50) + '...' })

    // Import the lead detection service
    const { LeadDetectionService } = await import('@/lib/leadDetection')
    
    // Extract lead data using AI-powered detection
    const leadResult = await LeadDetectionService.extractLeadData({
      from,
      subject,
      body: emailBody,
      to,
      date
    })

    console.log('Lead extraction result:', {
      success: leadResult.success,
      has_data: !!leadResult.lead_data,
      error: leadResult.error,
      confidence: leadResult.lead_data?.confidence_score
    })

    if (!leadResult.success || !leadResult.lead_data) {
      return {
        success: false,
        message: leadResult.error || 'Failed to extract lead data from email',
        details: 'The email content could not be parsed into a valid lead. This may be because the email is not from a recognized lead source or the content does not contain sufficient lead information.',
        analysis: leadResult.analysis_result,
        error: leadResult.error || 'Email does not appear to be a lead'
      }
    }

    // Enhanced validation with better error messages
    const validationErrors = []
    
    if (!leadResult.lead_data.first_name || !leadResult.lead_data.last_name) {
      validationErrors.push('Could not extract valid name from email')
    }
    
    if (!leadResult.lead_data.email || leadResult.lead_data.email.length === 0) {
      validationErrors.push('Could not extract valid email address from email')
    }
    
    // Check if we have at least some basic information
    if (validationErrors.length > 0 && leadResult.lead_data.confidence_score < 0.3) {
      return {
        success: false,
        message: 'Insufficient lead information found',
        details: validationErrors.join('. ') + '. The email may not contain enough information to create a valid lead.',
        analysis: leadResult.analysis_result,
        error: 'Insufficient lead information'
      }
    }

    // Check for existing person with the same email to prevent duplicates
    let existingPerson = null
    let existingError: any = null
    
    // First, check for exact email matches (same person's email)
    for (const email of leadResult.lead_data.email) {
      try {
        const { data: person, error: error } = await supabase
          .from('people')
          .select('id, first_name, last_name, email, lead_status, lead_source, created_at, phone, company, position, address, notes')
          .filter('email', 'cs', `{${email}}`)
          .single()

        if (person) {
          existingPerson = person
          console.log('Found existing person with exact email match:', person.email)
          break
        }
        
        if (error && error.code !== 'PGRST116') {
          existingError = error
          break
        }
      } catch (error) {
        console.error('Error checking for existing person:', error)
        existingError = error
        break
      }
    }

    // If no exact email match, check for name and phone matches (same person, different contact info)
    if (!existingPerson && leadResult.lead_data.first_name && leadResult.lead_data.last_name) {
      try {
        const { data: nameMatches, error: nameError } = await supabase
          .from('people')
          .select('id, first_name, last_name, email, lead_status, lead_source, created_at, phone, company, position, address, notes')
          .ilike('first_name', leadResult.lead_data.first_name)
          .ilike('last_name', leadResult.lead_data.last_name)
          .order('created_at', { ascending: false })
          .limit(5)

        if (nameMatches && nameMatches.length > 0) {
          // Check if any name match also has phone number match
          if (leadResult.lead_data.phone && leadResult.lead_data.phone.length > 0) {
            for (const phone of leadResult.lead_data.phone) {
              const phoneMatch = nameMatches.find(person => 
                person.phone && person.phone.includes(phone)
              )
              if (phoneMatch) {
                existingPerson = phoneMatch
                console.log('Found existing person with name and phone match:', phoneMatch.email)
                break
              }
            }
          }
          
          // If no phone match but name is very close, consider it the same person
          if (!existingPerson && nameMatches.length === 1) {
            const nameMatch = nameMatches[0]
            // Only consider it a match if the names are exactly the same (case insensitive)
            if (nameMatch.first_name.toLowerCase() === leadResult.lead_data.first_name.toLowerCase() &&
                nameMatch.last_name.toLowerCase() === leadResult.lead_data.last_name.toLowerCase()) {
              existingPerson = nameMatch
              console.log('Found existing person with exact name match:', nameMatch.email)
            }
          }
        }
      } catch (error) {
        console.error('Error checking for name matches:', error)
      }
    }

    if (existingPerson) {
      console.log('Found existing person:', existingPerson.email)
      
      // Update the existing lead with new information instead of creating duplicate
      const updateData: any = {
        last_interaction: new Date().toISOString(),
        next_follow_up: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      }

      // Add new information if available
      if (leadResult.lead_data.company && !existingPerson.company) {
        updateData.company = leadResult.lead_data.company
      }
      if (leadResult.lead_data.position && !existingPerson.position) {
        updateData.position = leadResult.lead_data.position
      }
      if (leadResult.lead_data.property_address && !existingPerson.address) {
        updateData.address = leadResult.lead_data.property_address
      }

      // Update notes with new email information
      const newNote = createStructuredNotesFromLeadData(leadResult.lead_data, emailData)
      const updatedNotes = existingPerson.notes 
        ? `${existingPerson.notes}\n\n--- NEW EMAIL ---\n${newNote}`
        : newNote
      
      updateData.notes = updatedNotes

      // Update the existing person
      const { data: updatedPerson, error: updateError } = await supabase
        .from('people')
        .update(updateData)
        .eq('id', existingPerson.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating existing person:', updateError)
        return {
          success: false,
          message: 'Error updating existing lead',
          details: updateError.message,
          error: 'Update failed'
        }
      }

      // Create an activity log entry for the update
      try {
        const { error: activityError } = await supabase
          .from('activities')
          .insert({
            person_id: existingPerson.id,
            type: 'updated',
            description: `Lead updated with new information from ${leadResult.lead_data.lead_source} (Confidence: ${(leadResult.lead_data.confidence_score * 100).toFixed(1)}%)`,
            created_by: userId,
          })

        if (activityError) {
          console.error('Error creating activity:', activityError)
        }
      } catch (activityError) {
        console.error('Error creating activity:', activityError)
      }

      return {
        success: true,
        message: 'Existing lead updated with new information',
        person: updatedPerson,
        analysis: {
          confidence: leadResult.analysis_result?.confidence_score || leadResult.lead_data.confidence_score,
          reasons: leadResult.analysis_result?.reasons || ['Lead source matched'],
          source: leadResult.lead_data.lead_source,
          extracted_fields: leadResult.lead_data ? Object.keys(leadResult.lead_data).filter(key => 
            (leadResult.lead_data as any)[key] && 
            !['confidence_score', 'lead_source_id'].includes(key)
          ) : []
        }
      }
    }

    if (existingError) {
      console.error('Error checking for existing person:', existingError)
      return {
        success: false,
        message: 'Error checking for existing lead',
        details: existingError.message
      }
    }

    // Get admin user for initial assignment (leads go to staging first)
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .single()

    if (adminError || !adminUser) {
      console.error('Error finding admin user:', adminError)
      return {
        success: false,
        message: 'No admin user found for lead assignment',
        details: 'Please ensure there is at least one admin user in the system'
      }
    }

    // Create comprehensive notes from extracted data
    const notes = createStructuredNotesFromLeadData(leadResult.lead_data, emailData)

    // Prepare person data with enhanced field mapping
    const personData = {
      first_name: leadResult.lead_data.first_name || 'Unknown',
      last_name: leadResult.lead_data.last_name || 'Lead',
      email: leadResult.lead_data.email,
      phone: leadResult.lead_data.phone || [],
      client_type: 'lead',
      lead_source: leadResult.lead_data.lead_source,
      lead_source_id: leadResult.lead_data.lead_source_id,
      lead_status: 'staging', // New leads go to staging
      assigned_to: adminUser.id, // Assign to admin initially (will be reassigned from staging)
      notes: notes,
      // Set default values
      profile_picture: null,
      birthday: null,
      mailing_address: null,
      relationship_id: null,
      last_interaction: new Date().toISOString(),
      next_follow_up: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      best_to_reach_by: null,
      lists: [],
      company: leadResult.lead_data.company || null,
      position: leadResult.lead_data.position || null,
      address: leadResult.lead_data.property_address || null,
      city: null,
      state: null,
      zip_code: null,
      country: null,
      looking_for: [
        leadResult.lead_data.property_details,
        leadResult.lead_data.price_range,
        leadResult.lead_data.location_preferences,
        leadResult.lead_data.property_type,
        leadResult.lead_data.timeline
      ].filter(Boolean).join(' | ') || null,
      selling: null,
      closed: null,
    }

    console.log('Creating person with data:', {
      first_name: personData.first_name,
      last_name: personData.last_name,
      email: personData.email,
      lead_source: personData.lead_source,
      confidence: leadResult.lead_data.confidence_score
    })

    // Insert the person record
    const { data: newPerson, error: personError } = await supabase
      .from('people')
      .insert(personData)
      .select()
      .single()

    if (personError || !newPerson) {
      console.error('Error creating person:', personError)
      return {
        success: false,
        message: 'Failed to create lead record',
        details: personError?.message || 'Database error occurred while creating the lead record',
        error: personError?.message
      }
    }

    // Create an activity log entry
    try {
      const { error: activityError } = await supabase
        .from('activities')
        .insert({
          person_id: newPerson.id,
          type: 'created',
          description: `AI-detected lead from ${leadResult.lead_data.lead_source} and placed in staging (Confidence: ${(leadResult.lead_data.confidence_score * 100).toFixed(1)}%)`,
          created_by: adminUser.id,
        })

      if (activityError) {
        console.error('Error creating activity:', activityError)
        // Don't fail the entire operation if activity logging fails
      }
    } catch (activityError) {
      console.error('Error creating activity:', activityError)
    }

    return {
      success: true,
      message: 'Lead processed successfully and placed in staging',
      person: newPerson,
      analysis: {
        confidence: leadResult.analysis_result?.confidence_score || leadResult.lead_data.confidence_score,
        reasons: leadResult.analysis_result?.reasons || ['Lead source matched'],
        source: leadResult.lead_data.lead_source,
        extracted_fields: leadResult.lead_data ? Object.keys(leadResult.lead_data).filter(key => 
          (leadResult.lead_data as any)[key] && 
          !['confidence_score', 'lead_source_id'].includes(key)
        ) : []
      }
    }

  } catch (error) {
    console.error('Error processing email as lead:', error)
    return {
      success: false,
      message: 'Internal server error during lead processing',
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error occurred during email processing'
    }
  }
} 