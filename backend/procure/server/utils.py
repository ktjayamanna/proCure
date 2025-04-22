"""
Utility functions for the proCure server.
"""

from urllib.parse import urlparse

def normalize_url(raw_url: str) -> str:
    """
    Normalize a URL to prevent duplicates due to typos or formatting differences.
    
    Args:
        raw_url: The raw URL to normalize
        
    Returns:
        A normalized URL in the format https://domain.com
        
    Raises:
        ValueError: If the URL is invalid
    """
    raw_url = raw_url.strip().lower()

    # Add scheme if missing
    if not raw_url.startswith(("http://", "https://")):
        raw_url = "https://" + raw_url

    parsed = urlparse(raw_url)

    # If URL doesn't parse cleanly, fail fast
    if not parsed.netloc:
        raise ValueError(f"Invalid URL: {raw_url}")

    return f"https://{parsed.netloc}"
