const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  try {
    console.log('Running email processing migration...')
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250709121154_create_processed_emails_table.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('Migration SQL:')
    console.log(migrationSQL)
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('Migration failed:', error)
      process.exit(1)
    }
    
    console.log('✅ Email processing migration completed successfully!')
    console.log('')
    console.log('The processed_emails table has been created to track:')
    console.log('- Which emails have been processed')
    console.log('- Which emails resulted in leads')
    console.log('- Processing timestamps and user information')
    console.log('')
    console.log('This will prevent duplicate email processing and provide analytics.')
    
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

runMigration() 