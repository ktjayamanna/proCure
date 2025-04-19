"use client";

import { useAuth } from "@/lib/auth/auth-context";
import ProtectedRoute from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, onLogout } = useAuth();
  const router = useRouter();

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
                <p>Organization ID: {user?.organization_id || "Not assigned"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
