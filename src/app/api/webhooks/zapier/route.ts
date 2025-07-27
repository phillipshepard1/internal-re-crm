import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

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

// Zapier webhook authentication
const ZAPIER_WEBHOOK_SECRET = process.env.ZAPIER_WEBHOOK_SECRET

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { event, zap_id, data } = body

    // Process Zapier webhook
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Handle lead creation from Zapier
async function handleLeadCreated(data: any) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Extract lead data from Zapier
    const {
      name,
      email,
      phone,
      source = 'Zapier',
      subject,
      message,
      additional_data = {}
    } = data

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    // Clean message content
    const cleanedMessage = stripHtmlAndCleanText(message || subject || 'Lead created via Zapier')
    
    // Create lead in database
    const { data: lead, error } = await supabase
      .from('people')
      .insert({
        name: name || email.split('@')[0],
        email,
        phone: phone || null,
        stage: 'New Lead',
        lead_source: source,
        notes: cleanedMessage,
        additional_data: additional_data
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create lead' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Lead created successfully',
      lead_id: lead.id
    })

  } catch (error) {
    console.error('Lead creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process lead creation' },
      { status: 500 }
    )
  }
}

// Handle email received from Zapier
async function handleEmailReceived(data: any) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const {
      from,
      subject,
      body,
      date,
      attachments = [],
      source = 'Email'
    } = data

    // Check if contact already exists
    const { data: existingContact } = await supabase
      .from('people')
      .select('id, email')
      .eq('email', from)
      .single()

    if (existingContact) {
      // Clean email body content
      const cleanedBody = stripHtmlAndCleanText(body)
      
      // Update existing contact with new email
      await supabase
        .from('people')
        .update({
          notes: `Latest email: ${subject}\n\n${cleanedBody}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingContact.id)

      return NextResponse.json({
        success: true,
        message: 'Contact updated with new email',
        contact_id: existingContact.id
      })
    } else {
      // Clean email body content
      const cleanedBody = stripHtmlAndCleanText(body)
      
      // Create new contact from email
      const { data: newContact, error } = await supabase
        .from('people')
        .insert({
          name: from.split('@')[0],
          email: from,
          stage: 'New Lead',
          lead_source: source,
          notes: `Email received: ${subject}\n\n${cleanedBody}`,
          additional_data: { attachments }
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        message: 'New contact created from email',
        contact_id: newContact.id
      })
    }

  } catch (error) {
    console.error('Email processing error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process email' },
      { status: 500 }
    )
  }
}

// Handle contact updates from Zapier
async function handleContactUpdated(data: any) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { contact_id, updates } = data

    if (!contact_id) {
      return NextResponse.json(
        { success: false, error: 'Contact ID is required' },
        { status: 400 }
      )
    }

    // Update contact in database
    const { data: contact, error } = await supabase
      .from('people')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', contact_id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Contact updated successfully',
      contact
    })

  } catch (error) {
    console.error('Contact update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update contact' },
      { status: 500 }
    )
  }
}

// Handle form submissions from Zapier
async function handleFormSubmitted(data: any) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const {
      form_name,
      form_data,
      source = 'Website Form'
    } = data

    // Extract common form fields
    const {
      name,
      email,
      phone,
      message,
      subject,
      ...additionalFields
    } = form_data

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    // Clean message content
    const cleanedMessage = stripHtmlAndCleanText(message || 'No message')
    
    // Create lead from form submission
    const { data: lead, error } = await supabase
      .from('people')
      .insert({
        name: name || email.split('@')[0],
        email,
        phone: phone || null,
        stage: 'New Lead',
        lead_source: source,
        notes: `Form: ${form_name}\nSubject: ${subject || 'No subject'}\nMessage: ${cleanedMessage}\nAdditional: ${JSON.stringify(additionalFields)}`
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Form submission processed successfully',
      lead_id: lead.id
    })

  } catch (error) {
    console.error('Form processing error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process form submission' },
      { status: 500 }
    )
  }
}

// Handle social media messages from Zapier
async function handleSocialMessage(data: any) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const {
      platform,
      sender,
      message,
      timestamp,
      source = 'Social Media'
    } = data

    // Clean message content
    const cleanedMessage = stripHtmlAndCleanText(message)
    
    // Create or update contact from social message
    const { data: contact, error } = await supabase
      .from('people')
      .upsert({
        name: sender,
        email: `${sender}@${platform}.com`, // Placeholder email
        stage: 'New Lead',
        lead_source: `${source} - ${platform}`,
        notes: `Social message from ${platform}:\n${cleanedMessage}\nTimestamp: ${timestamp}`,
        additional_data: { platform, original_message: message }
      }, {
        onConflict: 'email'
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Social message processed successfully',
      contact_id: contact.id
    })

  } catch (error) {
    console.error('Social message processing error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process social message' },
      { status: 500 }
    )
  }
} 