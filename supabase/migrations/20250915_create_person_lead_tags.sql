-- Create junction table for many-to-many relationship between people and lead_tags
CREATE TABLE IF NOT EXISTS person_lead_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  lead_tag_id UUID NOT NULL REFERENCES lead_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Ensure unique combination of person and tag
  UNIQUE(person_id, lead_tag_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS person_lead_tags_person_id_idx ON person_lead_tags(person_id);
CREATE INDEX IF NOT EXISTS person_lead_tags_tag_id_idx ON person_lead_tags(lead_tag_id);
CREATE INDEX IF NOT EXISTS person_lead_tags_created_by_idx ON person_lead_tags(created_by);

-- Enable RLS (Row Level Security)
ALTER TABLE person_lead_tags ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all person-tag relationships
CREATE POLICY "Users can view all person lead tags" ON person_lead_tags
  FOR SELECT USING (true);

-- Policy: Agents and admins can manage person-tag relationships
CREATE POLICY "Agents and admins can manage person lead tags" ON person_lead_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('agent', 'admin')
    )
  );

-- Add comments for documentation
COMMENT ON TABLE person_lead_tags IS 'Junction table for many-to-many relationship between people and lead_tags';
COMMENT ON COLUMN person_lead_tags.person_id IS 'Reference to the person/lead';
COMMENT ON COLUMN person_lead_tags.lead_tag_id IS 'Reference to the lead tag';
COMMENT ON COLUMN person_lead_tags.created_by IS 'User who assigned this tag';

-- Migrate existing single tag data to the new junction table
-- This will preserve existing tag assignments
INSERT INTO person_lead_tags (person_id, lead_tag_id, created_by)
SELECT
  p.id as person_id,
  p.lead_tag_id,
  p.assigned_by as created_by
FROM people p
WHERE p.lead_tag_id IS NOT NULL
ON CONFLICT (person_id, lead_tag_id) DO NOTHING;

-- Create a view to easily get all tags for a person as an array
CREATE OR REPLACE VIEW person_tags_view AS
SELECT
  p.id as person_id,
  COALESCE(
    array_agg(
      jsonb_build_object(
        'id', lt.id,
        'name', lt.name,
        'color', lt.color,
        'description', lt.description
      ) ORDER BY lt.name
    ) FILTER (WHERE lt.id IS NOT NULL),
    ARRAY[]::jsonb[]
  ) as tags
FROM people p
LEFT JOIN person_lead_tags plt ON p.id = plt.person_id
LEFT JOIN lead_tags lt ON plt.lead_tag_id = lt.id AND lt.is_active = true
GROUP BY p.id;

-- Function to add a tag to a person
CREATE OR REPLACE FUNCTION add_person_tag(
  p_person_id UUID,
  p_tag_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO person_lead_tags (person_id, lead_tag_id, created_by)
  VALUES (p_person_id, p_tag_id, p_user_id)
  ON CONFLICT (person_id, lead_tag_id) DO NOTHING;

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Function to remove a tag from a person
CREATE OR REPLACE FUNCTION remove_person_tag(
  p_person_id UUID,
  p_tag_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM person_lead_tags
  WHERE person_id = p_person_id AND lead_tag_id = p_tag_id;

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Function to set all tags for a person (replace existing)
CREATE OR REPLACE FUNCTION set_person_tags(
  p_person_id UUID,
  p_tag_ids UUID[],
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete existing tags
  DELETE FROM person_lead_tags WHERE person_id = p_person_id;

  -- Insert new tags
  IF array_length(p_tag_ids, 1) > 0 THEN
    INSERT INTO person_lead_tags (person_id, lead_tag_id, created_by)
    SELECT p_person_id, unnest(p_tag_ids), p_user_id
    ON CONFLICT (person_id, lead_tag_id) DO NOTHING;
  END IF;

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Note: The old lead_tag_id column in the people table can be kept for backward compatibility
-- or removed in a future migration once all code is updated