import { useEffect, useState } from 'react';
import { MonitoringService } from './monitoring-service';
import { SyncStatusDisplay } from '~features/sync/sync-status';

interface HostnameEntry {
  hostname: string;
  timestamp: number;
}

export const DomainList = () => {
  const [hostnames, setHostnames] = useState<HostnameEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    fetchHostnames();

    // Refresh hostnames every minute
    const intervalId = setInterval(fetchHostnames, 60 * 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="plasmo-w-full">
        <div className="plasmo-text-center plasmo-py-4 plasmo-mb-4">Loading sites...</div>
        <SyncStatusDisplay />
      </div>
    );
  }

  if (hostnames.length === 0) {
    return (
      <div className="plasmo-w-full">
        <div className="plasmo-text-center plasmo-py-4 plasmo-mb-4">No sites visited in the last 24 hours.</div>
        <SyncStatusDisplay />
      </div>
    );
  }

  return (
    <div className="plasmo-w-full">
      <div className="plasmo-max-h-[350px] plasmo-overflow-y-auto plasmo-mb-4">
        <h2 className="plasmo-text-lg plasmo-font-semibold plasmo-mb-2">Sites Visited (Last 24 Hours)</h2>
        <ul className="plasmo-divide-y plasmo-divide-gray-200">
          {hostnames.map((entry) => (
            <li key={entry.hostname} className="plasmo-py-2">
              <div className="plasmo-flex plasmo-justify-between">
                <span className="plasmo-font-medium">{entry.hostname}</span>
                <span className="plasmo-text-sm plasmo-text-gray-500">{formatDate(entry.timestamp)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Sync Status Component */}
      <SyncStatusDisplay />
    </div>
  );
};
