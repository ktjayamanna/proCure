"""
Utility functions for the proCure server.
"""

from urllib.parse import urlparse
import tldextract

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


def get_base_domain(url: str) -> str:
    """
    Extract the base domain from a URL.

    Args:
        url: The URL to extract the domain from

    Returns:
        The base domain (e.g., example.com)
    """
    ext = tldextract.extract(url)
    return f"{ext.domain}.{ext.suffix}"
