import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
      property_details?: string
      price_range?: string
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
    size: number
    mime_type: string
  }>
  user_id?: string
}

// Function to check if email matches configured lead sources
async function checkLeadSourceMatch(from: string, subject: string, body: string): Promise<{
  matched: boolean
  source_name?: string
  confidence: number
  reasons: string[]
}> {
  try {
    // Get all active lead sources
    const { data: leadSources, error } = await supabase
      .from('lead_sources')
      .select('*')
      .eq('is_active', true)
    
    if (error || !leadSources) {
      console.error('Error fetching lead sources:', error)
      return { matched: false, confidence: 0, reasons: ['Error fetching lead sources'] }
    }

    let maxConfidence = 0
    let matchedSource: any = null
    const reasons: string[] = []

    for (const source of leadSources) {
      let sourceConfidence = 0
      const sourceReasons: string[] = []

      // Check email patterns
      for (const pattern of source.email_patterns || []) {
        if (pattern.includes('*')) {
          // Wildcard pattern (e.g., *@zillow.com)
          const domain = pattern.split('@')[1]
          if (from.toLowerCase().includes(domain.toLowerCase())) {
            sourceConfidence += 0.8
            sourceReasons.push(`Email domain matches pattern: ${pattern}`)
          }
        } else {
          // Exact email pattern
          if (from.toLowerCase() === pattern.toLowerCase()) {
            sourceConfidence += 1.0
            sourceReasons.push(`Exact email match: ${pattern}`)
          }
        }
      }

      // Check domain patterns
      for (const pattern of source.domain_patterns || []) {
        const emailDomain = from.split('@')[1]?.toLowerCase()
        if (emailDomain && emailDomain.includes(pattern.toLowerCase())) {
          sourceConfidence += 0.6
          sourceReasons.push(`Domain matches pattern: ${pattern}`)
        }
      }

      // Check keywords in subject and body
      const combinedText = `${subject} ${body}`.toLowerCase()
      for (const keyword of source.keywords || []) {
        if (combinedText.includes(keyword.toLowerCase())) {
          sourceConfidence += 0.4
          sourceReasons.push(`Keyword found: ${keyword}`)
        }
      }

      // Update max confidence if this source has higher confidence
      if (sourceConfidence > maxConfidence) {
        maxConfidence = sourceConfidence
        matchedSource = source
        reasons.length = 0
        reasons.push(...sourceReasons)
      }
    }

    return {
      matched: maxConfidence >= 0.3, // Minimum threshold for lead source match
      source_name: matchedSource?.name,
      confidence: Math.min(maxConfidence, 1.0),
      reasons
    }

  } catch (error) {
    console.error('Error checking lead source match:', error)
    return { matched: false, confidence: 0, reasons: ['Error checking lead sources'] }
  }
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

    // Check against configured lead sources
    const leadSourceMatch = await checkLeadSourceMatch(
      leadData.from,
      leadData.subject,
      leadData.body
    )

    console.log('Lead source check result:', {
      matched: leadSourceMatch.matched,
      source: leadSourceMatch.source_name,
      confidence: leadSourceMatch.confidence,
      reasons: leadSourceMatch.reasons
    })

    // Determine if this should be processed as a lead
    const shouldProcessAsLead = (
      leadData.ai_analysis.is_lead && 
      leadData.ai_analysis.confidence >= 0.7 &&
      leadSourceMatch.matched
    )

    if (shouldProcessAsLead) {
      const { processEmailAsLead } = await import('@/lib/emailProcessing')
      
      // Enhance AI analysis with lead source information
      const enhancedAiAnalysis = {
        ...leadData.ai_analysis,
        lead_data: {
          ...leadData.ai_analysis.lead_data,
          lead_source: leadSourceMatch.source_name || 'email',
          lead_source_confidence: leadSourceMatch.confidence
        },
        lead_source_match: {
          matched: leadSourceMatch.matched,
          source_name: leadSourceMatch.source_name,
          confidence: leadSourceMatch.confidence,
          reasons: leadSourceMatch.reasons
        }
      }
      
      const processingResult = await processEmailAsLead({
        emailData: {
          from: leadData.from,
          subject: leadData.subject,
          body: leadData.body,
          date: leadData.date
        },
        userId: leadData.user_id || 'system',
        aiAnalysis: enhancedAiAnalysis
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
            ai_analysis: enhancedAiAnalysis,
            processing_source: 'n8n'
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
          confidence: leadData.ai_analysis.confidence,
          lead_source: leadSourceMatch.source_name,
          lead_source_confidence: leadSourceMatch.confidence
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
            ai_analysis: enhancedAiAnalysis,
            processing_source: 'n8n'
          })

        return NextResponse.json({
          success: false,
          message: processingResult.message || 'Failed to process lead',
          confidence: leadData.ai_analysis.confidence,
          lead_source: leadSourceMatch.source_name
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
          ai_analysis: leadData.ai_analysis,
          processing_source: 'n8n'
        })

      const reason = !leadData.ai_analysis.is_lead 
        ? 'AI did not identify as lead'
        : leadData.ai_analysis.confidence < 0.7 
        ? 'Low AI confidence'
        : !leadSourceMatch.matched 
        ? 'No lead source match'
        : 'Unknown reason'

      return NextResponse.json({
        success: true,
        message: 'Email processed (not a lead)',
        is_lead: false,
        confidence: leadData.ai_analysis.confidence,
        reason: reason,
        lead_source_match: leadSourceMatch
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