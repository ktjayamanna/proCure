"use client";

import { useAuth } from "@/lib/auth/auth-context";
import ProtectedRoute from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { getOrganizationName, getContractUsage, ContractUsageData } from "@/lib/api/organization-api";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function UsagePage() {
  const { user, onLogout } = useAuth();
  const router = useRouter();
  const [organization, setOrganization] = useState<{ domain_name: string; company_name?: string } | null>(null);
  const [contractUsage, setContractUsage] = useState<ContractUsageData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleLogout = async () => {
    await onLogout();
    router.push("/login");
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);

  // Calculate usage metrics from contract data
  const { sortedAndPaginatedContracts, usageMetrics } = useMemo(() => {
    // Add usage ratio and sort
    const contractsWithRatio = contractUsage.map(contract => ({
      ...contract,
      usageRatio: contract.active_users / contract.total_seats
    }));

    // Sort by usage ratio (least to most)
    const sorted = [...contractsWithRatio].sort((a, b) => a.usageRatio - b.usageRatio);

    // Calculate total pages
    const totalPages = Math.ceil(sorted.length / itemsPerPage);

    // Get current page items
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = sorted.slice(startIndex, endIndex);

    // Calculate usage metrics
    const totalSpend = contractUsage.reduce((sum, contract) => {
      return sum + contract.annual_spend;
    }, 0);

    const contractCount = contractUsage.length;

    // Calculate average usage percentage across all contracts
    const averageUsagePercentage = contractCount > 0
      ? contractsWithRatio.reduce((sum, contract) => sum + (contract.usageRatio * 100), 0) / contractCount
      : 0;

    // Calculate underutilized percentage as 100 - average usage
    const underutilizedPercentage = Math.round(100 - averageUsagePercentage);

    // Calculate potential savings using the formula: sum(total spending per contract * (1-usage ratio) per contract)
    const potentialSavings = contractsWithRatio.reduce((sum, contract) => {
      // Cap usage ratio at 1.0 to avoid negative savings
      const cappedUsageRatio = Math.min(contract.usageRatio, 1.0);
      return sum + (contract.annual_spend * (1 - cappedUsageRatio));
    }, 0);

    return {
      sortedAndPaginatedContracts: {
        items: paginatedItems,
        totalPages,
        totalItems: sorted.length
      },
      usageMetrics: {
        total_spend: totalSpend,
        contract_count: contractCount,
        underutilized_percentage: underutilizedPercentage,
        potential_savings: potentialSavings
      }
    };
  }, [contractUsage, currentPage, itemsPerPage]);

  useEffect(() => {
    const fetchData = async () => {
      if (user?.organization_id) {
        try {
          setIsLoading(true);
          setError("");

          // Fetch organization name
          const orgData = await getOrganizationName(user.organization_id);
          setOrganization(orgData);

          // Fetch contract usage data
          const usageData = await getContractUsage(user.organization_id);
          setContractUsage(usageData.contracts);
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
          <div className="flex items-center gap-2">
            {user?.role === "admin" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/add-contracts')}
              >
                Add Contracts
              </Button>
            )}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Settings className="h-5 w-5" />
                  <span className="sr-only">Settings</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Account Information</DialogTitle>
                </DialogHeader>
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p>{user?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Role</p>
                    <p>{user?.role || "Member"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Organization</p>
                    <p>
                      {isLoading ? (
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
                  <div className="pt-4 border-t">
                    <Button variant="destructive" onClick={handleLogout} className="w-full">
                      Sign out
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Total Spend */}
          <div className="bg-card p-4 rounded-lg shadow-sm border">
            <div className="text-sm text-muted-foreground">Total Spend</div>
            <div className="text-2xl font-bold mt-1">
              {isLoading ? (
                <span className="text-muted-foreground text-lg">Loading...</span>
              ) : usageMetrics ? (
                new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usageMetrics.total_spend)
              ) : (
                <span className="text-muted-foreground text-lg">N/A</span>
              )}
            </div>
          </div>

          {/* Number of Contracts */}
          <div className="bg-card p-4 rounded-lg shadow-sm border">
            <div className="text-sm text-muted-foreground"># of Contracts</div>
            <div className="text-2xl font-bold mt-1">
              {isLoading ? (
                <span className="text-muted-foreground text-lg">Loading...</span>
              ) : usageMetrics ? (
                usageMetrics.contract_count
              ) : (
                <span className="text-muted-foreground text-lg">N/A</span>
              )}
            </div>
          </div>

          {/* Percentage Underutilized */}
          <div className="bg-card p-4 rounded-lg shadow-sm border">
            <div className="text-sm text-muted-foreground">% Underutilized</div>
            <div className="text-2xl font-bold mt-1">
              {isLoading ? (
                <span className="text-muted-foreground text-lg">Loading...</span>
              ) : usageMetrics ? (
                `${usageMetrics.underutilized_percentage}%`
              ) : (
                <span className="text-muted-foreground text-lg">N/A</span>
              )}
            </div>
          </div>

          {/* Potential Savings */}
          <div className="bg-card p-4 rounded-lg shadow-sm border">
            <div className="text-sm text-muted-foreground">Potential Savings</div>
            <div className="text-2xl font-bold mt-1">
              {isLoading ? (
                <span className="text-muted-foreground text-lg">Loading...</span>
              ) : usageMetrics ? (
                new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usageMetrics.potential_savings)
              ) : (
                <span className="text-muted-foreground text-lg">N/A</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-sm">
          <div className="p-4 border rounded-md">
            <h3 className="font-medium mb-2">
              {organization?.company_name || organization?.domain_name || "Organization"} {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} Software Usage
            </h3>
            <div className="p-4 border border-dashed rounded-md bg-muted/50 flex flex-col items-center justify-center">
              <div className="grid grid-cols-1 gap-4 w-full max-w-md">
                {isLoading ? (
                  <div className="text-center py-4">Loading contract data...</div>
                ) : error ? (
                  <div className="text-center py-4 text-destructive">{error}</div>
                ) : contractUsage.length === 0 ? (
                  <div className="text-center py-4">No contract data available</div>
                ) : (
                  <>
                    <div className="text-sm text-muted-foreground mb-2">
                      Showing contracts sorted by usage ratio (least to most)
                    </div>
                    {sortedAndPaginatedContracts.items.map((contract, index) => {
                      const usagePercentage = Math.round((contract.active_users / contract.total_seats) * 100);
                      return (
                        <div key={index} className="bg-background rounded p-3 flex flex-col">
                          <div className="flex justify-between items-start">
                            <span className="font-medium">{contract.vendor_name}</span>
                            <span className="text-sm">{contract.active_users} / {contract.total_seats} users ({usagePercentage}%)</span>
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
                    {sortedAndPaginatedContracts.totalItems > 0 && (
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

                        {sortedAndPaginatedContracts.totalPages > 1 && (
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
                              Page {currentPage} of {sortedAndPaginatedContracts.totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, sortedAndPaginatedContracts.totalPages))}
                              disabled={currentPage === sortedAndPaginatedContracts.totalPages}
                            >
                              Next <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-sm text-muted-foreground text-center mt-2">
                      Showing {sortedAndPaginatedContracts.items.length} of {sortedAndPaginatedContracts.totalItems} contracts
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