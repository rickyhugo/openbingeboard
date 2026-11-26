PRAGMA foreign_keys = ON;

DELETE FROM title_fts;
DELETE FROM title_genre;
DELETE FROM offer;
DELETE FROM rating;
DELETE FROM title;
DELETE FROM genre;
DELETE FROM provider;

INSERT INTO provider (id, name, logo_path, display_priority) VALUES
  (8, 'Netflix', NULL, 1),
  (76, 'Viaplay', NULL, 2),
  (119, 'Amazon Prime Video', NULL, 3),
  (2, 'Apple TV', NULL, 4),
  (426, 'SF Anytime', NULL, 5),
  (3, 'Google Play Movies', NULL, 6),
  (337, 'Disney+', NULL, 7);

INSERT INTO genre (id, name) VALUES
  (28, 'Action'),
  (12, 'Adventure'),
  (80, 'Crime'),
  (18, 'Drama'),
  (36, 'History'),
  (878, 'Sci-Fi'),
  (53, 'Thriller');

INSERT INTO title (
  id, tmdb_id, kind, imdb_id, name, original_name, year, overview,
  poster_path, backdrop_path, runtime, tmdb_vote, tmdb_votes, popularity,
  updated_at
) VALUES
  (
    'tmdb:movie:550', 550, 'movie', 'tt0137523', 'Fight Club', 'Fight Club',
    1999,
    'An insomniac office worker and a soap salesman build a underground fight club that grows into something far larger.',
    '/jSziioSwPVrOy9Yow3XhWIBDjq1.jpg', NULL, 139, 8.4, 31000, 92.4,
    1764115200
  ),
  (
    'tmdb:movie:27205', 27205, 'movie', 'tt1375666', 'Inception', 'Inception',
    2010,
    'A thief who steals corporate secrets through dream-sharing technology is handed an inverse task: plant an idea.',
    '/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg', NULL, 148, 8.4, 38000, 110.2,
    1764115200
  ),
  (
    'tmdb:movie:155', 155, 'movie', 'tt0468569', 'The Dark Knight',
    'The Dark Knight', 2008,
    'Batman faces the Joker, a criminal who wants to prove that everyone breaks under enough pressure.',
    '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', NULL, 152, 8.5, 34000, 98.1,
    1764115200
  ),
  (
    'tmdb:movie:693134', 693134, 'movie', 'tt15239678', 'Dune: Part Two',
    'Dune: Part Two', 2024,
    'Paul Atreides unites with the Fremen to wage war against the House Harkonnen and the emperor who betrayed his family.',
    '/6izwz7rsy95ARzTR3poZ8H6c5pp.jpg', NULL, 167, 8.2, 12000, 210.7,
    1764115200
  ),
  (
    'tmdb:movie:872585', 872585, 'movie', 'tt15398776', 'Oppenheimer',
    'Oppenheimer', 2023,
    'The story of J. Robert Oppenheimer and the Manhattan Project, told across the making and unmaking of the atomic bomb.',
    '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', NULL, 181, 8.1, 14000, 180.3,
    1764115200
  ),
  (
    'tmdb:movie:496243', 496243, 'movie', 'tt6751668', 'Parasite',
    '기생충', 2019,
    'A poor family schemes its way into the household of a wealthy family, until the arrangement turns violent.',
    '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', NULL, 133, 8.5, 19000, 120.9,
    1764115200
  ),
  (
    'tmdb:movie:603', 603, 'movie', 'tt0133093', 'The Matrix', 'The Matrix',
    1999,
    'A programmer learns that reality is a simulation and joins a crew fighting the machines that built it.',
    '/dXNAPwY7VrqMAo51EKhhCJfaGb5.jpg', NULL, 136, 8.2, 26000, 95.6,
    1764115200
  ),
  (
    'tmdb:movie:157336', 157336, 'movie', 'tt0816692', 'Interstellar',
    'Interstellar', 2014,
    'A team of explorers travels through a wormhole to find a home for humanity before Earth becomes unlivable.',
    '/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg', NULL, 169, 8.4, 37000, 130.8,
    1764115200
  ),
  (
    'tmdb:series:1396', 1396, 'series', 'tt0903747', 'Breaking Bad',
    'Breaking Bad', 2008,
    'A chemistry teacher diagnosed with cancer starts producing methamphetamine to secure his family''s future.',
    '/anFx9aTOOYqgS3v7x3R84Kz67ly.jpg', NULL, 47, 8.9, 14000, 160.2,
    1764115200
  ),
  (
    'tmdb:series:1399', 1399, 'series', 'tt0944947', 'Game of Thrones',
    'Game of Thrones', 2011,
    'Nine noble families fight for control of Westeros while an ancient enemy returns beyond the Wall.',
    '/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg', NULL, 57, 8.4, 24000, 150.5,
    1764115200
  ),
  (
    'tmdb:series:94997', 94997, 'series', 'tt11198330',
    'House of the Dragon', 'House of the Dragon', 2022,
    'The Targaryen civil war begins, two centuries before the events of Game of Thrones.',
    '/7V0Ebks0GgpKvQ7QbLAIdX5dos4.jpg', NULL, 60, 8.1, 6500, 140.1,
    1764115200
  ),
  (
    'tmdb:series:94605', 94605, 'series', 'tt11126994', 'Arcane', 'Arcane',
    2021,
    'Two sisters end up on opposite sides of a war between the city of Piltover and the undercity of Zaun.',
    '/87C0wecB8bHb1PsrKBI4kJiEkgV.jpg', NULL, 44, 8.7, 4800, 135.4,
    1764115200
  );

