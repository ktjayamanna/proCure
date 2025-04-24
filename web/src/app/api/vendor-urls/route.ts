import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

// Define the schema for vendor URLs response
const VendorUrls = z.object({
  urls: z.array(z.string()),
});

// Define the request schema
const RequestSchema = z.object({
  vendors: z.array(z.string()),
});

// Initialize OpenAI client (server-side only)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await request.json();
    const validatedData = RequestSchema.parse(body);
    const { vendors } = validatedData;

    if (!vendors || vendors.length === 0) {
      return NextResponse.json(
        { error: "No vendor names provided" },
        { status: 400 }
      );
    }

    // Call OpenAI to get vendor URLs
    const response = await openai.responses.parse({
      model: "gpt-4o-2024-08-06",
      input: [
        {
          role: "system",
          content: "You are a helpful market research assistant for a business.",
        },
        {
          role: "user",
          content: `Following is a list of saas tools used by our business. What are the URLs of these tools? ${vendors.join(", ")}`,
        },
      ],
      text: {
        format: zodTextFormat(VendorUrls, "result"),
      },
    });

    // Return the parsed response
    return NextResponse.json(response.output_parsed);
  } catch (error) {
    console.error("Error in vendor-urls API route:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
