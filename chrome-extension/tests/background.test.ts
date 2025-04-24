import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { MonitoringService } from '../features/monitoring/monitoring-service';
import { BackgroundSync } from '../features/sync/background-sync';
import * as auth from '../auth';

// We need to import the background script to test it
// This will execute the script and set up the event listeners
jest.mock('../features/monitoring/monitoring-service');
jest.mock('../features/sync/background-sync');
jest.mock('../auth');

describe('Background Script with Authentication Persistence', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock getCurrentUser to return null by default
    (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

    // Import the background script to set up listeners
    // We need to re-import it for each test to reset the state
    jest.isolateModules(() => {
      require('../background');
    });
  });

  it('should set up alarms for sync and cleanup', () => {
    // Verify alarms were created
    expect(chrome.alarms.create).toHaveBeenCalledWith('syncDomainEntries', {
      periodInMinutes: 2
    });

    expect(chrome.alarms.create).toHaveBeenCalledWith('cleanupExpiredHostnames', {
      periodInMinutes: 60
    });
  });

  it('should trigger sync when syncDomainEntries alarm fires', () => {
    // Mock BackgroundSync.syncDomainEntries
    (BackgroundSync.syncDomainEntries as jest.Mock).mockResolvedValue(true);

    // Simulate alarm firing by calling the listener directly
    const listener = chrome.alarms.onAlarm.addListener.mock.calls[0][0];
    listener({ name: 'syncDomainEntries' } as chrome.alarms.Alarm);

    // Verify sync was triggered
    expect(BackgroundSync.syncDomainEntries).toHaveBeenCalled();
  });

  it('should trigger cleanup when cleanupExpiredHostnames alarm fires', () => {
    // Mock MonitoringService methods
    (MonitoringService.getActiveDomainEntries as jest.Mock).mockResolvedValue([]);
    (MonitoringService.getDomainEntries as jest.Mock).mockResolvedValue([]);

    // Simulate alarm firing by calling the listener directly
    const listener = chrome.alarms.onAlarm.addListener.mock.calls[0][0];
    listener({ name: 'cleanupExpiredHostnames' } as chrome.alarms.Alarm);

    // Verify cleanup was triggered
    expect(MonitoringService.getActiveDomainEntries).toHaveBeenCalled();
  });

  it('should add domain to monitoring when tab is updated', async () => {
    // Mock MonitoringService.addDomain
    (MonitoringService.addDomain as jest.Mock).mockResolvedValue(undefined);

    // Simulate tab update by calling the listener directly
    const listener = chrome.tabs.onUpdated.addListener.mock.calls[0][0];
    listener(
      1,
      { status: 'complete' },
      { url: 'https://example.com' } as chrome.tabs.Tab
    );

    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify domain was added to monitoring
    expect(MonitoringService.addDomain).toHaveBeenCalledWith('https://example.com');
  });

  it('should add domain to monitoring when tab is activated', async () => {
    // Mock chrome.tabs.get
    (chrome.tabs.get as jest.Mock).mockImplementation((tabId, callback) => {
      if (typeof callback === 'function') {
        callback({ url: 'https://example.com' } as chrome.tabs.Tab);
      }
      return Promise.resolve({ url: 'https://example.com' } as chrome.tabs.Tab);
    });

    // Mock MonitoringService.addDomain
    (MonitoringService.addDomain as jest.Mock).mockResolvedValue(undefined);

    // Simulate tab activation by calling the listener directly
    const listener = chrome.tabs.onActivated.addListener.mock.calls[0][0];
    listener({ tabId: 1 } as chrome.tabs.TabActiveInfo);

    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify domain was added to monitoring
    expect(MonitoringService.addDomain).toHaveBeenCalledWith('https://example.com');
  });

  it('should set up interval for checking authentication status', () => {
    // Mock setInterval to capture the callback
    const originalSetInterval = global.setInterval;
    const mockSetInterval = jest.fn();
    global.setInterval = mockSetInterval;

    try {
      // Re-import the background script
      jest.isolateModules(() => {
        require('../background');
      });

      // Verify setInterval was called
      expect(mockSetInterval).toHaveBeenCalled();
    } finally {
      // Restore original setInterval
      global.setInterval = originalSetInterval;
    }
  });

  it('should run sync when user is authenticated', async () => {
    // Mock getCurrentUser to return a user
    (auth.getCurrentUser as jest.Mock).mockResolvedValue({
      employee_id: 'emp123',
      email: 'test@example.com'
    });

    // Mock BackgroundSync.syncDomainEntries
    (BackgroundSync.syncDomainEntries as jest.Mock).mockResolvedValue(true);

    // Call the function that checks auth and runs sync
    const originalSetTimeout = global.setTimeout;
    try {
      // Mock setTimeout to execute callback immediately
      global.setTimeout = (callback: Function) => {
        callback();
        return 0 as any;
      };

      // Re-import the background script
      jest.isolateModules(() => {
        require('../background');
      });

      // Wait for promises to resolve
      await new Promise(process.nextTick);

      // Verify sync was triggered
      expect(BackgroundSync.syncDomainEntries).toHaveBeenCalled();
    } finally {
      // Restore original setTimeout
      global.setTimeout = originalSetTimeout;
    }
  });

  it('should not run sync when user is not authenticated', async () => {
    // Mock getCurrentUser to return null
    (auth.getCurrentUser as jest.Mock).mockResolvedValue(null);

    // Mock BackgroundSync.syncDomainEntries
    (BackgroundSync.syncDomainEntries as jest.Mock).mockResolvedValue(true);

    // Call the function that checks auth and runs sync
    const originalSetTimeout = global.setTimeout;
    try {
      // Mock setTimeout to execute callback immediately
      global.setTimeout = (callback: Function) => {
        callback();
        return 0 as any;
      };

      // Re-import the background script
      jest.isolateModules(() => {
        require('../background');
      });

      // Wait for promises to resolve
      await new Promise(process.nextTick);

      // Verify sync was not triggered for initial sync
      expect(BackgroundSync.syncDomainEntries).not.toHaveBeenCalled();
    } finally {
      // Restore original setTimeout
      global.setTimeout = originalSetTimeout;
    }
  });
});
