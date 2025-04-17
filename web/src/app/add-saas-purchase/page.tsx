import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CSVUploadForm } from '@/components/csv-upload-form';

export const metadata = {
  title: 'Add SaaS Purchases - proCure',
  description: 'Upload SaaS purchase data via CSV/Excel',
};

export default function AddSaaSPurchasePage() {
  return (
    <div className="container mx-auto py-10 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Add SaaS Purchases</h1>
        <Link href="/" passHref>
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
      
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          Upload a CSV or Excel file to add multiple SaaS purchases at once. The file should contain the following columns:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 ml-4">
          <li><strong>saas_name</strong>: Name of the SaaS product</li>
          <li><strong>url</strong>: URL of the SaaS product</li>
          <li><strong>owner_email</strong>: Email of the employee who owns this SaaS</li>
        </ul>
      </div>
      
      <div className="mb-6">
        <CSVUploadForm />
      </div>
      
      <div className="bg-muted p-4 rounded-md">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium">Example CSV Format</h3>
          <a 
            href="/sample-saas-purchases.csv" 
            download
            className="text-xs text-primary hover:underline"
          >
            Download Sample CSV
          </a>
        </div>
        <pre className="text-xs overflow-x-auto p-2 bg-muted-foreground/10 rounded">
          saas_name,url,owner_email{'\n'}
          Google Workspace,https://mail.google.com,john.doe@example.com{'\n'}
          Microsoft 365,https://outlook.office.com,jane.smith@example.com{'\n'}
          Slack,https://app.slack.com,team.lead@example.com
        </pre>
      </div>
    </div>
  );
}
