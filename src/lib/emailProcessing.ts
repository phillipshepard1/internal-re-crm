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

/**
 * Utility function to identify duplicate people records by email
 * This can be used for database cleanup
 */
export async function findDuplicatePeopleByEmail(): Promise<{
  duplicates: Array<{
    email: string
    people: Array<{
      id: string
      first_name: string
      last_name: string
      email: string[]
      lead_status: string
      created_at: string
    }>
  }>
  totalDuplicates: number
}> {
  try {
    // Get all people with their email arrays
    const { data: allPeople, error } = await supabase
      .from('people')
      .select('id, first_name, last_name, email, lead_status, created_at')
      .order('created_at', { ascending: false })

    if (error || !allPeople) {
      throw new Error('Failed to fetch people data')
    }

    // Create a map to group people by email
    const emailMap = new Map<string, Array<{
      id: string
      first_name: string
      last_name: string
      email: string[]
      lead_status: string
      created_at: string
    }>>()

    // Process each person and their email arrays
    for (const person of allPeople) {
      if (person.email && Array.isArray(person.email)) {
        for (const email of person.email) {
          if (email && typeof email === 'string') {
            const normalizedEmail = email.toLowerCase().trim()
            if (!emailMap.has(normalizedEmail)) {
              emailMap.set(normalizedEmail, [])
            }
            emailMap.get(normalizedEmail)!.push({
              id: person.id,
              first_name: person.first_name,
              last_name: person.last_name,
              email: person.email,
              lead_status: person.lead_status || 'staging',
              created_at: person.created_at
            })
          }
        }
      }
    }

    // Find duplicates (emails with more than one person)
    const duplicates: Array<{
      email: string
      people: Array<{
        id: string
        first_name: string
        last_name: string
        email: string[]
        lead_status: string
        created_at: string
      }>
    }> = []

    for (const [email, people] of emailMap.entries()) {
      if (people.length > 1) {
        duplicates.push({
          email,
          people: people.sort((a, b) => {
            // Sort by lead status priority, then by creation date
            const statusPriority = {
              'staging': 1,
              'assigned': 2,
              'contacted': 3,
              'qualified': 4,
              'converted': 5,
              'lost': 6
            }
            
            const aPriority = statusPriority[a.lead_status as keyof typeof statusPriority] || 7
            const bPriority = statusPriority[b.lead_status as keyof typeof statusPriority] || 7
            
            if (aPriority !== bPriority) {
              return aPriority - bPriority
            }
            
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          })
        })
      }
    }

    return {
      duplicates,
      totalDuplicates: duplicates.length
    }
  } catch (error) {
    console.error('Error finding duplicate people:', error)
    throw error
  }
}

/**
 * Utility function to merge duplicate people records
 * This should be used carefully and only after reviewing the duplicates
 */
export async function mergeDuplicatePeople(
  primaryPersonId: string,
  duplicatePersonIds: string[]
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    // Get the primary person
    const { data: primaryPerson, error: primaryError } = await supabase
      .from('people')
      .select('*')
      .eq('id', primaryPersonId)
      .single()

    if (primaryError || !primaryPerson) {
      return {
        success: false,
        message: 'Primary person not found',
        error: primaryError?.message
      }
    }

    // Get all duplicate people
    const { data: duplicatePeople, error: duplicateError } = await supabase
      .from('people')
      .select('*')
      .in('id', duplicatePersonIds)

    if (duplicateError || !duplicatePeople) {
      return {
        success: false,
        message: 'Failed to fetch duplicate people',
        error: duplicateError?.message
      }
    }

    // Merge data from duplicates into primary person
    let mergedEmails = [...(primaryPerson.email || [])]
    let mergedPhones = [...(primaryPerson.phone || [])]
    let mergedNotes = primaryPerson.notes || ''

    for (const duplicate of duplicatePeople) {
      // Merge emails
      if (duplicate.email && Array.isArray(duplicate.email)) {
        for (const email of duplicate.email) {
          if (email && !mergedEmails.includes(email)) {
            mergedEmails.push(email)
          }
        }
      }

      // Merge phones
      if (duplicate.phone && Array.isArray(duplicate.phone)) {
        for (const phone of duplicate.phone) {
          if (phone && !mergedPhones.includes(phone)) {
            mergedPhones.push(phone)
          }
        }
      }

      // Merge notes
      if (duplicate.notes) {
        mergedNotes = mergedNotes 
          ? `${mergedNotes}\n\n--- MERGED FROM DUPLICATE ---\n${duplicate.notes}`
          : duplicate.notes
      }
    }

    // Update primary person with merged data
    const { error: updateError } = await supabase
      .from('people')
      .update({
        email: mergedEmails,
        phone: mergedPhones,
        notes: mergedNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', primaryPersonId)

    if (updateError) {
      return {
        success: false,
        message: 'Failed to update primary person',
        error: updateError.message
      }
    }

    // Delete duplicate people
    const { error: deleteError } = await supabase
      .from('people')
      .delete()
      .in('id', duplicatePersonIds)

    if (deleteError) {
      return {
        success: false,
        message: 'Failed to delete duplicate people',
        error: deleteError.message
      }
    }

    return {
      success: true,
      message: `Successfully merged ${duplicatePeople.length} duplicate records into primary person`
    }
  } catch (error) {
    console.error('Error merging duplicate people:', error)
    return {
      success: false,
      message: 'Internal error during merge',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
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

    // N8N LEAD PROCESSING: Skip duplicate detection for N8N leads
    // Each new email from N8N should create a new lead in staging
    console.log('N8N lead processing: Skipping duplicate detection to ensure new lead creation')
    
    let existingPerson = null
    let existingError: any = null
    
    // For N8N leads, we skip duplicate detection to ensure each email creates a new lead
    // This allows admin to review and manage each lead separately in staging
    
    if (existingError) {
      console.error('Error checking for existing person:', existingError)
      return {
        success: false,
        message: 'Error checking for existing lead',
        details: existingError.message
      }
    }

    // Get system user for initial assignment (leads go to staging first)
    // The system user is passed from the N8N API, so we use it directly
    const systemUserId = request.userId

    if (!systemUserId) {
      console.error('No system user ID provided for lead assignment')
      return {
        success: false,
        message: 'No system user found for lead assignment',
        details: 'System user ID is required for N8N lead processing'
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
      assigned_to: systemUserId, // Assign to system user initially (will be reassigned from staging)
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
      
      // N8N LEAD PROCESSING: Skip duplicate error handling for N8N leads
      // Each new email should create a new lead, even if email already exists
      console.log('N8N lead processing: Skipping duplicate error handling to ensure new lead creation')
      
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