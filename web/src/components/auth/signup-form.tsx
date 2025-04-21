"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Form validation schema
const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z
    .string()
    .min(8, {
      message: "Password must be at least 8 characters long.",
    })
    .refine((password) => /[A-Z]/.test(password), {
      message: "Password must contain at least one uppercase letter.",
    })
    .refine((password) => /[a-z]/.test(password), {
      message: "Password must contain at least one lowercase letter.",
    })
    .refine((password) => /[0-9]/.test(password), {
      message: "Password must contain at least one number.",
    }),
  role: z.enum(["member", "admin"], {
    required_error: "Please select a role.",
  }),
});

export default function SignUpForm() {
  const { onSignUp } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [userRole, setUserRole] = useState<"member" | "admin">("member");

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      role: "member",
    },
  });

  // Form submission handler
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);

    try {
      await onSignUp(values.email, values.password, values.role);
      toast.success("Account created successfully!");
      setUserRole(values.role);
      setIsSuccess(true);
      // Don't redirect to dashboard
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to create account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (isSuccess) {
    return userRole === "member" ? (
      <Card className="border-2 border-primary/10 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-xl text-center">You're all set!</CardTitle>
          <CardDescription className="text-center">
            Your account has been created successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <h3 className="font-medium mb-2">Next Steps:</h3>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Close this tab</li>
              <li>
                <a
                  href="https://chrome.google.com/webstore/detail/procure-saas-usage-tracker/placeholder-id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-medium hover:underline"
                >
                  Install the proCure Chrome extension
                </a>
              </li>
              <li>Set it and forget it! The extension will automatically track your SaaS usage.</li>
            </ol>
          </div>
          <div className="text-center">
            <Button
              onClick={() => router.push("/dashboard")}
              variant="outline"
              className="mt-2"
            >
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    ) : (
      <Card className="border-2 border-primary/10 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-xl text-center">Admin Account Created!</CardTitle>
          <CardDescription className="text-center">
            Your admin account has been created successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <h3 className="font-medium mb-2">SaaS Usage Dashboard</h3>
            <div className="p-4 border border-dashed rounded-md bg-muted/50 flex flex-col items-center justify-center min-h-[200px]">
              <p className="text-muted-foreground text-center mb-2">SaaS Usage Graph Coming Soon</p>
              <div className="grid grid-cols-1 gap-2 w-full max-w-md">
                {[
                  { name: "Microsoft 365", users: 145 },
                  { name: "Slack", users: 98 },
                  { name: "Zoom", users: 87 },
                  { name: "Google Workspace", users: 76 },
                  { name: "Salesforce", users: 42 }
                ].map((saas, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-background rounded">
                    <span>{saas.name}</span>
                    <span className="font-medium">{saas.users} users</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="text-center">
            <Button
              onClick={() => router.push("/dashboard")}
              variant="outline"
              className="mt-2"
            >
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder="you@example.com"
                  type="email"
                  autoComplete="email"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  placeholder="••••••••"
                  type="password"
                  autoComplete="new-password"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <FormControl>
                <select
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading}
                  {...field}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground mt-1">Select your role in the organization</p>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Signing up..." : "Sign up"}
        </Button>
      </form>
    </Form>
  );
}
