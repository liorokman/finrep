-- Remember which categorization run created a category, so undoing the run can remove
-- the categories it invented (when nothing else uses them).
ALTER TABLE categories ADD COLUMN created_run_id TEXT REFERENCES categorization_runs(id) ON DELETE SET NULL;
