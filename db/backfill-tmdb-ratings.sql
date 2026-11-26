INSERT INTO rating (title_id, source, score, scale, votes, url, fetched_at)
SELECT id, 'tmdb', tmdb_vote, 10, tmdb_votes, NULL, updated_at
FROM title
WHERE tmdb_vote IS NOT NULL
ON CONFLICT(title_id, source) DO UPDATE SET
  score=excluded.score,
  scale=excluded.scale,
  votes=excluded.votes,
  fetched_at=excluded.fetched_at;
