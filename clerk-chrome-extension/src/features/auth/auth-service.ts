import { Storage } from '@plasmohq/storage';

// Create a storage instance for auth-related data
const storage = new Storage({
  area: "local"
});

// Storage keys
const AUTH_TOKEN_KEY = 'auth_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';

/**
 * Authentication service for managing JWT tokens
 */
export class AuthService {
  /**
   * Store the authentication token in local storage
   * @param token The JWT token to store
   * @param expiryInMinutes Optional expiry time in minutes (default: 60)
   */
  static async storeToken(token: string, expiryInMinutes: number = 60): Promise<void> {
    try {
      if (!token) {
        console.warn('Attempted to store empty token');
        return;
      }
      
      // Store the token
      await storage.set(AUTH_TOKEN_KEY, token);
      
      // Calculate and store expiry time
      const expiryTime = Date.now() + (expiryInMinutes * 60 * 1000);
      await storage.set(TOKEN_EXPIRY_KEY, expiryTime);
      
      console.log('Authentication token stored successfully');
    } catch (error) {
      console.error('Error storing authentication token:', error);
    }
  }

  /**
   * Get the stored authentication token
   * @returns The stored token or null if not found or expired
   */
  static async getToken(): Promise<string | null> {
    try {
      const token = await storage.get<string>(AUTH_TOKEN_KEY);
      const expiryTime = await storage.get<number>(TOKEN_EXPIRY_KEY);
      
      // Check if token exists and is not expired
      if (token && expiryTime && Date.now() < expiryTime) {
        return token;
      }
      
      // Token is expired or doesn't exist
      return null;
    } catch (error) {
      console.error('Error retrieving authentication token:', error);
      return null;
    }
  }

  /**
   * Check if the token is expired or about to expire
   * @param bufferMinutes Minutes before actual expiry to consider token as expired (default: 5)
   * @returns True if token is expired or about to expire
   */
  static async isTokenExpired(bufferMinutes: number = 5): Promise<boolean> {
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

  /**
   * Clear the stored authentication token
   */
  static async clearToken(): Promise<void> {
    try {
      await storage.remove(AUTH_TOKEN_KEY);
      await storage.remove(TOKEN_EXPIRY_KEY);
      console.log('Authentication token cleared');
    } catch (error) {
      console.error('Error clearing authentication token:', error);
    }
  }
}
