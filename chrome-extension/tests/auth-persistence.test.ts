import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { Storage } from '@plasmohq/storage';
import * as auth from '../auth';
import {
  signIn,
  signInWithToken,
  getCurrentUser,
  getAuthToken,
  getDeviceId
} from '../auth';

// Mock data
const mockUser = {
  id: 'emp123',
  email: 'test@example.com',
  organization_id: 'org123',
  role: 'member'
};

const mockToken = 'test-auth-token';
const mockDeviceId = 'test-device-id';

describe('Authentication Persistence', () => {
  let storage: any;

  beforeEach(() => {
    // Get the mocked storage instance
    storage = new Storage();

    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
  });

  it('should generate and persist a device ID', async () => {
    // Setup storage mock to simulate no existing device ID
    storage.get.mockResolvedValueOnce(null);

    const deviceId = await getDeviceId();

    // Verify device ID was generated
    expect(deviceId).toBeTruthy();
    expect(typeof deviceId).toBe('string');

    // Verify device ID was stored
    expect(storage.set).toHaveBeenCalledWith('device_id', deviceId);
  });

  it('should retrieve existing device ID without regenerating', async () => {
    // Setup storage mock to return an existing device ID
    storage.get.mockResolvedValueOnce(mockDeviceId);

    const deviceId = await getDeviceId();

    // Verify the existing device ID was returned
    expect(deviceId).toBe(mockDeviceId);

    // Verify no new device ID was stored
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('should store user and token after successful sign in', async () => {
    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({
        id: mockUser.id,
        email: mockUser.email,
        organization_id: mockUser.organization_id,
        role: mockUser.role,
        device_token: mockToken
      })
    });

    // Mock getDeviceId
    jest.spyOn(auth, 'getDeviceId').mockResolvedValueOnce(mockDeviceId);

    // Call sign in
    const result = await signIn('test@example.com', 'password');

    // Verify user and token were stored
    expect(storage.set).toHaveBeenCalledWith('auth_user', mockUser);
    expect(storage.set).toHaveBeenCalledWith('auth_token', mockToken);

    // Verify correct result was returned
    expect(result).toEqual({ user: mockUser, token: mockToken });
  });

  it('should successfully sign in with stored token', async () => {
    // Setup storage mock to return a token
    storage.get.mockImplementation((key: string) => {
      if (key === 'auth_token') return Promise.resolve(mockToken);
      return Promise.resolve(null);
    });

    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({
        id: mockUser.id,
        email: mockUser.email,
        organization_id: mockUser.organization_id,
        role: mockUser.role,
        device_token: mockToken
      })
    });

    // Mock getDeviceId
    jest.spyOn(auth, 'getDeviceId').mockResolvedValueOnce(mockDeviceId);

    // Call sign in with token
    const result = await signInWithToken();

    // Verify user was updated in storage
    expect(storage.set).toHaveBeenCalledWith('auth_user', mockUser);

    // Verify correct result was returned
    expect(result).toEqual({ user: mockUser, token: mockToken });
  });

  it('should return null when no token is stored', async () => {
    // Setup storage mock to return no token
    storage.get.mockResolvedValueOnce(null);

    // Call sign in with token
    const result = await signInWithToken();

    // Verify null was returned
    expect(result).toBeNull();

    // Verify no API call was made
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should clear stored credentials when token is invalid', async () => {
    // Setup storage mock to return a token
    storage.get.mockImplementation((key: string) => {
      if (key === 'auth_token') return Promise.resolve(mockToken);
      return Promise.resolve(null);
    });

    // Mock failed API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false
    });

    // Mock getDeviceId
    jest.spyOn(auth, 'getDeviceId').mockResolvedValueOnce(mockDeviceId);

    // Call sign in with token
    const result = await signInWithToken();

    // Verify credentials were cleared
    expect(storage.remove).toHaveBeenCalledWith('auth_user');
    expect(storage.remove).toHaveBeenCalledWith('auth_token');

    // Verify null was returned
    expect(result).toBeNull();
  });

  it('should retrieve current user from storage', async () => {
    // Setup storage mock to return a user
    storage.get.mockResolvedValueOnce(mockUser);

    // Call get current user
    const user = await getCurrentUser();

    // Verify correct user was returned
    expect(user).toEqual(mockUser);
  });

  it('should retrieve auth token from storage', async () => {
    // Setup storage mock to return a token
    storage.get.mockResolvedValueOnce(mockToken);

    // Call get auth token
    const token = await getAuthToken();

    // Verify correct token was returned
    expect(token).toEqual(mockToken);
  });
});
