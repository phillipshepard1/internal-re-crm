const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkLeadStatus() {
  try {
    console.log('🔍 Checking lead status...\n')
    
    // Check the specific person that was created
    const personId = 'a7f10bb0-935d-46eb-bd18-96df85ad4dc5'
    
    console.log(`📋 Looking for person with ID: ${personId}`)
    
    const { data: person, error } = await supabase
      .from('people')
      .select('*')
      .eq('id', personId)
      .single()

    if (error) {
      console.error('❌ Error fetching person:', error)
      return
    }

    if (!person) {
      console.log('❌ Person not found!')
      return
    }

    console.log('✅ Person found!')
    console.log('\n📊 Person Details:')
    console.log(`   Name: ${person.first_name} ${person.last_name}`)
    console.log(`   Email: ${person.email?.join(', ')}`)
    console.log(`   Lead Status: ${person.lead_status}`)
    console.log(`   Lead Source: ${person.lead_source}`)
    console.log(`   Assigned To: ${person.assigned_to}`)
    console.log(`   Created: ${new Date(person.created_at).toLocaleString()}`)
    console.log(`   Client Type: ${person.client_type}`)
    
    // Check if there are any activities for this person
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .eq('person_id', personId)
      .order('created_at', { ascending: false })

    if (!activitiesError && activities && activities.length > 0) {
      console.log('\n📝 Recent Activities:')
      activities.slice(0, 3).forEach((activity, index) => {
        console.log(`   ${index + 1}. ${activity.type}: ${activity.description}`)
        console.log(`      Created: ${new Date(activity.created_at).toLocaleString()}`)
      })
    }

    // Check processed emails
    const { data: processedEmails, error: emailsError } = await supabase
      .from('processed_emails')
      .select('*')
      .eq('person_id', personId)
      .order('processed_at', { ascending: false })

    if (!emailsError && processedEmails && processedEmails.length > 0) {
      console.log('\n📧 Processed Emails:')
      processedEmails.forEach((email, index) => {
        console.log(`   ${index + 1}. ${email.gmail_email}`)
        console.log(`      Subject: ${email.ai_analysis?.lead_data?.first_name || 'N/A'}`)
        console.log(`      Processed: ${new Date(email.processed_at).toLocaleString()}`)
        console.log(`      Confidence: ${email.ai_confidence}`)
      })
    }

    // Check staging leads specifically
    console.log('\n🎯 Checking staging leads...')
    const { data: stagingLeads, error: stagingError } = await supabase
      .from('people')
      .select('id, first_name, last_name, email, lead_status, lead_source, created_at')
      .eq('lead_status', 'staging')
      .order('created_at', { ascending: false })

    if (!stagingError && stagingLeads) {
      console.log(`📈 Found ${stagingLeads.length} leads in staging:`)
      stagingLeads.forEach((lead, index) => {
        const isOurLead = lead.id === personId
        console.log(`   ${index + 1}. ${lead.first_name} ${lead.last_name} ${isOurLead ? '⭐ (OUR LEAD)' : ''}`)
        console.log(`      Email: ${lead.email?.join(', ')}`)
        console.log(`      Source: ${lead.lead_source}`)
        console.log(`      Created: ${new Date(lead.created_at).toLocaleString()}`)
      })
    }

    // Check if there's an admin user for assignment
    console.log('\n👤 Checking admin users...')
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('role', 'admin')

    if (!adminError && adminUsers) {
      console.log(`📊 Found ${adminUsers.length} admin users:`)
      adminUsers.forEach((admin, index) => {
        console.log(`   ${index + 1}. ${admin.email} (${admin.id})`)
      })
    }

  } catch (error) {
    console.error('❌ Error checking lead status:', error)
  }
}

// Run the check
checkLeadStatus()