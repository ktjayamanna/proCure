import { useState } from "react"
import { useFirebase } from "~firebase/hook"

export default function IndexPopup() {
  const { user, isLoading, error, onLogin, onSignUp, onLogout } = useFirebase()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isSignUp) {
      onSignUp(email, password)
    } else {
      onLogin(email, password)
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 16,
        width: "300px",
        gap: 8
      }}>
      <h1>
        Welcome to your <a href="https://www.plasmo.com">Plasmo</a> Extension!
      </h1>
      
      {!user ? (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">
            {isSignUp ? "Sign Up" : "Log in"}
          </button>
          <button type="button" onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? "Already have an account? Log in" : "Need an account? Sign up"}
          </button>
          {error && <div style={{ color: "red" }}>{error}</div>}
        </form>
      ) : (
        <button onClick={() => onLogout()}>Log out</button>
      )}
      
      <div>
        {isLoading ? "Loading..." : ""}
        {!!user && (
          <div>
            Welcome to Plasmo, your email address is {user.email}
          </div>
        )}
      </div>

      <footer>Crafted by @PlasmoHQ</footer>
    </div>
  )
}
