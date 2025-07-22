-- Add foreign key constraint for assigned_by field
ALTER TABLE people 
ADD CONSTRAINT fk_people_assigned_by 
FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_people_assigned_by ON people(assigned_by);

-- Update the updated_at trigger to include assigned_by changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_people_updated_at ON people;

-- Recreate the trigger
CREATE TRIGGER update_people_updated_at
    BEFORE UPDATE ON people
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 