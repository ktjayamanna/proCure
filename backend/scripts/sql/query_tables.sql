-- query.sql
SELECT original_url, shortened_url, created_at
FROM urls
ORDER BY created_at DESC
LIMIT 10;
