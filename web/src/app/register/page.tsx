export const metadata = {
  title: 'Sign Up - proCure',
  description: 'Sign up for proCure',
};

import RegisterForm from '@/components/auth/register-form';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="container mx-auto py-10 max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold">Sign Up</h1>
        <p className="text-muted-foreground mt-2">Enter your details to create a new account</p>
      </div>

      <div className="mb-6">
        <RegisterForm />
      </div>

      <div className="text-center text-sm">
        <p>
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
