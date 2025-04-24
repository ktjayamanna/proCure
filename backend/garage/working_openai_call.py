from openai import OpenAI
from pydantic import BaseModel, constr, Field
from typing import Dict, Annotated
import os
# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv("backend/.vscode/.env")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Use Annotated with constr for Pydantic v2
Hostname = Annotated[str, constr(pattern=r'^[^.]+\.[^.]+$')]

# Use a dictionary type directly
class ToolURLMapping(BaseModel):
    tool_urls: list[str]

response = client.responses.parse(
    model="gpt-4o-2025-04-16",
    input=[
        {
            "role": "system",
            "content": (
                "You are a JSON-only mapper. When given a list of tool names, "
                "look up each tool's public domain, format it as \"{hostname}.{suffix}\" "
                "with exactly one period, and return only a JSON object whose keys are "
                "the tool names and values are the corresponding hostnames. No explanations or extra fields."
            )
        },
        {
            "role": "user",
            "content": (
                "1) Find the urls of these tools:\n"
                " 1Password\n"
                " 650 Industries (expo)\n"
                " Ada Support Inc\n"
                " Alchemy\n"
                " Aon Consulting, Inc.\n"
                " AP Intego\n"
                " Apify\n"
                " Arbiscan\n"
                " Ashbyhq\n"
                " Atlassian\n"
                " AWS\n"
                " Basescan\n"
                " Blockaid, Inc.\n"
                " Blockchair API Limited\n"
                " Browserstack\n"
                " BscScan\n"
                " Calendly\n"
                " Canny\n\n"
                "2) Format them as f\"{hostname}.{suffix}\" (exactly one period).\n"
                "3) Return the data dictionary's values as a list; nothing else."
            )
        },
    ],
    text_format=ToolURLMapping,
)

tool_urls = response.output_parsed
print(tool_urls)