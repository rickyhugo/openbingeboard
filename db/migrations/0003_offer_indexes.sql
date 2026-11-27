-- Country switches filter providers by region on every root loader.
-- The offer primary key starts with title_id, so region lookups need their own
-- index. Keep provider_id second so the correlated EXISTS in listProviders can
-- seek both columns.
CREATE INDEX IF NOT EXISTS offer_region_provider_idx
  ON offer (region, provider_id);
