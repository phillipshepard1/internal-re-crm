-- Add status field to users table for archiving functionality
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived'));

-- Add index for better performance when filtering by status
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Add archived_at timestamp for tracking when user was archived
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Add archived_by field to track who archived the user
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES users(id);

-- Update existing users to have 'active' status
UPDATE users SET status = 'active' WHERE status IS NULL; 