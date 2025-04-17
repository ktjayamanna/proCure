import { useEffect, useState } from 'react'
import {
  AuthState,
  User,
  getCurrentUser,
  signIn,
  signInWithToken,
  signOut,
  signUp
} from './index'

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    error: '',
    user: null
  })

  // Initialize auth state on component mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // First try to get user from storage
        const storedUser = await getCurrentUser()

        if (storedUser) {
          // If we have a stored user, try to sign in with the stored token
          const result = await signInWithToken()

          if (result) {
            setState({
              isLoading: false,
              error: '',
              user: result.user
            })
          } else {
            // If token sign-in fails, clear state
            setState({
              isLoading: false,
              error: '',
              user: null
            })
          }
        } else {
          // No stored user
          setState({
            isLoading: false,
            error: '',
            user: null
          })
        }
      } catch (error) {
        setState({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          user: null
        })
      }
    }

    initAuth()
  }, [])

  const onLogin = async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: '' }))

    try {
      const result = await signIn(email, password)
      setState({
        isLoading: false,
        error: '',
        user: result.user
      })
    } catch (error) {
      console.error('Login error:', error)
      let errorMessage = 'Failed to sign in'

      if (error instanceof Error) {
        errorMessage = error.message
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))
    }
  }

  const onSignUp = async (email: string, password: string, organizationId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: '' }))

    try {
      const result = await signUp(email, password, organizationId)
      setState({
        isLoading: false,
        error: '',
        user: result.user
      })
    } catch (error) {
      console.error('Sign up error:', error)
      let errorMessage = 'Failed to sign up'

      if (error instanceof Error) {
        errorMessage = error.message
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))
    }
  }

  const onLogout = async () => {
    setState(prev => ({ ...prev, isLoading: true }))

    try {
      await signOut()
      setState({
        isLoading: false,
        error: '',
        user: null
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to sign out'
      }))
    }
  }

  return {
    isLoading: state.isLoading,
    error: state.error,
    user: state.user,
    onLogin,
    onSignUp,
    onLogout
  }
}
