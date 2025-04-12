from typing import List
from pydantic import BaseModel

# Pydantic models for request/response
class UrlVisitEntry(BaseModel):
    url: str
    timestamp: int
    browser: str = "Chrome"  # Default to Chrome since it's a Chrome extension

class UrlVisitLog(BaseModel):
    user_email: str
    entries: List[UrlVisitEntry]

class UrlVisitResponse(BaseModel):
    processed: int
    matched: int
    message: str