'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { parseFile, SaaSPurchaseRow } from '@/lib/csv-parser';
import { addSaaSPurchases } from '@/lib/api';
import { toast } from 'sonner';

export function CSVUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [organizationId, setOrganizationId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<SaaSPurchaseRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    
    try {
      const result = await parseFile(selectedFile);
      
      if (result.errors.length > 0) {
        toast.error('Error parsing file', {
          description: result.errors[0],
          duration: 5000,
        });
      }
      
      setParsedData(result.data);
      
      if (result.data.length > 0) {
        toast.info(`Successfully parsed ${result.data.length} rows`);
      }
    } catch (error) {
      toast.error('Error reading file', {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Please select a file');
      return;
    }
    
    if (!organizationId) {
      toast.error('Please enter an organization ID');
      return;
    }
    
    if (parsedData.length === 0) {
      toast.error('No valid data found in the file');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await addSaaSPurchases({
        organizationId,
        purchases: parsedData,
      });
      
      if (response.success) {
        toast.success('SaaS purchases added successfully', {
          description: `Processed ${response.processed} entries`,
        });
        
        // Reset form
        setFile(null);
        setOrganizationId('');
        setParsedData([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        toast.error('Failed to add SaaS purchases', {
          description: response.message,
        });
      }
    } catch (error) {
      toast.error('Error submitting data', {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload SaaS Purchases</CardTitle>
        <CardDescription>
          Upload a CSV or Excel file containing SaaS purchase data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="file">CSV/Excel File</Label>
            <Input
              ref={fileInputRef}
              id="file"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              File should contain columns: saas_name, url, owner_email
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="organizationId">Organization ID</Label>
            <Input
              id="organizationId"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              placeholder="Enter organization ID"
              disabled={isLoading}
            />
          </div>
          
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                <p className="text-sm font-medium">
                  {parsedData.length} rows parsed successfully
                </p>
                <ul className="text-xs space-y-1 mt-2">
                  {parsedData.slice(0, 5).map((row, index) => (
                    <li key={index} className="text-muted-foreground">
                      {row.saas_name} ({row.url}) - {row.owner_email}
                    </li>
                  ))}
                  {parsedData.length > 5 && (
                    <li className="text-muted-foreground">
                      ...and {parsedData.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Upload and Process'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between text-xs text-muted-foreground">
        <p>All data will be added to the purchased_saas table</p>
      </CardFooter>
    </Card>
  );
}
