const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testReassignment() {
  try {
    console.log('Testing lead reassignment functionality...')
    
    // Get a sample lead and user for testing
    const { data: leads, error: leadsError } = await supabase
      .from('people')
      .select('*')
      .eq('client_type', 'lead')
      .eq('lead_status', 'assigned')
      .limit(1)
    
    if (leadsError || !leads || leads.length === 0) {
      console.log('No assigned leads found for testing')
      return
    }
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(2)
    
    if (usersError || !users || users.length < 2) {
      console.log('Not enough users found for testing')
      return
    }
    
    const testLead = leads[0]
    const newUser = users[1]
    
    console.log(`Testing reassignment of lead ${testLead.id} to user ${newUser.id}`)
    
    // Test the reassignment API
    const response = await fetch('http://localhost:3000/api/leads/reassign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        leadId: testLead.id,
        newUserId: newUser.id,
        reassignedBy: users[0].id,
        copyFollowUps: true,
        copyNotes: true,
        reassignmentNotes: 'Test reassignment'
      })
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Reassignment successful:', result)
    } else {
      console.log('❌ Reassignment failed:', result)
    }
    
  } catch (error) {
    console.error('Error testing reassignment:', error)
  }
}

// Run the test
testReassignment() 