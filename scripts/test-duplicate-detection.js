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

async function findDuplicatePeopleByEmail() {
  try {
    console.log('🔍 Finding duplicate people records...')
    
    // Get all people with their email arrays
    const { data: allPeople, error } = await supabase
      .from('people')
      .select('id, first_name, last_name, email, lead_status, created_at')
      .order('created_at', { ascending: false })

    if (error || !allPeople) {
      throw new Error('Failed to fetch people data: ' + error?.message)
    }

    console.log(`📊 Found ${allPeople.length} total people records`)

    // Create a map to group people by email
    const emailMap = new Map()

    // Process each person and their email arrays
    for (const person of allPeople) {
      if (person.email && Array.isArray(person.email)) {
        for (const email of person.email) {
          if (email && typeof email === 'string') {
            const normalizedEmail = email.toLowerCase().trim()
            if (!emailMap.has(normalizedEmail)) {
              emailMap.set(normalizedEmail, [])
            }
            emailMap.get(normalizedEmail).push({
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
    const duplicates = []

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
            
            const aPriority = statusPriority[a.lead_status] || 7
            const bPriority = statusPriority[b.lead_status] || 7
            
            if (aPriority !== bPriority) {
              return aPriority - bPriority
            }
            
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          })
        })
      }
    }

    console.log(`\n🎯 Found ${duplicates.length} email addresses with duplicate records:`)
    
    if (duplicates.length > 0) {
      duplicates.forEach((group, index) => {
        console.log(`\n${index + 1}. Email: ${group.email} (${group.people.length} duplicates)`)
        group.people.forEach((person, personIndex) => {
          const isPrimary = personIndex === 0
          console.log(`   ${isPrimary ? '⭐' : '  '} ${person.first_name} ${person.last_name} (${person.lead_status}) - ID: ${person.id}`)
          console.log(`      Created: ${new Date(person.created_at).toLocaleDateString()}`)
          console.log(`      All emails: ${person.email.join(', ')}`)
        })
      })
    } else {
      console.log('✅ No duplicate records found!')
    }

    return { duplicates, totalDuplicates: duplicates.length }

  } catch (error) {
    console.error('❌ Error finding duplicate people:', error)
    throw error
  }
}

async function testDuplicateDetection() {
  try {
    console.log('🚀 Testing duplicate detection...\n')
    
    const result = await findDuplicatePeopleByEmail()
    
    console.log(`\n📈 Summary:`)
    console.log(`   Total duplicate email addresses: ${result.totalDuplicates}`)
    console.log(`   Total duplicate records: ${result.duplicates.reduce((sum, group) => sum + group.people.length, 0)}`)
    
    if (result.totalDuplicates > 0) {
      console.log(`\n💡 Recommendation: Use the admin dashboard to merge these duplicate records.`)
      console.log(`   Navigate to Admin > Duplicate Management to review and merge duplicates.`)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
testDuplicateDetection()