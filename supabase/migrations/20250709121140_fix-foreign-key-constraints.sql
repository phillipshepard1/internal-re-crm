-- Fix foreign key constraints to allow CASCADE delete
-- This will automatically delete related records when a person is deleted

-- Activities table - person_id foreign key
ALTER TABLE activities 
DROP CONSTRAINT IF EXISTS activities_person_id_fkey;

ALTER TABLE activities 
ADD CONSTRAINT activities_person_id_fkey 
FOREIGN KEY (person_id) 
REFERENCES people(id) 
ON DELETE CASCADE;

-- Notes table - person_id foreign key
ALTER TABLE notes 
DROP CONSTRAINT IF EXISTS notes_person_id_fkey;

ALTER TABLE notes 
ADD CONSTRAINT notes_person_id_fkey 
FOREIGN KEY (person_id) 
REFERENCES people(id) 
ON DELETE CASCADE;

-- Tasks table - person_id foreign key
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS tasks_person_id_fkey;

ALTER TABLE tasks 
ADD CONSTRAINT tasks_person_id_fkey 
FOREIGN KEY (person_id) 
REFERENCES people(id) 
ON DELETE CASCADE;

-- Follow_ups table - person_id foreign key
ALTER TABLE follow_ups 
DROP CONSTRAINT IF EXISTS follow_ups_person_id_fkey;

ALTER TABLE follow_ups 
ADD CONSTRAINT follow_ups_person_id_fkey 
FOREIGN KEY (person_id) 
REFERENCES people(id) 
ON DELETE CASCADE;

-- Files table - person_id foreign key
ALTER TABLE files 
DROP CONSTRAINT IF EXISTS files_person_id_fkey;

ALTER TABLE files 
ADD CONSTRAINT files_person_id_fkey 
FOREIGN KEY (person_id) 
REFERENCES people(id) 
ON DELETE CASCADE;

-- Notes table - created_by foreign key (if it exists)
ALTER TABLE notes 
DROP CONSTRAINT IF EXISTS notes_created_by_fkey;

ALTER TABLE notes 
ADD CONSTRAINT notes_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Tasks table - assigned_to foreign key
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;

ALTER TABLE tasks 
ADD CONSTRAINT tasks_assigned_to_fkey 
FOREIGN KEY (assigned_to) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Activities table - created_by foreign key
ALTER TABLE activities 
DROP CONSTRAINT IF EXISTS activities_created_by_fkey;

ALTER TABLE activities 
ADD CONSTRAINT activities_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Files table - uploaded_by foreign key
ALTER TABLE files 
DROP CONSTRAINT IF EXISTS files_uploaded_by_fkey;

ALTER TABLE files 
ADD CONSTRAINT files_uploaded_by_fkey 
FOREIGN KEY (uploaded_by) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- People table - assigned_to foreign key
ALTER TABLE people 
DROP CONSTRAINT IF EXISTS people_assigned_to_fkey;

ALTER TABLE people 
ADD CONSTRAINT people_assigned_to_fkey 
FOREIGN KEY (assigned_to) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Follow_ups table - assigned_to foreign key (if it exists)
ALTER TABLE follow_ups 
DROP CONSTRAINT IF EXISTS follow_ups_assigned_to_fkey;

ALTER TABLE follow_ups 
ADD CONSTRAINT follow_ups_assigned_to_fkey 
FOREIGN KEY (assigned_to) 
REFERENCES auth.users(id) 
ON DELETE SET NULL; 