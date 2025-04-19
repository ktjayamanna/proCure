"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { signIn, signUp, signOut, getCurrentUser, User, AuthState } from "./auth-api";

interface AuthContextType {
  isLoading: boolean;
  error: string;
  user: User | null;
  onLogin: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, role?: string) => Promise<void>;
  onLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    error: "",
    user: null,
  });

  // Initialize auth state on component mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try to get current user
        const user = await getCurrentUser();
        
        setState({
          isLoading: false,
          error: "",
          user,
        });
      } catch (error) {
        setState({
          isLoading: false,
          error: error instanceof Error ? error.message : "Unknown error",
          user: null,
        });
      }
    };

    initAuth();
  }, []);

  const onLogin = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: "" }));

    try {
      const user = await signIn(email, password);
      setState({
        isLoading: false,
        error: "",
        user,
      });
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "Failed to sign in";

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      
      // Re-throw the error so the component can handle it
      throw error;
    }
  };

  const onSignUp = async (email: string, password: string, role: string = "member") => {
    setState((prev) => ({ ...prev, isLoading: true, error: "" }));

    try {
      const user = await signUp(email, password, role);
      setState({
        isLoading: false,
        error: "",
        user,
      });
    } catch (error) {
      console.error("Sign up error:", error);
      let errorMessage = "Failed to sign up";

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      
      // Re-throw the error so the component can handle it
      throw error;
    }
  };

  const onLogout = async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      await signOut();
      setState({
        isLoading: false,
        error: "",
        user: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to sign out",
      }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoading: state.isLoading,
        error: state.error,
        user: state.user,
        onLogin,
        onSignUp,
        onLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
