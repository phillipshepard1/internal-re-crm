// Load environment variables from .env file
require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

// Check environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nPlease ensure these variables are set in your .env.local file:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key')
  console.error('\nOr set them as environment variables before running this script.')
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createSystemUser() {
  try {
    console.log('🔍 Checking for N8N system user...')
    
    const SYSTEM_USER_EMAIL = 'n8n-system@internal-crm.com'
    
    // Check if system user already exists
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role')
      .eq('email', SYSTEM_USER_EMAIL)
      .single()
    
    if (existingUser) {
      console.log('✅ N8N system user already exists:')
      console.log(`   ID: ${existingUser.id}`)
      console.log(`   Email: ${existingUser.email}`)
      console.log(`   Name: ${existingUser.first_name} ${existingUser.last_name}`)
      console.log(`   Role: ${existingUser.role}`)
      return existingUser
    }
    
    // Create new system user
    console.log('📝 Creating new N8N system user...')
    
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: SYSTEM_USER_EMAIL,
        first_name: 'N8N',
        last_name: 'System',
        role: 'admin'
      })
      .select('id, email, first_name, last_name, role')
      .single()
    
    if (createError) {
      console.error('❌ Error creating system user:', createError)
      throw createError
    }
    
    console.log('✅ N8N system user created successfully:')
    console.log(`   ID: ${newUser.id}`)
    console.log(`   Email: ${newUser.email}`)
    console.log(`   Name: ${newUser.first_name} ${newUser.last_name}`)
    console.log(`   Role: ${newUser.role}`)
    
    return newUser
    
  } catch (error) {
    console.error('❌ Error in createSystemUser:', error)
    throw error
  }
}

async function main() {
  try {
    console.log('🚀 N8N System User Setup')
    console.log('========================')
    
    const systemUser = await createSystemUser()
    
    console.log('\n🎉 Setup complete!')
    console.log('The N8N system user is ready for lead processing.')
    console.log('\nNext steps:')
    console.log('1. Test your N8N workflow')
    console.log('2. Check Admin > Lead Staging for new leads')
    console.log('3. Verify leads are assigned to "N8N System" user')
    
  } catch (error) {
    console.error('\n💥 Setup failed:', error.message)
    process.exit(1)
  }
}

main()