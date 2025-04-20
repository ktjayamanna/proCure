// Application configuration

// Get API URL from environment variables
const getApiBaseUrl = () => {
  // Use NEXT_PUBLIC_ prefix for client-side environment variables
  return process.env.NEXT_PUBLIC_API_URL || '';
};

// Exported API URLs
export const API_BASE_URL = getApiBaseUrl();
export const AUTH_API_URL = `${API_BASE_URL}/auth`;
