import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">proCure SaaS Management</CardTitle>
          <CardDescription>
            Manage your organization's SaaS purchases and track usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Use the tools below to manage your SaaS purchases and track usage across your organization.
            </p>
            <div className="grid gap-4 mt-4">
              <Link href="/add-saas-purchase" passHref>
                <Button className="w-full">Add SaaS Purchases via CSV/Excel</Button>
              </Link>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <p className="text-xs text-muted-foreground">proCure LLC © {new Date().getFullYear()}</p>
        </CardFooter>
      </Card>
    </div>
  );
}
