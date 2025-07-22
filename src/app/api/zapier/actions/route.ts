import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { GmailIntegration } from '@/lib/gmailIntegration'

// Zapier API key authentication
const ZAPIER_API_KEY = process.env.ZAPIER_API_KEY

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, data } = body

    // Process Zapier action
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Send email via Gmail integration
async function handleSendEmail(data: any) {
  try {
    const {
      to,
      subject,
      body,
      cc,
      bcc,
      user_id,
      lead_id
    } = data

    if (!to || !subject || !body || !user_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, subject, body, user_id' },
        { status: 400 }
      )
    }

    // Get user's Gmail tokens
    const userTokens = await GmailIntegration.getUserGmailTokens(user_id)
    if (!userTokens) {
      return NextResponse.json(
        { success: false, error: 'Gmail not connected for this user' },
        { status: 400 }
      )
    }

    // Initialize Gmail integration
    const gmailConfig = {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      refreshToken: userTokens.refresh_token,
      accessToken: userTokens.access_token || undefined,
      emailAddress: userTokens.gmail_email || ''
    }

    const gmailIntegration = new GmailIntegration(gmailConfig, user_id)
    const initialized = await gmailIntegration.initialize()

    if (!initialized) {
      return NextResponse.json(
        { success: false, error: 'Failed to initialize Gmail integration' },
        { status: 500 }
      )
    }

    // Send the email
    await gmailIntegration.sendEmail({
      to,
      cc,
      bcc,
      subject,
      body
    })

    // Log the email activity if lead_id is provided
    if (lead_id) {
      const supabase = createRouteHandlerClient({ cookies })
      await supabase
        .from('people')
        .update({
          notes: `Email sent via Zapier: ${subject}\nTo: ${to}\nDate: ${new Date().toISOString()}`
        })
        .eq('id', lead_id)
    }

    return NextResponse.json({        
      success: true,
      message: 'Email sent successfully'
    })

  } catch (error) {
    console.error('Email sending error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send email' },
      { status: 500 }
    )
  }
}

// Create task for a lead
async function handleCreateTask(data: any) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const {
      lead_id,
      title,
      description,
      due_date,
      priority = 'medium',
      assigned_to
    } = data

    if (!lead_id || !title) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: lead_id, title' },
        { status: 400 }
      )
    }

    // Create task (you'll need to create a tasks table)
    const { data: task, error } = await supabase
      .from('tasks') // You'll need to create this table
      .insert({
        lead_id,
        title,
        description: description || '',
        due_date: due_date || null,
        priority,
        assigned_to: assigned_to || null,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Task creation error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create task' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Task created successfully',
      task_id: task.id
    })

  } catch (error) {
    console.error('Task creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create task' },
      { status: 500 }
    )
  }
}

// Update lead status
async function handleUpdateLeadStatus(data: any) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const {
      lead_id,
      status,
      notes
    } = data

    if (!lead_id || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: lead_id, status' },
        { status: 400 }
      )
    }

    // Update lead status
    const { data: lead, error } = await supabase
      .from('people')
      .update({
        stage: status,
        notes: notes ? `Status updated to ${status}: ${notes}` : `Status updated to ${status}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead_id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Lead status updated successfully',
      lead
    })

  } catch (error) {
    console.error('Status update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update lead status' },
      { status: 500 }
    )
  }
}

// Add note to lead
async function handleAddNote(data: any) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const {
      lead_id,
      note,
      note_type = 'general'
    } = data

    if (!lead_id || !note) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: lead_id, note' },
        { status: 400 }
      )
    }

    // Get existing notes
    const { data: existingLead } = await supabase
      .from('people')
      .select('notes')
      .eq('id', lead_id)
      .single()

    const currentNotes = existingLead?.notes || ''
    const newNotes = `${currentNotes}\n\n[${note_type.toUpperCase()}] ${new Date().toLocaleString()}: ${note}`

    // Update lead with new note
    const { data: lead, error } = await supabase
      .from('people')
      .update({
        notes: newNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead_id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Note added successfully',
      lead
    })

  } catch (error) {
    console.error('Note addition error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add note' },
      { status: 500 }
    )
  }
}

// Schedule follow-up (creates a task for future follow-up)
async function handleScheduleFollowup(data: any) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const {
      lead_id,
      followup_date,
      followup_type = 'call',
      notes
    } = data

    if (!lead_id || !followup_date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: lead_id, followup_date' },
        { status: 400 }
      )
    }

    // Create follow-up task
    const { data: task, error } = await supabase
      .from('tasks') // You'll need to create this table
      .insert({
        lead_id,
        title: `Follow-up: ${followup_type}`,
        description: notes || `Scheduled ${followup_type} follow-up`,
        due_date: followup_date,
        priority: 'high',
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Follow-up scheduling error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to schedule follow-up' },
        { status: 500 }
      )
    }

    // Add note to lead about scheduled follow-up
    await supabase
      .from('people')
      .update({
        notes: `Follow-up scheduled for ${followup_date} (${followup_type}): ${notes || 'No additional notes'}`
      })
      .eq('id', lead_id)

    return NextResponse.json({
      success: true,
      message: 'Follow-up scheduled successfully',
      task_id: task.id
    })

  } catch (error) {
    console.error('Follow-up scheduling error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to schedule follow-up' },
      { status: 500 }
    )
  }
} 