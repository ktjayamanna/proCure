import { useState } from "react"

import { MonitoringService } from "~features/monitoring/monitoring-service"

import "~style.css"

function OptionsPage() {
  const [isClearing, setIsClearing] = useState(false)
  const [clearSuccess, setClearSuccess] = useState(false)

  const handleClearDomains = async () => {
    try {
      setIsClearing(true)
      setClearSuccess(false)
      
      await MonitoringService.clearDomainEntries()
      
      setClearSuccess(true)
    } catch (error) {
      console.error("Error clearing domains:", error)
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="plasmo-p-4 plasmo-max-w-md plasmo-mx-auto">
      <h1 className="plasmo-text-2xl plasmo-font-bold plasmo-mb-4">proCure Extension Settings</h1>
      
      <div className="plasmo-bg-white plasmo-shadow plasmo-rounded-lg plasmo-p-4 plasmo-mb-4">
        <h2 className="plasmo-text-lg plasmo-font-semibold plasmo-mb-2">Domain Monitoring</h2>
        <p className="plasmo-text-gray-600 plasmo-mb-4">
          The extension tracks domains you visit to help you monitor your browsing activity.
          This data is stored locally on your device and is not shared with anyone.
        </p>
        
        <button
          onClick={handleClearDomains}
          disabled={isClearing}
          className="plasmo-bg-red-600 plasmo-text-white plasmo-px-4 plasmo-py-2 plasmo-rounded plasmo-hover:plasmo-bg-red-700 plasmo-disabled:plasmo-opacity-50"
        >
          {isClearing ? "Clearing..." : "Clear Domain History"}
        </button>
        
        {clearSuccess && (
          <p className="plasmo-text-green-600 plasmo-mt-2">Domain history cleared successfully!</p>
        )}
      </div>
      
      <div className="plasmo-text-sm plasmo-text-gray-500 plasmo-mt-8">
        <p>proCure Extension v0.0.1</p>
        <p>© 2024 proCure. All rights reserved.</p>
      </div>
    </div>
  )
}

export default OptionsPage
