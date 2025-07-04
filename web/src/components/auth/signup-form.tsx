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
// Card components are imported in the parent component

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

      // Redirect admin users to the usage page, regular users to the dashboard
      if (values.role === "admin") {
        router.push("/usage");
      } else {
        router.push("/dashboard");
      }
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
