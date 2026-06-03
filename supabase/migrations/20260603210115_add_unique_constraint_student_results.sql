/*
  # Add unique constraint to student_results

  Adds a UNIQUE constraint on (grading_id, student_id) so that upsert operations
  from the OMR individual-save flow can target the correct conflict column pair.
  This prevents duplicate entries per student per grading session.
*/

ALTER TABLE student_results
  ADD CONSTRAINT student_results_grading_student_unique
  UNIQUE (grading_id, student_id);
