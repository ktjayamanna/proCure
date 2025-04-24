// Vendor API service
import { API_BASE_URL } from '../config';

/**
 * Fetch vendor URLs using OpenAI via server-side API route
 * @param vendors Array of vendor names to fetch URLs for
 * @returns Object containing array of URLs
 */
export async function fetchVendorUrls(vendors: string[]) {
  try {
    // Call our Next.js API route that securely uses OpenAI
    const response = await fetch('/api/vendor-urls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vendors }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to fetch vendor URLs: ${response.status}`);
    }

    return await response.json(); // { urls: [...] }
  } catch (error) {
    console.error("Error fetching vendor URLs:", error);
    throw error;
  }
}
