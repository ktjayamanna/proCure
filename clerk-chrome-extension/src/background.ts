import { MonitoringService } from "~features/monitoring/monitoring-service"

// Listen for tab updates to capture navigation events
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only process when the URL has changed and is complete
  if (changeInfo.status === "complete" && tab.url) {
    try {
      // Add the hostname to monitoring
      await MonitoringService.addDomain(tab.url)
    } catch (error) {
      console.error("Error monitoring hostname in background:", error)
    }
  }
})

// Listen for tab activation to capture the current active tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId)
    if (tab.url) {
      // Add the hostname to monitoring
      await MonitoringService.addDomain(tab.url)
    }
  } catch (error) {
    console.error("Error monitoring active tab:", error)
  }
})

// Clean up expired hostnames periodically (every hour)
const CLEANUP_INTERVAL = 60 * 60 * 1000 // 1 hour

const cleanupExpiredHostnames = async () => {
  try {
    // This will automatically filter out expired hostnames
    const activeHostnames = await MonitoringService.getActiveDomainEntries()

    // Get all hostnames and replace with only active ones
    const allHostnames = await MonitoringService.getDomainEntries()

    if (allHostnames.length !== activeHostnames.length) {
      // Save only the active hostnames back to storage
      await MonitoringService.clearDomainEntries()

      // Add each active hostname back
      for (const entry of activeHostnames) {
        await MonitoringService.addDomain(entry.hostname)
      }
    }
  } catch (error) {
    console.error("Error cleaning up expired hostnames:", error)
  }
}

// Run cleanup on startup
cleanupExpiredHostnames()

// Set up periodic cleanup
setInterval(cleanupExpiredHostnames, CLEANUP_INTERVAL)
