import { parse } from 'tldts';
import { Storage } from '@plasmohq/storage';

// Create a storage instance
const storage = new Storage({
  area: "local" // Use local storage for persistence
});

// Interface for domain entry with timestamp
interface DomainEntry {
  domain: string;
  timestamp: number;
}

// Storage key for domain entries
const DOMAIN_ENTRIES_KEY = 'domain_entries';

// 24 hours in milliseconds
const EXPIRATION_TIME = 24 * 60 * 60 * 1000;

/**
 * Monitoring service to track domains with 24-hour expiration
 */
export class MonitoringService {
  /**
   * Add a domain to the monitoring list
   * @param url The URL to parse and add
   */
  static async addDomain(url: string): Promise<void> {
    try {
      // Parse the URL to get the domain
      const parsedUrl = parse(url);

      if (!parsedUrl.domain) {
        console.warn('Could not parse domain from URL:', url);
        return;
      }

      // Get existing entries
      const entries = await this.getDomainEntries();

      // Check if domain already exists
      const existingEntryIndex = entries.findIndex(entry => entry.domain === parsedUrl.domain);

      const now = Date.now();

      if (existingEntryIndex >= 0) {
        const existingEntry = entries[existingEntryIndex];
        const timeElapsed = now - existingEntry.timestamp;

        // Only update if 24 hours have passed
        if (timeElapsed >= EXPIRATION_TIME) {
          entries[existingEntryIndex] = {
            domain: parsedUrl.domain,
            timestamp: now
          };
        }
      } else {
        // Add new entry
        entries.push({
          domain: parsedUrl.domain,
          timestamp: now
        });
      }

      // Save updated entries
      await storage.set(DOMAIN_ENTRIES_KEY, entries);
    } catch (error) {
      console.error('Error adding domain to monitoring:', error);
    }
  }

  /**
   * Get all domain entries
   */
  static async getDomainEntries(): Promise<DomainEntry[]> {
    try {
      const entries = await storage.get<DomainEntry[]>(DOMAIN_ENTRIES_KEY);
      return entries || [];
    } catch (error) {
      console.error('Error getting domain entries:', error);
      return [];
    }
  }

  /**
   * Get active domain entries (within the last 24 hours)
   */
  static async getActiveDomainEntries(): Promise<DomainEntry[]> {
    try {
      const entries = await this.getDomainEntries();
      const now = Date.now();

      // Filter entries that are within the 24-hour window
      return entries.filter(entry => {
        const timeElapsed = now - entry.timestamp;
        return timeElapsed < EXPIRATION_TIME;
      });
    } catch (error) {
      console.error('Error getting active domain entries:', error);
      return [];
    }
  }

  /**
   * Clear all domain entries
   */
  static async clearDomainEntries(): Promise<void> {
    try {
      await storage.set(DOMAIN_ENTRIES_KEY, []);
    } catch (error) {
      console.error('Error clearing domain entries:', error);
    }
  }
}
