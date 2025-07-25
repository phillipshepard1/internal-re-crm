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
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('Executing SQL migration...')
    
    // Execute the SQL directly
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      console.error('Migration failed:', error)
      process.exit(1)
    }
    
    console.log('Migration completed successfully!')
    
    // Verify the table was created
    const { data: tables, error: verifyError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'processed_emails')
    
    if (verifyError) {
      console.error('Error verifying table creation:', verifyError)
    } else if (tables && tables.length > 0) {
      console.log('✅ processed_emails table created successfully')
    } else {
      console.log('❌ processed_emails table was not created')
    }
    
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

runMigration() 