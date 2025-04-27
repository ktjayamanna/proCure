// Chrome extension configuration

// Get API URLs from environment variables
export const LOCAL_API_URL = process.env.PLASMO_PUBLIC_LOCAL_API_URL || 'http://localhost:8000/api/v1';
export const AWS_API_URL = process.env.PLASMO_PUBLIC_AWS_API_URL || 'https://y3otceq5rh.execute-api.us-east-2.amazonaws.com/api/v1';

// Flag to determine which API URL to use (from environment variables)
// Set to true to use AWS API, false to use local API
export const USE_AWS_API = process.env.PLASMO_PUBLIC_USE_AWS_API === 'true';

// Get the base API URL based on the flag
export const getApiBaseUrl = (): string => {
  return USE_AWS_API ? AWS_API_URL : LOCAL_API_URL;
};

// Auth API endpoints
export const getAuthApiUrl = (): string => {
  return `${getApiBaseUrl()}/auth`;
};

// URL visits API endpoints
export const getUrlVisitsApiUrl = (): string => {
  return `${getApiBaseUrl()}/url-visits`;
};
