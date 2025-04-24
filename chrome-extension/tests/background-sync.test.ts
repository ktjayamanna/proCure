import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { Storage } from '@plasmohq/storage';
import { BackgroundSync } from '../features/sync/background-sync';
import { MonitoringService } from '../features/monitoring/monitoring-service';
import * as auth from '../auth';

// Mock data
const mockToken = 'test-auth-token';
const mockDomainEntries = [
  { hostname: 'example.com', timestamp: 1617235200000 },
  { hostname: 'test.com', timestamp: 1617235300000 }
];

describe('Background Sync with Persistent Authentication', () => {
  let storage: any;

  beforeEach(() => {
    // Get the mocked storage instance
    storage = new Storage();
    
    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
    
    // Mock MonitoringService
    jest.spyOn(MonitoringService, 'getActiveDomainEntries').mockResolvedValue([...mockDomainEntries]);
    jest.spyOn(MonitoringService, 'clearDomainEntries').mockResolvedValue();
    
    // Mock auth
    jest.spyOn(auth, 'getAuthToken').mockResolvedValue(mockToken);
  });

  it('should successfully sync domain entries with valid authentication', async () => {
    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({ success: true })
    });
    
    // Call sync domain entries
    const result = await BackgroundSync.syncDomainEntries();
    
    // Verify sync was successful
    expect(result).toBe(true);
    
    // Verify API was called with correct data
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': `Bearer ${mockToken}`
        }),
        body: expect.stringContaining('entries')
      })
    );
    
    // Verify domain entries were cleared after successful sync
    expect(MonitoringService.clearDomainEntries).toHaveBeenCalled();
    
    // Verify sync status and time were updated
    expect(storage.set).toHaveBeenCalledWith('sync_status', 'success');
    expect(storage.set).toHaveBeenCalledWith('last_sync_time', expect.any(Number));
  });

  it('should handle sync when no entries are available', async () => {
    // Mock empty domain entries
    jest.spyOn(MonitoringService, 'getActiveDomainEntries').mockResolvedValueOnce([]);
    
    // Call sync domain entries
    const result = await BackgroundSync.syncDomainEntries();
    
    // Verify sync was successful
    expect(result).toBe(true);
    
    // Verify no API call was made
    expect(global.fetch).not.toHaveBeenCalled();
    
    // Verify sync status and time were updated
    expect(storage.set).toHaveBeenCalledWith('sync_status', 'success');
    expect(storage.set).toHaveBeenCalledWith('last_sync_time', expect.any(Number));
  });

  it('should fail sync when no authentication token is available', async () => {
    // Mock no auth token
    jest.spyOn(auth, 'getAuthToken').mockResolvedValueOnce(null);
    
    // Call sync domain entries
    const result = await BackgroundSync.syncDomainEntries();
    
    // Verify sync failed
    expect(result).toBe(false);
    
    // Verify no API call was made
    expect(global.fetch).not.toHaveBeenCalled();
    
    // Verify sync status was updated to error
    expect(storage.set).toHaveBeenCalledWith('sync_status', 'error');
  });

  it('should fail sync when API returns an error', async () => {
    // Mock failed API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401
    });
    
    // Call sync domain entries
    const result = await BackgroundSync.syncDomainEntries();
    
    // Verify sync failed
    expect(result).toBe(false);
    
    // Verify domain entries were not cleared
    expect(MonitoringService.clearDomainEntries).not.toHaveBeenCalled();
    
    // Verify sync status was updated to error
    expect(storage.set).toHaveBeenCalledWith('sync_status', 'error');
  });

  it('should get and set sync status correctly', async () => {
    // Test setting sync status
    await BackgroundSync.setSyncStatus('syncing');
    expect(storage.set).toHaveBeenCalledWith('sync_status', 'syncing');
    
    // Mock getting sync status
    storage.get.mockResolvedValueOnce('success');
    
    // Test getting sync status
    const status = await BackgroundSync.getSyncStatus();
    expect(status).toBe('success');
  });

  it('should get and set last sync time correctly', async () => {
    const timestamp = Date.now();
    
    // Test setting last sync time
    await BackgroundSync.setLastSyncTime(timestamp);
    expect(storage.set).toHaveBeenCalledWith('last_sync_time', timestamp);
    
    // Mock getting last sync time
    storage.get.mockResolvedValueOnce(timestamp);
    
    // Test getting last sync time
    const time = await BackgroundSync.getLastSyncTime();
    expect(time).toBe(timestamp);
  });
});
