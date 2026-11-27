-- Lets the ingest skip titles whose embedding input did not change.
ALTER TABLE title_embedding ADD COLUMN content_hash TEXT;
