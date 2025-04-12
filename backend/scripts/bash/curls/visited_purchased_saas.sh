curl -v -X POST "http://127.0.0.1:8000/api/v1/url-visits" \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "test2@example.com",
    "entries": [
      {
        "url": "https://github.com/",
        "timestamp": 0,
        "browser": "Chrome"
      }
    ]
  }'
