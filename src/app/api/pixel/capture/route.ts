import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Get API key from header
    const apiKey = request.headers.get('x-api-key')
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing API key' },
        { status: 401 }
      )
    }

    // Validate API key from database
    const { data: apiKeyData, error: keyError } = await supabase
      .from('pixel_api_keys')
      .select('id, name, website, is_active')
      .eq('key', apiKey)
      .single()
    
    if (keyError || !apiKeyData || !apiKeyData.is_active) {
      return NextResponse.json(
        { error: 'Invalid or inactive API key' },
        { status: 401 }
      )
    }

    const apiKeyInfo = apiKeyData
    const body = await request.json()
    const { lead_data, source } = body

    // Extract and normalize the lead data
    const firstName = lead_data.name?.split(' ')[0] || ''
    const lastName = lead_data.name?.split(' ').slice(1).join(' ') || ''
    const email = lead_data.email ? [lead_data.email.toLowerCase()] : []
    const phone = lead_data.phone ? [lead_data.phone.replace(/\D/g, '')] : []
    
    // Build property details from form fields
    const propertyDetails = []
    if (lead_data.bedrooms) propertyDetails.push(`${lead_data.bedrooms} bedrooms`)
    if (lead_data.bathrooms) propertyDetails.push(`${lead_data.bathrooms} bathrooms`)
    if (lead_data.square_feet) propertyDetails.push(`${lead_data.square_feet} sq ft`)
    if (lead_data.acreage) propertyDetails.push(`${lead_data.acreage} acres`)
    
    // Build full address if available
    const addressParts = []
    if (lead_data.address) addressParts.push(lead_data.address)
    if (lead_data.city) addressParts.push(lead_data.city)
    if (lead_data.state) addressParts.push(lead_data.state)
    if (lead_data.zipcode) addressParts.push(lead_data.zipcode)
    const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : null
    
    // Combine notes from various fields
    const noteParts = []
    if (lead_data.message) noteParts.push(lead_data.message)
    if (lead_data.additional_criteria) noteParts.push(`Additional Criteria: ${lead_data.additional_criteria}`)
    if (lead_data.areas_of_interest) noteParts.push(`Areas of Interest: ${lead_data.areas_of_interest}`)
    if (propertyDetails.length > 0) noteParts.push(`Property Details: ${propertyDetails.join(', ')}`)
    if (lead_data.price) noteParts.push(`Price Range: ${lead_data.price}`)
    const combinedNotes = noteParts.join('\n\n')
    
    // Check if lead already exists by email
    if (email.length > 0) {
      const { data: existingLead } = await supabase
        .from('people')
        .select('id, first_name, last_name')
        .contains('email', email)
        .single()
      
      if (existingLead) {
        // Update existing lead with new information
        const { data: updatedLead } = await supabase
          .from('people')
          .update({
            notes: `${combinedNotes}\n\n[Resubmitted from ${lead_data.source_url || apiKeyInfo?.website} at ${new Date().toISOString()}]`,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLead.id)
          .select()
          .single()
        
        // Create activity log
        await supabase.from('activities').insert({
          person_id: existingLead.id,
          type: 'note_added',
          description: `Lead resubmitted form from ${lead_data.source_url || apiKeyInfo?.website}`,
          created_by: 'pixel_tracking',
          created_at: new Date().toISOString()
        })
        
        return NextResponse.json({
          status: 'success',
          message: 'Existing lead updated',
          lead_id: existingLead.id,
          is_duplicate: true
        })
      }
    }

    // Create new lead
    const newLeadData = {
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone,
      company: lead_data.company || null,
      notes: combinedNotes || null,
      address: fullAddress,
      city: lead_data.city || lead_data.areas_of_interest || null,
      state: lead_data.state || null,
      zip_code: lead_data.zipcode || null,
      lead_source: `pixel_${apiKeyInfo?.name || source || 'unknown'}`,
      client_type: 'lead',
      lead_status: 'unassigned',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Custom pixel tracking fields
      pixel_source_url: lead_data.source_url || null,
      pixel_referrer: lead_data.referrer || null,
      pixel_api_key: apiKey,
      lists: []
    }

    // Insert the lead
    const { data: createdLead, error: createError } = await supabase
      .from('people')
      .insert(newLeadData)
      .select()
      .single()

    if (createError) {
      console.error('Error creating lead:', createError)
      return NextResponse.json(
        { error: 'Failed to create lead' },
        { status: 500 }
      )
    }

    // Lead will be assigned through lead staging system
    // Create activity log for lead creation
    await supabase.from('activities').insert({
      person_id: createdLead.id,
      type: 'created',
      description: `Lead captured via pixel tracking from ${lead_data.source_url || apiKeyInfo?.website}`,
      created_by: 'pixel_tracking',
      created_at: new Date().toISOString()
    })

    // Store pixel capture statistics
    await supabase.from('pixel_captures').insert({
      lead_id: createdLead.id,
      api_key_id: apiKeyInfo.id,
      source_url: lead_data.source_url,
      referrer: lead_data.referrer,
      user_agent: lead_data.user_agent,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      captured_at: new Date().toISOString(),
      raw_data: lead_data.raw_fields || {}
    })

    return NextResponse.json({
      status: 'success',
      message: 'Lead captured successfully',
      lead_id: createdLead.id,
      assigned: createdLead.lead_status === 'assigned'
    })

  } catch (error) {
    console.error('Error in pixel capture:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    },
  })
}