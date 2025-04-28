export const metadata = {
  title: 'Sign In - proCure',
  description: 'Sign in to proCure',
};

import LoginForm from '@/components/auth/login-form';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="container mx-auto py-10 max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold">ProCure</h1>
        <p className="text-muted-foreground mt-2">Sign in to your account</p>
      </div>

      <div className="mb-6">
        <LoginForm />
      </div>

      <div className="text-center text-sm">
        <p>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-primary font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
