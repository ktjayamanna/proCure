"use client";

import { useAuth } from "@/lib/auth/auth-context";
import ProtectedRoute from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getOrganizationName } from "@/lib/api/organization-api";

export default function DashboardPage() {
  const { user, onLogout } = useAuth();
  const router = useRouter();
  const [organization, setOrganization] = useState<{ domain_name: string; company_name?: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // Fetch organization name when user data is available
    const fetchOrgName = async () => {
      if (user?.organization_id) {
        try {
          setIsLoading(true);
          setError("");
          const orgData = await getOrganizationName(user.organization_id);
          setOrganization(orgData);
        } catch (err) {
          console.error("Error fetching organization name:", err);
          setError("Could not load organization name");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchOrgName();
  }, [user?.organization_id]);

  const handleLogout = async () => {
    await onLogout();
    router.push("/login");
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-10 max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>
            Sign out
          </Button>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Welcome, {user?.email}</h2>
          <div className="grid gap-4">
            <div className="p-4 border rounded-md">
              <h3 className="font-medium">Account Information</h3>
              <div className="mt-2 text-sm text-muted-foreground">
                <p>Email: {user?.email}</p>
                <p>Role: {user?.role || "Member"}</p>
                <p>
                  Organization: {isLoading ? (
                    <span className="text-muted-foreground italic">Loading...</span>
                  ) : error ? (
                    <span className="text-destructive">{error}</span>
                  ) : organization ? (
                    <span>{organization.company_name || organization.domain_name}</span>
                  ) : (
                    <span className="text-muted-foreground">Not assigned</span>
                  )}
                </p>
              </div>
            </div>

            {user?.role === "admin" ? (
              <div className="p-4 border rounded-md">
                <h3 className="font-medium mb-2">SaaS Usage Dashboard</h3>
                <div className="p-4 border border-dashed rounded-md bg-muted/50 flex flex-col items-center justify-center">
                  <p className="text-muted-foreground text-center mb-2">SaaS Usage Graph Coming Soon</p>
                  <div className="grid grid-cols-1 gap-2 w-full max-w-md">
                    {[
                      { name: "Microsoft 365", users: 145 },
                      { name: "Slack", users: 98 },
                      { name: "Zoom", users: 87 },
                      { name: "Google Workspace", users: 76 },
                      { name: "Salesforce", users: 42 }
                    ].map((saas, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-background rounded">
                        <span>{saas.name}</span>
                        <span className="font-medium">{saas.users} users</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 border rounded-md">
                <h3 className="font-medium mb-2">Chrome Extension</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Install the proCure Chrome extension to automatically track your SaaS usage.
                </p>
                <a
                  href="https://chrome.google.com/webstore/detail/procure-saas-usage-tracker/placeholder-id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-medium hover:underline text-sm"
                >
                  Install Extension
                </a>
                <p className="text-xs text-muted-foreground mt-2">
                  Set it and forget it! The extension will automatically track your SaaS usage.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
