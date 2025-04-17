import { useState } from "react"
import { useAuth } from "./auth/hook"
import { SyncProvider } from "./features/sync/sync-context"
import { DomainList } from "./features/monitoring/domain-list"
import "./style.css"

export default function IndexPopup() {
  const { user, isLoading, error, onLogin, onSignUp, onLogout } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("member")
  const [isSignUp, setIsSignUp] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isSignUp) {
      onSignUp(email, password, role)
    } else {
      onLogin(email, password)
    }
  }

  return (
    <SyncProvider>
      <div className="popup-container">
        <header className="popup-header">
          <h1 className="popup-title">proCure SaaS Usage Tracker</h1>
          {user && (
            <div className="user-controls">
              <span className="user-email">{user.email}</span>
              <button onClick={onLogout} className="logout-button">Log out</button>
            </div>
          )}
        </header>

        <main className="popup-main">
          {!user ? (
            <div className="auth-container">
              <h2 className="auth-title">{isSignUp ? "Create an account" : "Sign in"}</h2>
              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                  />
                  {isSignUp && (
                    <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                      Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number.
                    </small>
                  )}
                </div>
                {isSignUp && (
                  <div className="form-group">
                    <label htmlFor="role">Role</label>
                    <select
                      id="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="form-input"
                      disabled={isLoading}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                      Select your role in the organization
                    </small>
                  </div>
                )}
                <button type="submit" className="submit-button" disabled={isLoading}>
                  {isLoading ? "Processing..." : isSignUp ? "Sign Up" : "Log in"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="toggle-auth-button"
                >
                  {isSignUp ? "Already have an account? Log in" : "Need an account? Sign up"}
                </button>
                {error && (
                  <div className="error-message">
                    {error.split('\n').map((line, i) => {
                      // Check if the line contains a validation error message
                      const isValidationError = line.includes('must contain') ||
                                               line.includes('must be') ||
                                               line.includes('Value error') ||
                                               line.includes('Password must') ||
                                               line.includes('Organization Code');
                      return (
                        <div key={i} className={isValidationError ? 'validation-error' : ''}>
                          {/* Remove 'Value error, ' prefix if present */}
                          {line.replace('Value error, ', '')}
                        </div>
                      );
                    })}
                  </div>
                )}
              </form>
              <p className="auth-info">
                Sign in to track and manage your SaaS usage
              </p>
            </div>
          ) : (
            <DomainList />
          )}
        </main>
      </div>
    </SyncProvider>
  )
}
