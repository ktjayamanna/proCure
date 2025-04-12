import { parse } from 'tldts';
import { Storage } from '@plasmohq/storage';

// Create a storage instance
const storage = new Storage({
  area: "local" // Use local storage for persistence
});

// Interface for hostname entry with timestamp
interface HostnameEntry {
  hostname: string;
  timestamp: number;
}

// Storage key for hostname entries
const HOSTNAME_ENTRIES_KEY = 'hostname_entries';

// 24 hours in milliseconds
const EXPIRATION_TIME = 24 * 60 * 60 * 1000;

/**
 * Monitoring service to track hostnames with 24-hour expiration
 */
export class MonitoringService {
  /**
   * Add a hostname to the monitoring list
   * @param url The URL to parse and add
   */
  static async addDomain(url: string): Promise<void> {
    try {
      // Parse the URL to get the hostname
      const parsedUrl = parse(url);

      if (!parsedUrl.hostname) {
        console.warn('Could not parse hostname from URL:', url);
        return;
      }

      // Get existing entries
      const entries = await this.getDomainEntries();

      // Check if hostname already exists
      const existingEntryIndex = entries.findIndex(entry => entry.hostname === parsedUrl.hostname);

      const now = Date.now();

      if (existingEntryIndex >= 0) {
        const existingEntry = entries[existingEntryIndex];
        const timeElapsed = now - existingEntry.timestamp;

        // Only update if 24 hours have passed
        if (timeElapsed >= EXPIRATION_TIME) {
          entries[existingEntryIndex] = {
            hostname: parsedUrl.hostname,
            timestamp: now
          };
        }
      } else {
        // Add new entry
        entries.push({
          hostname: parsedUrl.hostname,
          timestamp: now
        });
      }

      // Save updated entries
      await storage.set(HOSTNAME_ENTRIES_KEY, entries);
    } catch (error) {
      console.error('Error adding hostname to monitoring:', error);
    }
  }

  /**
   * Get all hostname entries
   */
  static async getDomainEntries(): Promise<HostnameEntry[]> {
    try {
      const entries = await storage.get<HostnameEntry[]>(HOSTNAME_ENTRIES_KEY);
      return entries || [];
    } catch (error) {
      console.error('Error getting hostname entries:', error);
      return [];
    }
  }

  /**
   * Get active hostname entries (within the last 24 hours)
   */
  static async getActiveDomainEntries(): Promise<HostnameEntry[]> {
    try {
      const entries = await this.getDomainEntries();
      const now = Date.now();

      // Filter entries that are within the 24-hour window
      return entries.filter(entry => {
        const timeElapsed = now - entry.timestamp;
        return timeElapsed < EXPIRATION_TIME;
      });
    } catch (error) {
      console.error('Error getting active hostname entries:', error);
      return [];
    }
  }

  /**
   * Clear all hostname entries
   */
  static async clearDomainEntries(): Promise<void> {
    try {
      await storage.set(HOSTNAME_ENTRIES_KEY, []);
    } catch (error) {
      console.error('Error clearing hostname entries:', error);
    }
  }
}
