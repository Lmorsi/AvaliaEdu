-- Add assessment_id to assessment_gradings to uniquely identify which assessment template was used
ALTER TABLE assessment_gradings
  ADD COLUMN IF NOT EXISTS assessment_id uuid REFERENCES assessments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_gradings_assessment_id
  ON assessment_gradings(assessment_id);
