import { Storage } from '@plasmohq/storage'

// Create a storage instance for auth-related data
const storage = new Storage({
  area: "local"
})

// Storage keys
const USER_KEY = 'auth_user'
const TOKEN_KEY = 'auth_token'

// Import API URL from config
import { getAuthApiUrl } from '../config'

// Types
export interface User {
  id: string
  email: string
  organization_id?: string
  role?: string
}

export interface AuthState {
  isLoading: boolean
  error: string
  user: User | null
}

export const getDeviceId = async (): Promise<string> => {
  let deviceId = await storage.get<string>('device_id')

  if (!deviceId) {
    // Create a unique string combining extension ID and timestamp
    const rawId = `${chrome.runtime.id}_${Date.now()}`

    // Convert the string to a hash using SHA-256
    const msgBuffer = new TextEncoder().encode(rawId)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)

    // Convert the hash to a hex string
    deviceId = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    await storage.set('device_id', deviceId)
  }

  return deviceId
}

// Sign up a new user
export const signUp = async (
  email: string,
  password: string,
  role: string = "member"
): Promise<{ user: User; token: string }> => {
  // Organization is determined by email domain
  const deviceId = await getDeviceId()

  const apiUrl = getAuthApiUrl();
  const response = await fetch(`${apiUrl}/create-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      device_id: deviceId,
      role
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    console.error('Sign up error:', errorData)

    // Handle different error formats
    if (Array.isArray(errorData.detail)) {
      // Format validation errors
      const errorMessages = errorData.detail.map(err => {
        if (err.type === 'value_error') {
          return err.msg
        }
        return `${err.loc.join('.')}: ${err.msg}`
      }).join('\n')
      throw new Error(errorMessages)
    } else if (typeof errorData.detail === 'string') {
      throw new Error(errorData.detail)
    } else if (errorData.message) {
      throw new Error(JSON.stringify(errorData.message))
    } else {
      throw new Error('Failed to sign up')
    }
  }

  const data = await response.json()

  // Store user and token in storage
  const user: User = {
    id: data.id,
    email: data.email,
    organization_id: data.organization_id,
    role: data.role
  }

  await storage.set(USER_KEY, user)
  await storage.set(TOKEN_KEY, data.device_token)

  return { user, token: data.device_token }
}

// Sign in with email and password
export const signIn = async (
  email: string,
  password: string
): Promise<{ user: User; token: string }> => {
  const deviceId = await getDeviceId()

  const apiUrl = getAuthApiUrl();
  const response = await fetch(`${apiUrl}/sign-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      device_id: deviceId
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    console.error('Sign in error:', errorData)

    // Handle different error formats
    if (Array.isArray(errorData.detail)) {
      // Format validation errors
      const errorMessages = errorData.detail.map(err => {
        if (err.type === 'value_error') {
          return err.msg
        }
        return `${err.loc.join('.')}: ${err.msg}`
      }).join('\n')
      throw new Error(errorMessages)
    } else if (typeof errorData.detail === 'string') {
      throw new Error(errorData.detail)
    } else if (errorData.message) {
      throw new Error(JSON.stringify(errorData.message))
    } else {
      throw new Error('Failed to sign in')
    }
  }

  const data = await response.json()

  // Store user and token in storage
  const user: User = {
    id: data.id,
    email: data.email,
    organization_id: data.organization_id,
    role: data.role
  }

  await storage.set(USER_KEY, user)
  await storage.set(TOKEN_KEY, data.device_token)

  return { user, token: data.device_token }
}

// Sign in with device token
export const signInWithToken = async (): Promise<{ user: User; token: string } | null> => {
  const token = await storage.get<string>(TOKEN_KEY)
  if (!token) {
    return null
  }

  const deviceId = await getDeviceId()

  try {
    const apiUrl = getAuthApiUrl();
    const response = await fetch(`${apiUrl}/sign-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        device_token: token,
        device_id: deviceId
      })
    })

    if (!response.ok) {
      // If token is invalid, clear storage and return null
      await storage.remove(USER_KEY)
      await storage.remove(TOKEN_KEY)
      return null
    }

    const data = await response.json()

    // Update user data in storage
    const user: User = {
      id: data.id,
      email: data.email,
      organization_id: data.organization_id,
      role: data.role
    }

    await storage.set(USER_KEY, user)

    return { user, token: data.device_token }
  } catch (error) {
    console.error('Error signing in with token:', error)
    return null
  }
}

// Sign out
export const signOut = async (): Promise<void> => {
  await storage.remove(USER_KEY)
  await storage.remove(TOKEN_KEY)
}

// Get current user from storage
export const getCurrentUser = async (): Promise<User | null> => {
  return await storage.get<User>(USER_KEY)
}

// Get current token from storage
export const getAuthToken = async (): Promise<string | null> => {
  return await storage.get<string>(TOKEN_KEY)
}
