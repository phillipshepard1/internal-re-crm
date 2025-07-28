import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { LeadDetectionService } from '@/lib/leadDetection'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface N8NLeadData {
  email_id: string
  from: string
  subject: string
  body: string
  date: string
  ai_analysis: {
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
      urgency?: 'high' | 'medium' | 'low'
    }
    analysis: {
      intent: 'buying' | 'selling' | 'investing' | 'general_inquiry'
      property_type: 'residential' | 'commercial' | 'land'
      budget_range?: string
      location_preferences?: string[]
    }
  }
  attachments?: Array<{
    filename: string
    mime_type: string
    size: number
    data: string // base64
  }>
  user_id?: string // Optional: if N8N knows which user's email this is
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook authentication
    const authHeader = request.headers.get('authorization')
    const expectedToken = `Bearer ${process.env.N8N_WEBHOOK_TOKEN}`
    
    if (!authHeader || authHeader !== expectedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const leadData: N8NLeadData = body

    console.log('Received N8N lead data:', {
      email_id: leadData.email_id,
      from: leadData.from,
      subject: leadData.subject,
      confidence: leadData.ai_analysis.confidence
    })

    // Validate required fields
    if (!leadData.email_id || !leadData.from || !leadData.subject) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if email already processed
    const { data: existingEmail } = await supabase
      .from('processed_emails')
      .select('id')
      .eq('email_id', leadData.email_id)
      .single()

    if (existingEmail) {
      return NextResponse.json({
        success: true,
        message: 'Email already processed',
        processed: false
      })
    }

    // Process the lead if AI analysis indicates it's a lead
    if (leadData.ai_analysis.is_lead && leadData.ai_analysis.confidence >= 0.7) {
      const { processEmailAsLead } = await import('@/lib/emailProcessing')
      
      const processingResult = await processEmailAsLead({
        emailData: {
          from: leadData.from,
          subject: leadData.subject,
          body: leadData.body,
          date: leadData.date
        },
        userId: leadData.user_id || 'system', // Use system if no specific user
        aiAnalysis: leadData.ai_analysis // Pass AI analysis for enhanced processing
      })

      if (processingResult.success && processingResult.person) {
        // Mark email as processed
        await supabase
          .from('processed_emails')
          .insert({
            email_id: leadData.email_id,
            user_id: leadData.user_id || 'system',
            person_id: processingResult.person.id,
            processed_at: new Date().toISOString(),
            gmail_email: leadData.from,
            ai_confidence: leadData.ai_analysis.confidence,
            ai_analysis: leadData.ai_analysis
          })

        // Handle attachments if any
        if (leadData.attachments && leadData.attachments.length > 0) {
          for (const attachment of leadData.attachments) {
            try {
              await supabase
                .from('files')
                .insert({
                  person_id: processingResult.person.id,
                  filename: attachment.filename,
                  file_path: `attachments/${leadData.email_id}/${attachment.filename}`,
                  file_size: attachment.size,
                  mime_type: attachment.mime_type,
                  uploaded_by: leadData.user_id || 'system'
                })
            } catch (error) {
              console.error('Error saving attachment:', error)
            }
          }
        }

        return NextResponse.json({
          success: true,
          message: 'Lead processed successfully',
          person_id: processingResult.person.id,
          confidence: leadData.ai_analysis.confidence
        })
      } else {
        // Mark as processed even if failed to avoid reprocessing
        await supabase
          .from('processed_emails')
          .insert({
            email_id: leadData.email_id,
            user_id: leadData.user_id || 'system',
            person_id: null,
            processed_at: new Date().toISOString(),
            gmail_email: leadData.from,
            ai_confidence: leadData.ai_analysis.confidence,
            ai_analysis: leadData.ai_analysis
          })

        return NextResponse.json({
          success: false,
          message: processingResult.message || 'Failed to process lead',
          confidence: leadData.ai_analysis.confidence
        })
      }
    } else {
      // Mark non-lead emails as processed
      await supabase
        .from('processed_emails')
        .insert({
          email_id: leadData.email_id,
          user_id: leadData.user_id || 'system',
          person_id: null,
          processed_at: new Date().toISOString(),
          gmail_email: leadData.from,
          ai_confidence: leadData.ai_analysis.confidence,
          ai_analysis: leadData.ai_analysis
        })

      return NextResponse.json({
        success: true,
        message: 'Email processed (not a lead)',
        is_lead: false,
        confidence: leadData.ai_analysis.confidence
      })
    }

  } catch (error) {
    console.error('Error processing N8N lead data:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'N8N Lead Processing Webhook',
    description: 'Receives processed lead data from N8N workflows',
    usage: 'POST with authorization header containing N8N_WEBHOOK_TOKEN',
    features: [
      'AI-powered lead detection via N8N',
      'Structured data extraction',
      'Attachment handling',
      'Duplicate prevention',
      'Enhanced lead analysis'
    ]
  })
} 