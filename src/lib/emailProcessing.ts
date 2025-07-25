import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

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
  }
  error?: string
  details?: string
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

    // Import the lead detection service
    const { LeadDetectionService } = await import('@/lib/leadDetection')
    
    // Extract lead data directly (no AI analysis needed - admin-controlled lead sources handle filtering)
    const leadResult = await LeadDetectionService.extractLeadData({
      from,
      subject,
      body: emailBody,
      to,
      date
    }, supabase)

    console.log('Lead extraction result:', {
      success: leadResult.success,
      has_data: !!leadResult.lead_data,
      error: leadResult.error
    })

    if (!leadResult.success || !leadResult.lead_data) {
      return {
        success: false,
        message: leadResult.error || 'Failed to extract lead data from email',
        details: 'The email content could not be parsed into a valid lead'
      }
    }

    // Validate extracted lead data
    if (!leadResult.lead_data.first_name || !leadResult.lead_data.last_name) {
      return {
        success: false,
        message: 'Could not extract valid name from email',
        details: 'First name and last name are required'
      }
    }

    if (!leadResult.lead_data.email || leadResult.lead_data.email.length === 0) {
      return {
        success: false,
        message: 'Could not extract valid email address from email',
        details: 'At least one email address is required'
      }
    }

    // Check for existing person with the same email to prevent duplicates
    // leadResult.lead_data.email is an array, so we need to check each email
    let existingPerson = null
    let existingError = null
    
    for (const email of leadResult.lead_data.email) {
      // Use a raw SQL query to check if the email exists in the array
      const { data: person, error: error } = await supabase
        .from('people')
        .select('id, first_name, last_name, email, lead_status')
        .filter('email', 'cs', `{${email}}`)
        .single()

      if (person) {
        existingPerson = person
        break
      }
      
      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected when no duplicate exists
        existingError = error
        break
      }
    }

    if (existingPerson) {
      console.log('Person already exists with email:', existingPerson.email)
      return {
        success: false,
        message: 'Lead already exists in system',
        details: `A person with email ${existingPerson.email} already exists`,
        person: existingPerson
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

    // Create comprehensive notes with all extracted information
    const notes = [
      `AI-detected lead from ${leadResult.lead_data.lead_source} (Confidence: ${(leadResult.lead_data.confidence_score * 100).toFixed(1)}%)`,
      leadResult.lead_data.message && `Message: ${leadResult.lead_data.message}`,
      leadResult.lead_data.price_range && `Price Range: ${leadResult.lead_data.price_range}`,
      leadResult.lead_data.location_preferences && `Location Preferences: ${leadResult.lead_data.location_preferences}`,
      leadResult.lead_data.property_type && `Property Type: ${leadResult.lead_data.property_type}`,
      leadResult.lead_data.timeline && `Timeline: ${leadResult.lead_data.timeline}`,
      leadResult.lead_data.property_address && `Property Address: ${leadResult.lead_data.property_address}`,
      leadResult.lead_data.property_details && `Property Details: ${leadResult.lead_data.property_details}`
    ].filter(Boolean).join('\n')

    // Create the person record
    const personData = {
      first_name: leadResult.lead_data.first_name,
      last_name: leadResult.lead_data.last_name,
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
      lead_source: personData.lead_source
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
        details: personError?.message || 'Database error occurred'
      }
    }

    // Create an activity log entry
    const { error: activityError } = await supabase
      .from('activities')
      .insert({
        person_id: newPerson.id,
        type: 'created',
        description: `AI-detected lead from ${leadResult.lead_data.lead_source} and placed in staging`,
        created_by: adminUser.id,
      })

    if (activityError) {
      console.error('Error creating activity:', activityError)
      // Don't fail the entire operation if activity logging fails
    }

    return {
      success: true,
      message: 'Lead processed successfully',
      person: newPerson,
      analysis: {
        confidence: leadResult.analysis_result?.confidence_score || 1.0,
        reasons: leadResult.analysis_result?.reasons || ['Lead source matched'],
        source: leadResult.lead_data.lead_source
      }
    }

  } catch (error) {
    console.error('Error processing email as lead:', error)
    return {
      success: false,
      message: 'Internal server error',
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
} 