const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config()

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

async function runMigration() {
  try {
    console.log('Running migration: create_processed_emails_table')
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'create_processed_emails_table.sql')
    const sqlContent = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('SQL to execute:')
    console.log(sqlContent)
    console.log('\n---')
    
    // Since Supabase client doesn't support raw SQL execution,
    // we'll provide instructions for manual execution
    console.log('⚠️  IMPORTANT: Supabase client doesn\'t support raw SQL execution.')
    console.log('Please run this migration manually in your Supabase dashboard:')
    console.log('\n1. Go to your Supabase project dashboard')
    console.log('2. Navigate to SQL Editor in the left sidebar')
    console.log('3. Copy and paste the SQL above')
    console.log('4. Click "Run" to execute the migration')
    console.log('\nAlternatively, you can use the Supabase CLI:')
    console.log('supabase db push --include-all')
    
    return true
  } catch (error) {
    console.error('Error running migration:', error)
    return false
  }
}

// Run the migration
runMigration().then(success => {
  if (success) {
    console.log('\n✅ Migration instructions provided successfully')
  } else {
    console.log('\n❌ Failed to provide migration instructions')
    process.exit(1)
  }
}) 