INSERT INTO title_genre (title_id, genre_id) VALUES
  ('tmdb:movie:550', 18), ('tmdb:movie:550', 53),
  ('tmdb:movie:27205', 28), ('tmdb:movie:27205', 878),
  ('tmdb:movie:27205', 53),
  ('tmdb:movie:155', 28), ('tmdb:movie:155', 80),
  ('tmdb:movie:155', 18),
  ('tmdb:movie:693134', 878), ('tmdb:movie:693134', 12),
  ('tmdb:movie:872585', 18), ('tmdb:movie:872585', 36),
  ('tmdb:movie:496243', 53), ('tmdb:movie:496243', 18),
  ('tmdb:movie:603', 28), ('tmdb:movie:603', 878),
  ('tmdb:movie:157336', 878), ('tmdb:movie:157336', 18),
  ('tmdb:series:1396', 18), ('tmdb:series:1396', 80),
  ('tmdb:series:1399', 18), ('tmdb:series:1399', 12),
  ('tmdb:series:94997', 18), ('tmdb:series:94997', 12),
  ('tmdb:series:94605', 28), ('tmdb:series:94605', 12);

INSERT INTO rating (title_id, source, score, scale, votes, url, fetched_at)
VALUES
  ('tmdb:movie:550', 'imdb', 8.8, 10, 2500000, 'https://www.imdb.com/title/tt0137523/', 1764115200),
  ('tmdb:movie:550', 'rt', 79, 100, NULL, NULL, 1764115200),
  ('tmdb:movie:550', 'metacritic', 67, 100, NULL, NULL, 1764115200),
  ('tmdb:movie:27205', 'imdb', 8.8, 10, 2600000, 'https://www.imdb.com/title/tt1375666/', 1764115200),
  ('tmdb:movie:27205', 'rt', 87, 100, NULL, NULL, 1764115200),
  ('tmdb:movie:27205', 'metacritic', 74, 100, NULL, NULL, 1764115200),
  ('tmdb:movie:155', 'imdb', 9.0, 10, 2900000, 'https://www.imdb.com/title/tt0468569/', 1764115200),
  ('tmdb:movie:155', 'rt', 94, 100, NULL, NULL, 1764115200),
  ('tmdb:movie:155', 'metacritic', 84, 100, NULL, NULL, 1764115200),
  ('tmdb:movie:693134', 'imdb', 8.5, 10, 720000, 'https://www.imdb.com/title/tt15239678/', 1764115200),
  ('tmdb:movie:693134', 'rt', 92, 100, NULL, NULL, 1764115200),
  ('tmdb:movie:693134', 'metacritic', 79, 100, NULL, NULL, 1764115200),
  ('tmdb:movie:872585', 'imdb', 8.3, 10, 940000, 'https://www.imdb.com/title/tt15398776/', 1764115200),
  ('tmdb:movie:872585', 'rt', 93, 100, NULL, NULL, 1764115200),
  ('tmdb:movie:872585', 'metacritic', 90, 100, NULL, NULL, 1764115200),
  ('tmdb:movie:496243', 'imdb', 8.5, 10, 980000, 'https://www.imdb.com/title/tt6751668/', 1764115200),
  ('tmdb:movie:496243', 'rt', 99, 100, NULL, NULL, 1764115200),
  ('tmdb:movie:496243', 'metacritic', 96, 100, NULL, NULL, 1764115200),
  ('tmdb:movie:603', 'imdb', 8.7, 10, 2100000, 'https://www.imdb.com/title/tt0133093/', 1764115200),
  ('tmdb:movie:603', 'rt', 83, 100, NULL, NULL, 1764115200),
  ('tmdb:movie:603', 'metacritic', 73, 100, NULL, NULL, 1764115200),
  ('tmdb:movie:157336', 'imdb', 8.7, 10, 2300000, 'https://www.imdb.com/title/tt0816692/', 1764115200),
  ('tmdb:movie:157336', 'rt', 73, 100, NULL, NULL, 1764115200),
  ('tmdb:movie:157336', 'metacritic', 74, 100, NULL, NULL, 1764115200),
  ('tmdb:series:1396', 'imdb', 9.5, 10, 2200000, 'https://www.imdb.com/title/tt0903747/', 1764115200),
  ('tmdb:series:1396', 'rt', 96, 100, NULL, NULL, 1764115200),
  ('tmdb:series:1396', 'metacritic', 99, 100, NULL, NULL, 1764115200),
  ('tmdb:series:1399', 'imdb', 9.2, 10, 2400000, 'https://www.imdb.com/title/tt0944947/', 1764115200),
  ('tmdb:series:1399', 'rt', 89, 100, NULL, NULL, 1764115200),
  ('tmdb:series:1399', 'metacritic', 86, 100, NULL, NULL, 1764115200),
  ('tmdb:series:94997', 'imdb', 8.4, 10, 520000, 'https://www.imdb.com/title/tt11198330/', 1764115200),
  ('tmdb:series:94997', 'rt', 82, 100, NULL, NULL, 1764115200),
  ('tmdb:series:94997', 'metacritic', 73, 100, NULL, NULL, 1764115200),
  ('tmdb:series:94605', 'imdb', 9.0, 10, 380000, 'https://www.imdb.com/title/tt11126994/', 1764115200),
  ('tmdb:series:94605', 'rt', 100, 100, NULL, NULL, 1764115200),
  ('tmdb:series:94605', 'metacritic', 96, 100, NULL, NULL, 1764115200);

