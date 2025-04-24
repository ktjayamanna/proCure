from openai import OpenAI
from pydantic import BaseModel
import os

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv("backend/.vscode/.env")

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class ToolUrlResponse(BaseModel):
    title: str
    authors: list[str]
    abstract: str
    keywords: list[str]

response = client.responses.parse(
    model="gpt-4o-2024-08-06",
    input=[
        {
            "role": "system",
            "content": "You are an expert at structured data extraction. You will be given unstructured text from a research paper and should convert it into the given structure.",
        },
        {"role": "user", "content": "This is the text from the research paper. ..."},
    ],
    text_format=ToolUrlResponse,
)

research_paper = response.output_parsed

print(research_paper)