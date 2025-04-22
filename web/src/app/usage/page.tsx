"use client";

import { useAuth } from "@/lib/auth/auth-context";
import ProtectedRoute from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getOrganizationName, getVendorUsage, VendorUsageData } from "@/lib/api/organization-api";

export default function UsagePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [organization, setOrganization] = useState<{ domain_name: string; company_name?: string } | null>(null);
  const [vendorUsage, setVendorUsage] = useState<VendorUsageData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      if (user?.organization_id) {
        try {
          setIsLoading(true);
          setError("");

          // Fetch organization name
          const orgData = await getOrganizationName(user.organization_id);
          setOrganization(orgData);

          // Fetch vendor usage data
          const usageData = await getVendorUsage(user.organization_id);
          setVendorUsage(usageData.vendors);
        } catch (err) {
          console.error("Error fetching data:", err);
          setError("Could not load data");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchData();
  }, [user?.organization_id]);

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-10 max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">SaaS Usage</h1>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-sm">
          <div className="p-4 border rounded-md">
            <h3 className="font-medium mb-2">
              {organization?.company_name || organization?.domain_name || "Organization"} {new Date().toLocaleString('default', { month: 'short' })} Active Usage of Purchased SaaS
            </h3>
            <div className="p-4 border border-dashed rounded-md bg-muted/50 flex flex-col items-center justify-center">
              <div className="grid grid-cols-1 gap-4 w-full max-w-md">
                {isLoading ? (
                  <div className="text-center py-4">Loading vendor data...</div>
                ) : error ? (
                  <div className="text-center py-4 text-destructive">{error}</div>
                ) : vendorUsage.length === 0 ? (
                  <div className="text-center py-4">No vendor data available</div>
                ) : (
                  vendorUsage.map((vendor, index) => (
                    <div key={index} className="bg-background rounded p-3 flex flex-col">
                      <div className="flex justify-between items-start">
                        <span className="font-medium">{vendor.vendor_name}</span>
                        <span className="text-sm">{vendor.active_users} / {vendor.total_seats} users</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}