"use client";

import { useAuth } from "@/lib/auth/auth-context";
import ProtectedRoute from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { getOrganizationName, getVendorUsage, VendorUsageData } from "@/lib/api/organization-api";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function UsagePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [organization, setOrganization] = useState<{ domain_name: string; company_name?: string } | null>(null);
  const [vendorUsage, setVendorUsage] = useState<VendorUsageData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  // Calculate usage ratio for each vendor and sort by usage (least to most)
  const sortedAndPaginatedVendors = useMemo(() => {
    // Add usage ratio and sort
    const vendorsWithRatio = vendorUsage.map(vendor => ({
      ...vendor,
      usageRatio: vendor.active_users / vendor.total_seats
    }));

    // Sort by usage ratio (least to most)
    const sorted = [...vendorsWithRatio].sort((a, b) => a.usageRatio - b.usageRatio);

    // Calculate total pages
    const totalPages = Math.ceil(sorted.length / itemsPerPage);

    // Get current page items
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = sorted.slice(startIndex, endIndex);

    return {
      items: paginatedItems,
      totalPages,
      totalItems: sorted.length
    };
  }, [vendorUsage, currentPage, itemsPerPage]);

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
                  <>
                    <div className="text-sm text-muted-foreground mb-2">
                      Showing vendors sorted by usage ratio (least to most)
                    </div>
                    {sortedAndPaginatedVendors.items.map((vendor, index) => {
                      const usagePercentage = Math.round((vendor.active_users / vendor.total_seats) * 100);
                      return (
                        <div key={index} className="bg-background rounded p-3 flex flex-col">
                          <div className="flex justify-between items-start">
                            <span className="font-medium">{vendor.vendor_name}</span>
                            <span className="text-sm">{vendor.active_users} / {vendor.total_seats} users ({usagePercentage}%)</span>
                          </div>
                          <div className="w-full bg-muted h-2 rounded-full mt-2 overflow-hidden">
                            <div
                              className={`h-full ${usagePercentage < 30 ? 'bg-red-500' : usagePercentage < 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${usagePercentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Pagination Controls */}
                    {sortedAndPaginatedVendors.totalItems > 0 && (
                      <div className="flex flex-col gap-2 mt-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">Show:</span>
                            <select
                              className="h-8 px-2 py-1 rounded-md border border-input bg-background text-sm"
                              value={itemsPerPage.toString()}
                              onChange={(e) => {
                                setItemsPerPage(parseInt(e.target.value));
                                setCurrentPage(1); // Reset to first page when changing items per page
                              }}
                            >
                              <option value="5">5</option>
                              <option value="10">10</option>
                              <option value="20">20</option>
                              <option value="50">50</option>
                            </select>
                          </div>
                        </div>

                        {sortedAndPaginatedVendors.totalPages > 1 && (
                          <div className="flex justify-between items-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                            </Button>
                            <span className="text-sm">
                              Page {currentPage} of {sortedAndPaginatedVendors.totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, sortedAndPaginatedVendors.totalPages))}
                              disabled={currentPage === sortedAndPaginatedVendors.totalPages}
                            >
                              Next <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-sm text-muted-foreground text-center mt-2">
                      Showing {sortedAndPaginatedVendors.items.length} of {sortedAndPaginatedVendors.totalItems} vendors
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}