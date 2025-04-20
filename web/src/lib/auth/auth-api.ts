// Types
export interface User {
  employee_id: string;
  email: string;
  organization_id?: string;
  role?: string;
}

export interface AuthState {
  isLoading: boolean;
  error: string;
  user: User | null;
}

import { AUTH_API_URL } from '@/lib/config';

// Backend API URL from config
const API_URL = AUTH_API_URL;

// Generate a random device ID for the Chrome extension compatibility
// The web app doesn't use device tokens for authentication (it uses cookies)
// But we generate a device ID during sign-up so users can later use the Chrome extension
// without having to sign up again
function generateDeviceId(): string {
  return 'web_' + Math.random().toString(36).substring(2, 15);
}

// Sign up a new user
export const signUp = async (
  email: string,
  password: string,
  role: string = "member"
): Promise<User> => {
  const deviceId = generateDeviceId();

  const response = await fetch(`${API_URL}/create-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      device_id: deviceId,
      role
    }),
    credentials: 'include' // Important for cookies
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Sign up error:', errorData);

    // Handle different error formats
    if (Array.isArray(errorData.detail)) {
      // Format validation errors
      const errorMessages = errorData.detail.map((err: { type: string; msg: string; loc: string[] }) => {
        if (err.type === 'value_error') {
          return err.msg;
        }
        return `${err.loc.join('.')}: ${err.msg}`;
      }).join('\n');
      throw new Error(errorMessages);
    } else if (typeof errorData.detail === 'string') {
      throw new Error(errorData.detail);
    } else if (errorData.message) {
      throw new Error(JSON.stringify(errorData.message));
    } else {
      throw new Error('Failed to sign up');
    }
  }

  const data = await response.json();

  // Return user data
  const user: User = {
    employee_id: data.id,
    email: data.email,
    organization_id: data.organization_id,
    role: data.role
  };

  return user;
};

// Sign in with email and password
export const signIn = async (
  email: string,
  password: string
): Promise<User> => {
  const deviceId = generateDeviceId();

  const response = await fetch(`${API_URL}/sign-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      device_id: deviceId
    }),
    credentials: 'include' // Important for cookies
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Sign in error:', errorData);

    if (typeof errorData.detail === 'string') {
      throw new Error(errorData.detail);
    } else {
      throw new Error('Failed to sign in');
    }
  }

  const data = await response.json();

  // Return user data
  const user: User = {
    employee_id: data.id,
    email: data.email,
    organization_id: data.organization_id,
    role: data.role
  };

  return user;
};

// Sign out
export const signOut = async (): Promise<void> => {
  try {
    await fetch(`${API_URL}/logout`, {
      method: 'POST',
      credentials: 'include' // Important for cookies
    });
  } catch (error) {
    console.error('Error during sign out:', error);
    throw error;
  }
};

// Get current user
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await fetch(`${API_URL}/me`, {
      credentials: 'include' // Important for cookies
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      employee_id: data.id,
      email: data.email,
      organization_id: data.organization_id,
      role: data.role
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};
