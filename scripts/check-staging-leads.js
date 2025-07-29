const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkStagingLeads() {
  try {
    console.log('🔍 Checking staging leads...\n')
    
    // Get all staging leads
    const { data: stagingLeads, error } = await supabase
      .from('people')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        client_type,
        lead_status,
        lead_source,
        assigned_to,
        created_at,
        updated_at,
        notes
      `)
      .eq('client_type', 'lead')
      .eq('lead_status', 'staging')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching staging leads:', error)
      return
    }

    console.log(`📊 Found ${stagingLeads?.length || 0} leads in staging:`)
    
    if (stagingLeads && stagingLeads.length > 0) {
      stagingLeads.forEach((lead, index) => {
        console.log(`\n${index + 1}. ${lead.first_name} ${lead.last_name}`)
        console.log(`   ID: ${lead.id}`)
        console.log(`   Email: ${lead.email?.join(', ')}`)
        console.log(`   Phone: ${lead.phone?.join(', ')}`)
        console.log(`   Lead Source: ${lead.lead_source}`)
        console.log(`   Assigned To: ${lead.assigned_to}`)
        console.log(`   Created: ${new Date(lead.created_at).toLocaleString()}`)
        console.log(`   Updated: ${new Date(lead.updated_at).toLocaleString()}`)
        
        // Check if this is our specific lead
        if (lead.id === 'a7f10bb0-935d-46eb-bd18-96df85ad4dc5') {
          console.log(`   ⭐ THIS IS OUR N8N LEAD!`)
        }
      })
    } else {
      console.log('❌ No staging leads found!')
    }

    // Also check all leads regardless of status
    console.log('\n🔍 Checking all leads (any status)...')
    const { data: allLeads, error: allLeadsError } = await supabase
      .from('people')
      .select(`
        id,
        first_name,
        last_name,
        email,
        client_type,
        lead_status,
        lead_source,
        created_at
      `)
      .eq('client_type', 'lead')
      .order('created_at', { ascending: false })

    if (!allLeadsError && allLeads) {
      console.log(`📊 Found ${allLeads.length} total leads:`)
      
      // Look for our specific lead
      const ourLead = allLeads.find(lead => lead.id === 'a7f10bb0-935d-46eb-bd18-96df85ad4dc5')
      if (ourLead) {
        console.log(`\n🎯 Found our N8N lead:`)
        console.log(`   Name: ${ourLead.first_name} ${ourLead.last_name}`)
        console.log(`   Status: ${ourLead.lead_status}`)
        console.log(`   Source: ${ourLead.lead_source}`)
        console.log(`   Created: ${new Date(ourLead.created_at).toLocaleString()}`)
        
        if (ourLead.lead_status !== 'staging') {
          console.log(`   ⚠️  Lead is NOT in staging! Current status: ${ourLead.lead_status}`)
        }
      } else {
        console.log(`\n❌ Our N8N lead (a7f10bb0-935d-46eb-bd18-96df85ad4dc5) not found in leads!`)
      }
    }

    // Check if there are any people with the email shekhar.tws@gmail.com
    console.log('\n🔍 Checking for people with email shekhar.tws@gmail.com...')
    const { data: emailMatches, error: emailError } = await supabase
      .from('people')
      .select(`
        id,
        first_name,
        last_name,
        email,
        client_type,
        lead_status,
        lead_source,
        created_at
      `)
      .contains('email', ['shekhar.tws@gmail.com'])

    if (!emailError && emailMatches) {
      console.log(`📧 Found ${emailMatches.length} people with that email:`)
      emailMatches.forEach((person, index) => {
        console.log(`\n${index + 1}. ${person.first_name} ${person.last_name}`)
        console.log(`   ID: ${person.id}`)
        console.log(`   Client Type: ${person.client_type}`)
        console.log(`   Lead Status: ${person.lead_status}`)
        console.log(`   Lead Source: ${person.lead_source}`)
        console.log(`   Created: ${new Date(person.created_at).toLocaleString()}`)
      })
    }

  } catch (error) {
    console.error('❌ Error checking staging leads:', error)
  }
}

// Run the check
checkStagingLeads()