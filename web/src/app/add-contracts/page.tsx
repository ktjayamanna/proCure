"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import ProtectedRoute from "@/components/auth/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { HelpCircle, InfoIcon, Settings } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { addContract, Contract } from "@/lib/api/contract-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getOrganizationName } from "@/lib/api/organization-api";
import { fetchVendorUrls } from "@/lib/api/vendor-api";

// Define the required and optional fields for contracts
const REQUIRED_FIELDS = [
  { id: "vendor_name", label: "Vendor Name" },
  { id: "product_url", label: "Product URL" },
  { id: "number_of_seats", label: "Number of Seats" },
  { id: "annual_spend", label: "Annual Spend" },
];

const OPTIONAL_FIELDS = [
  { id: "contract_type", label: "Contract Type" },
  { id: "contract_status", label: "Contract Status" },
  { id: "payment_type", label: "Payment Type" },
  { id: "owner", label: "Owner" },
  { id: "expire_at", label: "Expire At" },
  { id: "created_at", label: "Created At" },
  { id: "notes", label: "Notes" }

];

// Contract type options
const CONTRACT_TYPES = [
  "month to month",
  "year to year",
  "subscription",
  "other",
];

// Contract status options
const CONTRACT_STATUSES = ["active", "inactive"];

// Payment type options
const PAYMENT_TYPES = [
  "ach transfer",
  "international wire",
  "credit card payment",
  "other",
];