INSERT INTO offer (
  title_id, provider_id, region, monetization, link, updated_at
) VALUES
  ('tmdb:movie:550', 76, 'SE', 'flatrate', 'https://www.themoviedb.org/movie/550/watch?locale=SE', 1764115200),
  ('tmdb:movie:550', 2, 'SE', 'rent', 'https://www.themoviedb.org/movie/550/watch?locale=SE', 1764115200),
  ('tmdb:movie:550', 2, 'SE', 'buy', 'https://www.themoviedb.org/movie/550/watch?locale=SE', 1764115200),
  ('tmdb:movie:550', 426, 'SE', 'rent', 'https://www.themoviedb.org/movie/550/watch?locale=SE', 1764115200),
  ('tmdb:movie:550', 8, 'GB', 'flatrate', 'https://www.themoviedb.org/movie/550/watch?locale=GB', 1764115200),
  ('tmdb:movie:27205', 8, 'SE', 'flatrate', 'https://www.themoviedb.org/movie/27205/watch?locale=SE', 1764115200),
  ('tmdb:movie:27205', 76, 'SE', 'flatrate', 'https://www.themoviedb.org/movie/27205/watch?locale=SE', 1764115200),
  ('tmdb:movie:27205', 2, 'SE', 'rent', 'https://www.themoviedb.org/movie/27205/watch?locale=SE', 1764115200),
  ('tmdb:movie:155', 8, 'SE', 'flatrate', 'https://www.themoviedb.org/movie/155/watch?locale=SE', 1764115200),
  ('tmdb:movie:155', 2, 'SE', 'rent', 'https://www.themoviedb.org/movie/155/watch?locale=SE', 1764115200),
  ('tmdb:movie:155', 2, 'SE', 'buy', 'https://www.themoviedb.org/movie/155/watch?locale=SE', 1764115200),
  ('tmdb:movie:693134', 119, 'SE', 'flatrate', 'https://www.themoviedb.org/movie/693134/watch?locale=SE', 1764115200),
  ('tmdb:movie:693134', 426, 'SE', 'rent', 'https://www.themoviedb.org/movie/693134/watch?locale=SE', 1764115200),
  ('tmdb:movie:693134', 2, 'SE', 'buy', 'https://www.themoviedb.org/movie/693134/watch?locale=SE', 1764115200),
  ('tmdb:movie:872585', 119, 'SE', 'rent', 'https://www.themoviedb.org/movie/872585/watch?locale=SE', 1764115200),
  ('tmdb:movie:872585', 2, 'SE', 'rent', 'https://www.themoviedb.org/movie/872585/watch?locale=SE', 1764115200),
  ('tmdb:movie:872585', 2, 'SE', 'buy', 'https://www.themoviedb.org/movie/872585/watch?locale=SE', 1764115200),
  ('tmdb:movie:872585', 426, 'SE', 'rent', 'https://www.themoviedb.org/movie/872585/watch?locale=SE', 1764115200),
  ('tmdb:movie:496243', 8, 'SE', 'flatrate', 'https://www.themoviedb.org/movie/496243/watch?locale=SE', 1764115200),
  ('tmdb:movie:496243', 76, 'SE', 'flatrate', 'https://www.themoviedb.org/movie/496243/watch?locale=SE', 1764115200),
  ('tmdb:movie:603', 8, 'SE', 'flatrate', 'https://www.themoviedb.org/movie/603/watch?locale=SE', 1764115200),
  ('tmdb:movie:603', 2, 'SE', 'rent', 'https://www.themoviedb.org/movie/603/watch?locale=SE', 1764115200),
  ('tmdb:movie:603', 2, 'SE', 'buy', 'https://www.themoviedb.org/movie/603/watch?locale=SE', 1764115200),
  ('tmdb:movie:157336', 119, 'SE', 'flatrate', 'https://www.themoviedb.org/movie/157336/watch?locale=SE', 1764115200),
  ('tmdb:movie:157336', 76, 'SE', 'rent', 'https://www.themoviedb.org/movie/157336/watch?locale=SE', 1764115200),
  ('tmdb:series:1396', 8, 'SE', 'flatrate', 'https://www.themoviedb.org/tv/1396/watch?locale=SE', 1764115200),
  ('tmdb:series:1399', 76, 'SE', 'flatrate', 'https://www.themoviedb.org/tv/1399/watch?locale=SE', 1764115200),
  ('tmdb:series:94997', 76, 'SE', 'flatrate', 'https://www.themoviedb.org/tv/94997/watch?locale=SE', 1764115200),
  ('tmdb:series:94605', 8, 'SE', 'flatrate', 'https://www.themoviedb.org/tv/94605/watch?locale=SE', 1764115200);

INSERT INTO title_fts (title_id, name, original_name, overview)
SELECT id, name, original_name, overview FROM title;

INSERT INTO ingest_run (
  region, started_at, finished_at, titles_seen, offers_upserted, status
) VALUES ('SE', 1764115200, 1764115260, 12, 28, 'ok');
