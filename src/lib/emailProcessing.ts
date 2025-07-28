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
  aiAnalysis?: {
    is_lead: boolean
    confidence: number
    lead_data: {
      first_name: string
      last_name: string
      email: string[]
      phone: string[]
      company?: string
      position?: string
      property_address?: string
      property_details?: string
      price_range?: string
      property_type?: string
      timeline?: string
      message?: string
      lead_source?: string
      lead_source_id?: string
      confidence_score?: number
      location_preferences?: string[]
      urgency?: 'high' | 'medium' | 'low'
    }
    analysis: {
      intent: 'buying' | 'selling' | 'investing' | 'general_inquiry'
      property_type: 'residential' | 'commercial' | 'land'
      budget_range?: string
      location_preferences?: string[]
    }
  }
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
 * Strip HTML tags and clean up text content
 */
function stripHtmlAndCleanText(html: string): string {
  if (!html) return ''
  
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, '')
  
  // Decode HTML entities
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  text = text.replace(/&nbsp;/g, ' ')
  
  // Remove extra whitespace and normalize line breaks
  text = text.replace(/\s+/g, ' ')
  text = text.replace(/\n\s*\n/g, '\n')
  text = text.trim()
  
  return text
}

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
  notes.push(`Confidence Score: ${((leadData.confidence_score ?? 0) * 100).toFixed(1)}%`)
  
  // Add extracted information
  if (leadData.company) notes.push(`Company: ${leadData.company}`)
  if (leadData.position) notes.push(`Position: ${leadData.position}`)
  if (leadData.property_address) notes.push(`Property Address: ${leadData.property_address}`)
  if (leadData.property_details) notes.push(`Property Details: ${leadData.property_details}`)
  
  // Add cleaned message content (truncated)
  if (leadData.message) {
    const cleanedMessage = stripHtmlAndCleanText(leadData.message)
    const truncatedMessage = cleanedMessage.length > 500 
      ? cleanedMessage.substring(0, 500) + '...'
      : cleanedMessage
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

    // Use the AI analysis data if provided, otherwise return error
    if (!request.aiAnalysis) {
      return {
        success: false,
        message: 'No AI analysis data provided',
        details: 'This function now requires AI analysis data from N8N. Manual processing should use the inbox interface.',
        error: 'Missing AI analysis data'
      }
    }

    const leadData = request.aiAnalysis.lead_data
    const confidence = request.aiAnalysis.confidence

    console.log('AI analysis result:', {
      success: request.aiAnalysis.is_lead,
      has_data: !!leadData,
      confidence: confidence
    })

    if (!request.aiAnalysis.is_lead || !leadData) {
      return {
        success: false,
        message: 'Email does not appear to be a lead',
        details: 'The AI analysis indicates this email is not a valid lead.',
        analysis: request.aiAnalysis,
        error: 'Not a lead according to AI analysis'
      }
    }

    // Enhanced validation with better error messages
    const validationErrors = []
    
    if (!leadData.first_name || !leadData.last_name) {
      validationErrors.push('Could not extract valid name from email')
    }
    
    if (!leadData.email || leadData.email.length === 0) {
      validationErrors.push('Could not extract valid email address from email')
    }
    
    // Check if we have at least some basic information
    if (validationErrors.length > 0 && confidence < 0.3) {
      return {
        success: false,
        message: 'Insufficient lead information found',
        details: validationErrors.join('. ') + '. The email may not contain enough information to create a valid lead.',
        analysis: request.aiAnalysis,
        error: 'Insufficient lead information'
      }
    }

    // Check for existing person with the same email to prevent duplicates
    let existingPerson = null
    let existingError: any = null
    
    // Log the emails we're checking for duplicates
    console.log('Checking for duplicates with emails:', leadData.email)
    
    // Also log the email data for debugging
    console.log('Email data being processed:', {
      from: emailData.from,
      subject: emailData.subject.substring(0, 50) + '...',
      date: emailData.date
    })
    
    // First, check for exact email matches (same person's email)
    for (const email of leadData.email) {
      try {
        console.log(`Checking for existing person with email: ${email}`)
        
        // Try multiple query approaches to find existing person
        let persons = null
        let error = null
        
                 // Approach 1: Check for array containment (only if email is actually an array)
         let arrayMatch = null
         let arrayError = null
         
         try {
           const { data, error } = await supabase
             .from('people')
             .select('id, first_name, last_name, email, lead_status, lead_source, created_at, phone, company, position, address, notes')
             .contains('email', [email])
           arrayMatch = data
           arrayError = error
         } catch (error) {
           arrayError = error
         }
        
        if (!arrayError && arrayMatch && arrayMatch.length > 0) {
          persons = arrayMatch
          console.log('Found match using array containment')
        } else {
          // Approach 2: Check for exact string match
          const { data: stringMatch, error: stringError } = await supabase
            .from('people')
            .select('id, first_name, last_name, email, lead_status, lead_source, created_at, phone, company, position, address, notes')
            .eq('email', email)
          
          if (!stringError && stringMatch && stringMatch.length > 0) {
            persons = stringMatch
            console.log('Found match using exact string match')
          } else {
            // Approach 3: Check for array format match
            const { data: formatMatch, error: formatError } = await supabase
              .from('people')
              .select('id, first_name, last_name, email, lead_status, lead_source, created_at, phone, company, position, address, notes')
              .eq('email', `{${email}}`)
            
            if (!formatError && formatMatch && formatMatch.length > 0) {
              persons = formatMatch
              console.log('Found match using array format match')
            } else {
              error = formatError || stringError || arrayError
            }
          }
        }

        if (error) {
          console.error('Error checking for existing person:', error)
          existingError = error
          break
        }

        if (persons && persons.length > 0) {
          existingPerson = persons[0]
          console.log('Found existing person with exact email match:', existingPerson.email)
          break
        }
      } catch (error) {
        console.error('Error checking for existing person:', error)
        existingError = error
        break
      }
    }

    // If no exact email match, check for name and phone matches (same person, different contact info)
    if (!existingPerson && leadData.first_name && leadData.last_name) {
      try {
        const { data: nameMatches, error: nameError } = await supabase
          .from('people')
          .select('id, first_name, last_name, email, lead_status, lead_source, created_at, phone, company, position, address, notes')
          .ilike('first_name', leadData.first_name)
          .ilike('last_name', leadData.last_name)
          .order('created_at', { ascending: false })
          .limit(5)

        if (nameMatches && nameMatches.length > 0) {
          // Check if any name match also has phone number match
          if (leadData.phone && leadData.phone.length > 0) {
            for (const phone of leadData.phone) {
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
            if (nameMatch.first_name.toLowerCase() === leadData.first_name.toLowerCase() &&
                nameMatch.last_name.toLowerCase() === leadData.last_name.toLowerCase()) {
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
      console.log('Found existing person:', existingPerson.email, 'ID:', existingPerson.id)
      console.log('Existing person data:', {
        first_name: existingPerson.first_name,
        last_name: existingPerson.last_name,
        email: existingPerson.email,
        lead_status: existingPerson.lead_status
      })
      
      // Update the existing lead with new information instead of creating duplicate
      const updateData: any = {
        last_interaction: new Date().toISOString(),
        next_follow_up: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      }

      // Add new information if available
      if (leadData.company && !existingPerson.company) {
        updateData.company = leadData.company
      }
      if (leadData.position && !existingPerson.position) {
        updateData.position = leadData.position
      }
      if (leadData.property_address && !existingPerson.address) {
        updateData.address = leadData.property_address
      }

      // Update notes with new email information
      const newNote = createStructuredNotesFromLeadData(leadData, emailData)
      const updatedNotes = existingPerson.notes 
        ? `${existingPerson.notes}\n\n--- NEW EMAIL ---\n${newNote}`
        : newNote
      
      updateData.notes = updatedNotes

      // Update the person
      const { data: updatedPerson, error: updateError } = await supabase
        .from('people')
        .update(updateData)
        .eq('id', existingPerson.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating existing person:', updateError)
        throw new Error('Failed to update existing person')
      }

        // Log the activity
        await supabase.from('activities').insert({
          person_id: existingPerson.id,
          type: 'note_added',
          description: `Lead updated with new information from ${leadData.lead_source} (Confidence: ${((leadData.confidence_score ?? confidence ?? 0) * 100).toFixed(1)}%)`,
          created_by: request.userId,
        })

      return {
        success: true,
        message: 'Lead updated successfully',
        person: updatedPerson,
        analysis: {
          confidence: request.aiAnalysis.confidence,
          reasons: request.aiAnalysis.is_lead ? ['Lead source matched'] : ['Not a lead'],
          source: leadData.lead_source,
          extracted_fields: leadData ? Object.keys(leadData).filter(key => 
            (leadData as any)[key] && 
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
    const notes = createStructuredNotesFromLeadData(leadData, emailData)

    // Prepare person data with enhanced field mapping
    const personData = {
      first_name: leadData.first_name || 'Unknown',
      last_name: leadData.last_name || 'Lead',
      email: leadData.email,
      phone: leadData.phone || [],
      client_type: 'lead',
      lead_source: leadData.lead_source,
      lead_source_id: leadData.lead_source_id,
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
      company: leadData.company || null,
      position: leadData.position || null,
      address: leadData.property_address || null,
      city: null,
      state: null,
      zip_code: null,
      country: null,
      looking_for: [
        leadData.property_details,
        leadData.price_range,
        leadData.location_preferences,
        leadData.property_type,
        leadData.timeline
      ].filter(Boolean).join(' | ') || null,
      selling: null,
      closed: null,
    }

    console.log('Creating person with data:', {
      first_name: personData.first_name,
      last_name: personData.last_name,
      email: personData.email,
      email_type: typeof personData.email,
      email_is_array: Array.isArray(personData.email),
      lead_source: personData.lead_source,
      confidence: leadData.confidence_score
    })

    // Insert the person record
    console.log('Attempting to insert person with email data:', {
      email: personData.email,
      email_type: typeof personData.email,
      email_length: Array.isArray(personData.email) ? personData.email.length : 'not array'
    })
    
    // Try to insert with error handling for duplicate emails
    let newPerson = null
    let personError = null
    
    try {
      const { data, error } = await supabase
        .from('people')
        .insert(personData)
        .select()
        .single()
      
      newPerson = data
      personError = error
    } catch (error) {
      console.error('Exception during person insertion:', error)
      personError = error as any
    }

    if (personError || !newPerson) {
      console.error('Error creating person:', personError)
      
      // Check if this is a duplicate email error
      if (personError && (personError as any).code === '23505' && (personError as any).message?.includes('email')) {
        console.log('Duplicate email detected during insertion, attempting to find existing person')
        
                 // Try to find the existing person that caused the duplicate error
         for (const email of leadData.email) {
           try {
             // Try multiple approaches to find the existing person
             let existingPerson = null
             
             // Try array containment first
             try {
               const { data } = await supabase
                 .from('people')
                 .select('id, first_name, last_name, email, lead_status, lead_source, created_at, phone, company, position, address, notes')
                 .contains('email', [email])
                 .single()
               existingPerson = data
             } catch (error) {
               // If array containment fails, try exact match
               try {
                 const { data } = await supabase
                   .from('people')
                   .select('id, first_name, last_name, email, lead_status, lead_source, created_at, phone, company, position, address, notes')
                   .eq('email', email)
                   .single()
                 existingPerson = data
               } catch (error2) {
                 console.error('Error finding existing person after duplicate error:', error2)
               }
             }
            
            if (existingPerson) {
              console.log('Found existing person after duplicate error:', existingPerson.email)
              return {
                success: true,
                message: 'Lead already exists (found during duplicate error handling)',
                person: existingPerson,
                analysis: {
                  confidence: request.aiAnalysis.confidence,
                  reasons: request.aiAnalysis.is_lead ? ['Lead source matched'] : ['Not a lead'],
                  source: leadData.lead_source,
                  extracted_fields: leadData ? Object.keys(leadData).filter(key => 
                    (leadData as any)[key] && 
                    !['confidence_score', 'lead_source_id'].includes(key)
                  ) : []
                }
              }
            }
          } catch (error) {
            console.error('Error finding existing person after duplicate error:', error)
          }
        }
      }
      
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
          description: `AI-detected lead from ${leadData.lead_source} and placed in staging (Confidence: ${((leadData.confidence_score ?? 0) * 100).toFixed(1)}%)`,
          created_by: request.userId,
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
        confidence: request.aiAnalysis.confidence,
        reasons: request.aiAnalysis.is_lead ? ['Lead source matched'] : ['Not a lead'],
        source: leadData.lead_source,
        extracted_fields: leadData ? Object.keys(leadData).filter(key => 
          (leadData as any)[key] && 
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