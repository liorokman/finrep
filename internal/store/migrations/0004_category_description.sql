-- An optional note on what belongs in a category. It is shown to the categorization model, so naming the
-- merchants that belong here (Wolt, Rami Levy, Pango…) is the most effective way to improve its picks.
ALTER TABLE categories ADD COLUMN description TEXT NOT NULL DEFAULT '';
