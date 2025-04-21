"use client";

import { useAuth } from "@/lib/auth/auth-context";
import ProtectedRoute from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getOrganizationName } from "@/lib/api/organization-api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function DashboardPage() {
  const { user, onLogout } = useAuth();
  const router = useRouter();
  const [organization, setOrganization] = useState<{ domain_name: string; company_name?: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedSaas, setSelectedSaas] = useState<string | null>(null);

  const inactiveUsersMock: { [key: string]: string[] } = {
    Salesforce: [ "Mike Johnson", "Emma Davis"],
    Sentry: ["Alex Thompson", "Chris Baker"],
    Zoom: ["David Lee", "Rachel Green", "Lisa Chen"],
    "Google Workspace": ["James Wilson", "Maria Garcia", "Tom Baker"]
  };

  const handleShowInactiveUsers = (saasName: string) => {
    setSelectedSaas(saasName);
    setShowModal(true);
  };

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
                <h3 className="font-medium mb-2">
                  {organization?.company_name || organization?.domain_name || "Organization"} {new Date().toLocaleString('default', { month: 'short' })} Active Usage of Purchased SaaS
                </h3>
                <div className="p-4 border border-dashed rounded-md bg-muted/50 flex flex-col items-center justify-center">
                  <div className="grid grid-cols-1 gap-4 w-full max-w-md">
                    {[
                      { name: "Salesforce", users: "4 / 6" },
                      { name: "Sentry", users: "8 / 10" },
                      { name: "Zoom", users: "17 / 20" },
                      { name: "Google Workspace", users: "17 / 20" }
                    ].map((saas, index) => (
                      <div key={index} className="bg-background rounded p-3 flex flex-col h-[75px]">
                        <div className="flex justify-between items-start">
                          <span className="font-medium">{saas.name}</span>
                          <span className="text-sm">{saas.users} users</span>
                        </div>
                        <div className="flex justify-end mt-auto -mb-2 -mr-1">
                          <span 
                            onClick={() => handleShowInactiveUsers(saas.name)}
                            className="text-blue-500 hover:underline cursor-pointer text-[10px] italic"
                          >
                            see inactive users...
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
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

        {/* Inactive Users Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent aria-describedby="dialog-description">
            <DialogHeader>
              <DialogTitle>Inactive Users for {selectedSaas}</DialogTitle>
              <DialogDescription id="dialog-description">
                List of users who haven't used this application recently
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <ul className="list-disc pl-4 space-y-1">
                {selectedSaas && inactiveUsersMock[selectedSaas]?.map((user, index) => (
                  <li key={index} className="text-sm text-muted-foreground">
                    {user}
                  </li>
                ))}
              </ul>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
