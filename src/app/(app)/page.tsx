
import { redirect } from 'next/navigation';

export default function AppRootPage() {
  redirect('/dashboard');
  // This component will not render anything as redirect() throws an error.
  // However, to satisfy React's requirement for a return,
  // and in case redirect itself had a different behavior in a future Next.js version (unlikely for this use),
  // we can return null or a basic loader.
  // For a server component using redirect, often nothing after it is executed.
  return null;
}
