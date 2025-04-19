"""
Pydantic models for URL visits in the proCure application.
"""

from typing import List
from pydantic import BaseModel

class UrlVisitEntry(BaseModel):
    url: str
    timestamp: int
    browser: str = "Chrome"  # Default to Chrome since it's a Chrome extension

class UrlVisitLog(BaseModel):
    entries: List[UrlVisitEntry]

class UrlVisitResponse(BaseModel):
    processed: int
    matched: int
    message: str
