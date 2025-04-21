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
                <h3 className="font-medium mb-4">Quick Actions</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => router.push('/usage')}
                    className="w-full sm:w-auto"
                  >
                    View SaaS Usage
                  </Button>
                  <Button
                    onClick={() => router.push('/add-contracts')}
                    className="w-full sm:w-auto"
                  >
                    Add Contracts
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 border rounded-md">
                <h3 className="text-lg font-semibold mb-4">Next Steps</h3>
                <ol className="list-decimal list-inside space-y-4">
                  <li className="text-base text-muted-foreground leading-relaxed">
                    Close this tab
                  </li>
                  <li className="text-base text-muted-foreground leading-relaxed">
                    <span>Download the proCure Chrome extension: </span>
                    <a
                      href="chrome://extensions/?id=hgpfmdimilcnlacmpkjbieaikidlabkg"
                      className="text-primary font-medium hover:underline"
                    >
                      Open Extension
                    </a>
                  </li>
                  <li className="text-base text-muted-foreground leading-relaxed">
                    Sign in using the same credentials you used here (no need to sign up again)
                  </li>
                  <li className="text-base text-muted-foreground leading-relaxed italic">
                    Set it and forget it!
                  </li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
