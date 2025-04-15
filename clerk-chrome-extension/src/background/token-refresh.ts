import { Storage } from '@plasmohq/storage';

// Create a storage instance for auth-related data
const storage = new Storage({
  area: "local"
});

// Storage keys
const AUTH_TOKEN_KEY = 'auth_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';

/**
 * Refresh the token using chrome.runtime messaging
 * This will be called from the background script
 */
export async function refreshToken(): Promise<string | null> {
  try {
    // Check if we have a valid token first
    const hasValidToken = await hasToken();
    if (!hasValidToken) {
      console.log('No valid token to refresh');
      return null;
    }

    // In a real implementation, this would call Clerk's API to refresh the token
    // For now, we'll just extend the expiry time of the existing token
    const token = await storage.get<string>(AUTH_TOKEN_KEY);
    if (token) {
      // Extend the token expiry by 55 minutes
      const expiryTime = Date.now() + (55 * 60 * 1000);
      await storage.set(TOKEN_EXPIRY_KEY, expiryTime);
      console.log('Token expiry extended successfully');
      return token;
    }
    
    return null;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

/**
 * Check if we have a token (even if expired)
 */
async function hasToken(): Promise<boolean> {
  try {
    const token = await storage.get<string>(AUTH_TOKEN_KEY);
    return !!token;
  } catch (error) {
    console.error('Error checking token existence:', error);
    return false;
  }
}

/**
 * Check if the token is expired or about to expire
 */
export async function isTokenExpired(bufferMinutes: number = 5): Promise<boolean> {
  try {
    const expiryTime = await storage.get<number>(TOKEN_EXPIRY_KEY);
    
    if (!expiryTime) {
      return true;
    }
    
    // Consider token expired if it's within the buffer period
    const bufferTime = bufferMinutes * 60 * 1000;
    return Date.now() + bufferTime >= expiryTime;
  } catch (error) {
    console.error('Error checking token expiry:', error);
    return true;
  }
}
