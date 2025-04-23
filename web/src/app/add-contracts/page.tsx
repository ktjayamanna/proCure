"use client";

import { useState, useRef, useCallback } from "react";
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
import { HelpCircle, InfoIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { addContract, Contract } from "@/lib/api/contract-api";

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
  const { user } = useAuth(); // Auth is handled by ProtectedRoute
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileData, setFileData] = useState<any[]>([]);
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
    // Check if all required fields are mapped
    const missingRequiredFields = REQUIRED_FIELDS.filter(
      (field) => !mappings[field.id]
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
      // Process each contract
      for (const contract of processedData) {
        try {
          // Convert the processed data to the format expected by the API
          const contractData: Contract = {
            vendor_name: contract.vendor_name,
            product_url: contract.product_url,
            organization_id: user.organization_id,
            num_seats: parseInt(contract.number_of_seats) || 1,
            annual_spend: parseFloat(parseFloat(contract.annual_spend || "0").toFixed(2)),
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
  }, [fileData, mappings, user?.organization_id]);

  // Reset the form
  const resetForm = () => {
    setFile(null);
    setHeaders([]);
    setMappings({});
    setFileData([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-10 max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Add Contracts</h1>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
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
                          <Label htmlFor={`mapping-${field.id}`}>
                            {field.label} <span className="text-destructive">*</span>
                          </Label>
                          <select
                            id={`mapping-${field.id}`}
                            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            value={mappings[field.id] || ""}
                            onChange={(e) => updateMapping(field.id, e.target.value)}
                          >
                            <option value="">Select a column</option>
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
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button onClick={processData}>
                    Upload Contracts
                  </Button>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="bg-muted/50 p-8 rounded-md text-center">
                <p className="text-muted-foreground">
                  Processing file...
                </p>
                <div className="mt-4 flex justify-center">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
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