export default function AddContractsPage() {
  const { user, onLogout } = useAuth(); // Auth is handled by ProtectedRoute
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [organization, setOrganization] = useState<{ domain_name: string; company_name?: string } | null>(null);
  const [isLoadingOrg, setIsLoadingOrg] = useState<boolean>(false);
  const [orgError, setOrgError] = useState<string>("");

  const handleLogout = async () => {
    await onLogout();
    router.push("/login");
  };

  useEffect(() => {
    const fetchOrgName = async () => {
      if (user?.organization_id) {
        try {
          setIsLoadingOrg(true);
          setOrgError("");
          const orgData = await getOrganizationName(user.organization_id);
          setOrganization(orgData);
        } catch (err) {
          console.error("Error fetching organization name:", err);
          setOrgError("Could not load organization name");
        } finally {
          setIsLoadingOrg(false);
        }
      }
    };

    fetchOrgName();
  }, [user?.organization_id]);

  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileData, setFileData] = useState<any[]>([]);
  const [useAIForProductUrl, setUseAIForProductUrl] = useState(false);
  const [useDefaultNumSeats, setUseDefaultNumSeats] = useState(false);
  const [useDefaultAnnualSpend, setUseDefaultAnnualSpend] = useState(false);
  const [isLoadingUrls, setIsLoadingUrls] = useState(false);
  // Field info is now shown in a Sheet modal instead of a collapsible section

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    parseFile(selectedFile);
  };

  // Parse the uploaded file to extract headers
  const parseFile = (file: File) => {
    setIsProcessing(true);

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data.length > 0) {
            const headers = Object.keys(results.data[0] as object);
            setHeaders(headers);
            setFileData(results.data);
          } else {
            toast.error("No data found in the CSV file");
          }
          setIsProcessing(false);
        },
        error: (error) => {
          toast.error(`Error parsing CSV: ${error.message}`);
          setIsProcessing(false);
        }
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (jsonData.length > 1) { // At least header row and one data row
            const headers = jsonData[0] as string[];

            // Convert the data to the format we need (array of objects with header keys)
            const formattedData = [];
            for (let i = 1; i < jsonData.length; i++) {
              const row = jsonData[i] as any[];
              const rowData: Record<string, any> = {};

              headers.forEach((header, index) => {
                rowData[header] = row[index] || '';
              });

              formattedData.push(rowData);
            }

            setHeaders(headers);
            setFileData(formattedData);
          } else {
            toast.error("No data found in the Excel file");
          }
        } catch (error) {
          toast.error(`Error parsing Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        setIsProcessing(false);
      };
      reader.onerror = () => {
        toast.error("Error reading file");
        setIsProcessing(false);
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error("Unsupported file format. Please upload a CSV or Excel file.");
      setIsProcessing(false);
    }
  };

  // Update the mapping for a field
  const updateMapping = (fieldId: string, headerValue: string) => {
    setMappings((prev) => ({
      ...prev,
      [fieldId]: headerValue,
    }));
  };

  // Process the mapped data
  const processData = useCallback(async () => {
    // Check if all required fields are mapped, with special handling for fields with default values
    const missingRequiredFields = REQUIRED_FIELDS.filter(
      (field) => {
        // Skip validation for fields with default values enabled
        if (field.id === "product_url" && useAIForProductUrl) {
          return false;
        }
        if (field.id === "number_of_seats" && useDefaultNumSeats) {
          return false;
        }
        if (field.id === "annual_spend" && useDefaultAnnualSpend) {
          return false;
        }
        return !mappings[field.id];
      }
    );

    if (missingRequiredFields.length > 0) {
      toast.error(
        `Please map all required fields: ${missingRequiredFields
          .map((f) => f.label)
          .join(", ")}`
      );
      return;
    }

    if (!user?.organization_id) {
      toast.error("Organization ID not found. Please log in again.");
      return;
    }

    // Process the data based on mappings
    const processedData = fileData.map((row) => {
      const processedRow: Record<string, any> = {};

      // Process required fields
      REQUIRED_FIELDS.forEach((field) => {
        const headerKey = mappings[field.id];
        processedRow[field.id] = row[headerKey] || "";
      });

      // Process optional fields
      OPTIONAL_FIELDS.forEach((field) => {
        const headerKey = mappings[field.id];
        if (headerKey) {
          processedRow[field.id] = row[headerKey] || null;
        } else {
          processedRow[field.id] = null;
        }
      });

      return processedRow;
    });

    // Set processing state
    setIsProcessing(true);

    // Track success and failures
    let successCount = 0;
    let failureCount = 0;

    try {
      // If AI option is selected for product URLs, fetch them first
      let vendorUrls: Record<string, string> = {};

      if (useAIForProductUrl) {
        setIsLoadingUrls(true);
        try {
          // Extract all vendor names
          const vendorNames = processedData.map(contract => contract.vendor_name);

          // Call the API route to get URLs via OpenAI
          const result = await fetchVendorUrls(vendorNames);

          // Create a mapping of vendor name to URL
          if (result && result.urls && result.urls.length === vendorNames.length) {
            vendorNames.forEach((name, index) => {
              vendorUrls[name] = result.urls[index];
            });
          } else {
            // If the API doesn't return enough URLs, show an error and stop processing
            throw new Error("AI couldn't generate URLs for all vendors. Please try again.");
          }
        } catch (error) {
          console.error("Error fetching vendor URLs with AI:", error);
          toast.error(`Error generating URLs with AI: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or uncheck the 'Populate with AI' option.`);
          setIsLoadingUrls(false);
          // Return early to prevent processing with incomplete data
          return;
        }
        setIsLoadingUrls(false);
      }

      // Process each contract
      for (const contract of processedData) {
        try {
          // Convert the processed data to the format expected by the API
          const contractData: Contract = {
            vendor_name: contract.vendor_name,
            // Use AI-generated URL if AI option is selected, otherwise use mapped value
            product_url: useAIForProductUrl
              ? vendorUrls[contract.vendor_name] // No fallback - we've already validated all URLs exist
              : contract.product_url,
            organization_id: user.organization_id,
            // Use default value of 1 if checkbox is checked, otherwise parse from input
            num_seats: useDefaultNumSeats
              ? 1
              : parseInt(contract.number_of_seats) || 1,
            // Use default value of 0 if checkbox is checked, otherwise parse from input
            annual_spend: useDefaultAnnualSpend
              ? 0
              : parseFloat(parseFloat(contract.annual_spend || "0").toFixed(2)),
            contract_type: contract.contract_type,
            contract_status: contract.contract_status,
            payment_type: contract.payment_type,
            notes: contract.notes
          };

          // Format date fields if they exist
          if (contract.expire_at) {
            try {
              // Parse the date and convert to ISO format
              const expireDate = new Date(contract.expire_at);
              if (!isNaN(expireDate.getTime())) {
                contractData.expire_at = expireDate.toISOString();
              }
            } catch (error) {
              console.warn("Invalid expire_at date format:", contract.expire_at);
            }
          }

          if (contract.created_at) {
            try {
              // Parse the date and convert to ISO format
              const createdDate = new Date(contract.created_at);
              if (!isNaN(createdDate.getTime())) {
                contractData.created_at = createdDate.toISOString();
              }
            } catch (error) {
              console.warn("Invalid created_at date format:", contract.created_at);
            }
          }

          // Call the API to add the contract
          const result = await addContract(contractData);

          if (result.success) {
            successCount++;
          } else {
            failureCount++;
          }
        } catch (error) {
          console.error("Error adding contract:", error);
          failureCount++;
        }
      }

      // Show success message
      if (successCount > 0 && failureCount === 0) {
        toast.success(`Successfully added ${successCount} contracts`);
      } else if (successCount > 0 && failureCount > 0) {
        toast.warning(`Added ${successCount} contracts, but ${failureCount} failed`);
      } else {
        toast.error(`Failed to add any contracts`);
      }
    } catch (error) {
      console.error("Error processing contracts:", error);
      toast.error(`Error processing contracts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);

      // Reset the form
      setFile(null);
      setHeaders([]);
      setMappings({});
      setFileData([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [fileData, mappings, user?.organization_id, useAIForProductUrl, useDefaultNumSeats, useDefaultAnnualSpend]);

  // Reset the form
  const resetForm = () => {
    setFile(null);
    setHeaders([]);
    setMappings({});
    setFileData([]);
    setUseAIForProductUrl(false);
    setUseDefaultNumSeats(false);
    setUseDefaultAnnualSpend(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-10 max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Add Contracts</h1>
          <div className="flex items-center gap-2">
            {user?.role === "admin" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/usage')}
              >
                View SaaS Usage
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
                      {isLoadingOrg ? (
                        <span className="text-muted-foreground italic">Loading...</span>
                      ) : orgError ? (
                        <span className="text-destructive">{orgError}</span>
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

        <Card>
          <CardHeader>
            <CardTitle>Upload Contracts CSV/Excel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Upload CSV or Excel File</Label>
              <Input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                disabled={isProcessing}
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <p>
                  Upload a CSV or Excel file containing contract information
                </p>
                <a
                  href="/sample-contracts.csv"
                  download
                  className="text-primary hover:underline"
                >
                  Download Sample Template
                </a>
              </div>
            </div>

            {headers.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Map Columns</h3>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <HelpCircle size={16} />
                        Need Help?
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>Field Information</SheetTitle>
                      </SheetHeader>
                      <div className="space-y-4 mt-6">
                        <div>
                          <h3 className="font-medium mb-2">Required Fields</h3>
                          <ul className="list-disc pl-5 space-y-2">
                            <li><span className="font-medium">Vendor Name:</span> Name of the vendor/company</li>
                            <li><span className="font-medium">Product URL:</span> URL of the product/service
                              <ul className="list-none pl-4 pt-1 space-y-1">
                                <li><span className="text-blue-600 font-mono px-1 py-0.5 bg-blue-50 rounded border border-blue-200">https://app.slack.com</span></li>
                                <li><span className="text-blue-600 font-mono px-1 py-0.5 bg-blue-50 rounded border border-blue-200">https://github.com</span></li>
                                <li><span className="text-blue-600 font-mono px-1 py-0.5 bg-blue-50 rounded border border-blue-200">https://aws.amazon.com</span></li>
                              </ul>
                            </li>
                            <li><span className="font-medium">Number of Seats:</span> Number of licenses/seats</li>
                            <li><span className="font-medium">Annual Spend:</span> Annual cost of the contract in dollars (e.g., 1000.00)</li>
                          </ul>
                        </div>

                        <div>
                          <h3 className="font-medium mb-2">Optional Fields</h3>
                          <ul className="list-disc pl-5 space-y-2">
                            <li><span className="font-medium">Owner:</span> Person responsible for the contract</li>
                            <li><span className="font-medium">Expire At:</span> Contract expiration date</li>
                            <li><span className="font-medium">Created At:</span> Contract creation date</li>
                            <li><span className="font-medium">Notes:</span> Additional information about the contract</li>

                            <li>
                              <span className="font-medium">Contract Type:</span> Type of contract
                              <ul className="list-disc pl-5 mt-1">
                                {CONTRACT_TYPES.map((type) => (
                                  <li key={type} className="text-sm text-muted-foreground">{type}</li>
                                ))}
                              </ul>
                            </li>
                            <li>
                              <span className="font-medium">Contract Status:</span> Current status
                              <ul className="list-disc pl-5 mt-1">
                                {CONTRACT_STATUSES.map((status) => (
                                  <li key={status} className="text-sm text-muted-foreground">{status}</li>
                                ))}
                              </ul>
                            </li>
                            <li>
                              <span className="font-medium">Payment Type:</span> Method of payment
                              <ul className="list-disc pl-5 mt-1">
                                {PAYMENT_TYPES.map((type) => (
                                  <li key={type} className="text-sm text-muted-foreground">{type}</li>
                                ))}
                              </ul>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Match the columns from your file to the required fields
                </p>

                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-2">Required Fields</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {REQUIRED_FIELDS.map((field) => (
                        <div key={field.id} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label htmlFor={`mapping-${field.id}`}>
                              {field.label} <span className="text-destructive">*</span>
                            </Label>
                            {field.id === "product_url" && (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id="use-ai-for-product-url"
                                  checked={useAIForProductUrl}
                                  onChange={(e) => setUseAIForProductUrl(e.target.checked)}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <Label htmlFor="use-ai-for-product-url" className="text-sm font-normal">
                                  Populate with AI
                                </Label>
                              </div>
                            )}
                            {field.id === "number_of_seats" && (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id="use-default-num-seats"
                                  checked={useDefaultNumSeats}
                                  onChange={(e) => setUseDefaultNumSeats(e.target.checked)}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <Label htmlFor="use-default-num-seats" className="text-sm font-normal">
                                  Default to 1
                                </Label>
                              </div>
                            )}
                            {field.id === "annual_spend" && (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id="use-default-annual-spend"
                                  checked={useDefaultAnnualSpend}
                                  onChange={(e) => setUseDefaultAnnualSpend(e.target.checked)}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <Label htmlFor="use-default-annual-spend" className="text-sm font-normal">
                                  Default to 0
                                </Label>
                              </div>
                            )}
                          </div>
                          <select
                            id={`mapping-${field.id}`}
                            className={`w-full h-9 rounded-md border border-input px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${(field.id === "product_url" && useAIForProductUrl) || (field.id === "number_of_seats" && useDefaultNumSeats) || (field.id === "annual_spend" && useDefaultAnnualSpend) ? "bg-gray-100 text-gray-500" : "bg-transparent"}`}
                            value={mappings[field.id] || ""}
                            onChange={(e) => updateMapping(field.id, e.target.value)}
                            disabled={(field.id === "product_url" && useAIForProductUrl) || (field.id === "number_of_seats" && useDefaultNumSeats) || (field.id === "annual_spend" && useDefaultAnnualSpend)}
                          >
                            <option value="">Select a column</option>
                            {headers.map((header) => (
                              <option key={header} value={header}>
                                {header}
                              </option>
                            ))}
                          </select>
                          {field.id === "product_url" && useAIForProductUrl && (
                            <p className="text-xs text-muted-foreground">Using AI to generate vendor URLs</p>
                          )}
                          {field.id === "number_of_seats" && useDefaultNumSeats && (
                            <p className="text-xs text-muted-foreground">Using default value: 1</p>
                          )}
                          {field.id === "annual_spend" && useDefaultAnnualSpend && (
                            <p className="text-xs text-muted-foreground">Using default value: 0</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Optional Fields</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {OPTIONAL_FIELDS.map((field) => (
                        <div key={field.id} className="space-y-2">
                          <Label htmlFor={`mapping-${field.id}`}>{field.label}</Label>
                          <select
                            id={`mapping-${field.id}`}
                            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            value={mappings[field.id] || ""}
                            onChange={(e) => updateMapping(field.id, e.target.value)}
                          >
                            <option value="">Select a column (optional)</option>
                            {headers.map((header) => (
                              <option key={header} value={header}>
                                {header}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={resetForm} disabled={isProcessing || isLoadingUrls}>
                    Cancel
                  </Button>
                  <Button
                    onClick={processData}
                    disabled={isProcessing || isLoadingUrls}
                    className="min-w-[150px]"
                  >
                    {isLoadingUrls ? (
                      <>
                        <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                        Generating URLs...
                      </>
                    ) : isProcessing ? (
                      <>
                        <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                        Processing...
                      </>
                    ) : (
                      "Upload Contracts"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {!file && !headers.length && !isProcessing && (
              <div className="bg-muted/50 p-8 rounded-md text-center">
                <p className="text-muted-foreground mb-2">
                  Upload a CSV or Excel file to get started
                </p>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-primary flex items-center gap-1 mx-auto"
                    >
                      <InfoIcon size={16} />
                      View required fields and format information
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Field Information</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-4 mt-6">
                      <div>
                        <h3 className="font-medium mb-2">Required Fields</h3>
                        <ul className="list-disc pl-5 space-y-2">
                          <li><span className="font-medium">Vendor Name:</span> Name of the vendor</li>
                          <li><span className="font-medium">Product URL:</span> URL of the product/service
                            <ul className="list-none pl-4 pt-1 space-y-1">
                              <li><span className="text-blue-600 font-mono px-1 py-0.5 bg-blue-50 rounded border border-blue-200">https://app.slack.com</span></li>
                              <li><span className="text-blue-600 font-mono px-1 py-0.5 bg-blue-50 rounded border border-blue-200">https://github.com</span></li>
                              <li><span className="text-blue-600 font-mono px-1 py-0.5 bg-blue-50 rounded border border-blue-200">https://aws.amazon.com</span></li>
                            </ul>
                          </li>
                          <li><span className="font-medium">Number of Seats:</span> Number of licenses</li>
                          <li><span className="font-medium">Annual Spend:</span> Annual cost of the contract in dollars (e.g., 1000.00)</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-medium mb-2">Optional Fields</h3>
                        <ul className="list-disc pl-5 space-y-2">

                          <li>
                            <span className="font-medium">Contract Type:</span> Type of contract
                            <ul className="list-disc pl-5 mt-1">
                              {CONTRACT_TYPES.map((type) => (
                                <li key={type} className="text-sm text-muted-foreground">{type}</li>
                              ))}
                            </ul>
                          </li>
                          <li>
                            <span className="font-medium">Contract Status:</span> Current status
                            <ul className="list-disc pl-5 mt-1">
                              {CONTRACT_STATUSES.map((status) => (
                                <li key={status} className="text-sm text-muted-foreground">{status}</li>
                              ))}
                            </ul>
                          </li>
                          <li>
                            <span className="font-medium">Payment Type:</span> Method of payment
                            <ul className="list-disc pl-5 mt-1">
                              {PAYMENT_TYPES.map((type) => (
                                <li key={type} className="text-sm text-muted-foreground">{type}</li>
                              ))}
                            </ul>
                          </li>
                          <li><span className="font-medium">Owner:</span> Person responsible for the contract</li>
                          <li><span className="font-medium">Expire At:</span> Contract expiration date</li>
                          <li><span className="font-medium">Created At:</span> Contract creation date</li>
                          <li><span className="font-medium">Notes:</span> Additional information</li>
                        </ul>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            )}
          </CardContent>
        </Card>


      </div>
    </ProtectedRoute>
  );
}
