ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '其他',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD CONSTRAINT expenses_category_length CHECK (char_length(category) BETWEEN 1 AND 24),
  ADD CONSTRAINT expenses_tags_limit CHECK (cardinality(tags) <= 10),
  ADD CONSTRAINT expenses_tags_text_length CHECK (char_length(array_to_string(tags, ',')) <= 249);
