import React, { useEffect, useState } from 'react';
import { MonitoringService, type HostnameEntry } from './monitoring-service';
import { SyncStatusDisplay } from '../sync/sync-status';
import { useSyncContext } from '../sync/sync-context';

export const DomainList: React.FC = () => {
  const [hostnames, setHostnames] = useState<HostnameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { syncStatus, lastSyncTime } = useSyncContext();

  const fetchHostnames = async () => {
    try {
      setLoading(true);
      const activeHostnames = await MonitoringService.getActiveDomainEntries();
      setHostnames(activeHostnames);
    } catch (error) {
      console.error('Error fetching hostnames:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostnames();

    // Refresh hostnames every minute
    const intervalId = setInterval(fetchHostnames, 60 * 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Refresh hostnames when sync status changes to success
  useEffect(() => {
    if (syncStatus === 'success') {
      fetchHostnames();
    }
  }, [syncStatus, lastSyncTime]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="domain-list-container">
        <div className="loading-message">Loading sites...</div>
        <SyncStatusDisplay onSyncComplete={fetchHostnames} />
      </div>
    );
  }

  if (hostnames.length === 0) {
    return (
      <div className="domain-list-container">
        <div className="empty-message">No sites visited in the last 24 hours.</div>
        <SyncStatusDisplay onSyncComplete={fetchHostnames} />
      </div>
    );
  }

  return (
    <div className="domain-list-container">
      <div className="domain-list">
        <h2 className="domain-list-title">Sites Visited (Last 24 Hours)</h2>
        <ul className="domain-entries">
          {hostnames.map((entry) => (
            <li key={entry.hostname} className="domain-entry">
              <div className="domain-entry-content">
                <span className="domain-hostname">{entry.hostname}</span>
                <span className="domain-timestamp">{formatDate(entry.timestamp)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Sync Status Component */}
      <SyncStatusDisplay onSyncComplete={fetchHostnames} />
    </div>
  );
};
