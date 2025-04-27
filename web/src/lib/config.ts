// Application configuration

// Get API URL based on environment variables
const getApiBaseUrl = () => {
  // Check if we should use AWS API
  const useAwsApi = process.env.NEXT_PUBLIC_USE_AWS_API === 'true';

  // Get the appropriate URL based on the flag
  if (useAwsApi) {
    return process.env.NEXT_PUBLIC_AWS_API_URL || '';
  } else {
    return process.env.NEXT_PUBLIC_LOCAL_API_URL || '';
  }
};

// Exported API URLs
export const API_BASE_URL = getApiBaseUrl();
export const AUTH_API_URL = `${API_BASE_URL}/auth`;
