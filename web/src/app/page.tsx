import { redirect } from 'next/navigation';

export default function Home() {
  // We'll redirect to login page by default
  // The login page will redirect to dashboard if user is already logged in
  redirect('/login');
  return null;
}
