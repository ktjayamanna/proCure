import { MonitoringService } from "./features/monitoring/monitoring-service"
import { BackgroundSync } from "./features/sync/background-sync"
import { getCurrentUser } from "./auth"

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

// Clean up expired hostnames periodically
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

// Set up alarm for cleanup (every hour)
chrome.alarms.create('cleanupExpiredHostnames', {
  periodInMinutes: 60 // 1 hour
})

// Function to sync domain entries with backend
const syncDomainEntries = async () => {
  try {
    // Removing auth check temporarily
    // if (auth.currentUser) {
    console.log('Starting sync with backend...')
    await BackgroundSync.syncDomainEntries()
    // } else {
    //   console.log('User not authenticated, skipping sync')
    // }
  } catch (error) {
    console.error('Error during sync process:', error)
  }
}

// Generate a random initial delay between 0 and 120 minutes to distribute sync load
const initialSyncDelayMinutes = Math.floor(Math.random() * 120);

// Set up alarm for syncing (every 2 hours) with random initial delay
console.log(`Setting up sync with initial delay of ${initialSyncDelayMinutes} minutes`)
chrome.alarms.create('syncDomainEntries', {
  delayInMinutes: initialSyncDelayMinutes,
  periodInMinutes: 120 // 2 hours
})

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncDomainEntries') {
    syncDomainEntries()
  } else if (alarm.name === 'cleanupExpiredHostnames') {
    cleanupExpiredHostnames()
  }
})

// Check authentication status periodically
setInterval(async () => {
  const user = await getCurrentUser()
  if (user) {
    console.log('User authenticated, running sync')
    syncDomainEntries()
  } else {
    console.log('User not signed in')
  }
}, 60000) // Check every minute

// Run sync on startup (after a short delay to allow extension to initialize)
setTimeout(() => {
  // Check if user is authenticated
  getCurrentUser().then(user => {
    if (user) {
      syncDomainEntries()
    } else {
      console.log('User not authenticated, skipping initial sync')
    }
  })
}, 5000)
