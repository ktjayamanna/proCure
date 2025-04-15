import { useState } from "react"
import { MonitoringService } from "~features/monitoring/monitoring-service"
import "~style.css"

function OptionsPage() {
  const [isClearing, setIsClearing] = useState(false)
  const [clearSuccess, setClearSuccess] = useState(false)

  const handleClearHostnames = async () => {
    try {
      setIsClearing(true)
      setClearSuccess(false)

      await MonitoringService.clearDomainEntries()

      setClearSuccess(true)
    } catch (error) {
      console.error("Error clearing site history:", error)
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="options-container">
      <h1 className="options-title">proCure SaaS Usage Tracker Settings</h1>
      
      <div className="options-section">
        <h2 className="section-title">Privacy Settings</h2>
        <p className="section-description">
          Manage your browsing data collected by the extension.
        </p>
        
        <div className="option-group">
          <button 
            onClick={handleClearHostnames}
            disabled={isClearing}
            className="clear-button"
          >
            {isClearing ? "Clearing..." : "Clear Site History"}
          </button>
          <p className="option-description">
            This will remove all site visit history stored in the extension.
          </p>
          {clearSuccess && (
            <div className="success-message">
              Site history has been cleared successfully.
            </div>
          )}
        </div>
      </div>
      
      <div className="options-section">
        <h2 className="section-title">About</h2>
        <p className="section-description">
          proCure SaaS Usage Tracker helps you monitor and manage your SaaS usage across different websites.
        </p>
        <p className="version-info">
          Version: 0.0.1
        </p>
      </div>
    </div>
  )
}

export default OptionsPage
