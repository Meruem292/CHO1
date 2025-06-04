
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth-hook';
import { Loader2 } from 'lucide-react';

export default function PatientMyAppointmentsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && user.role === 'patient') {
      router.replace(`/users/${user.id}/appointments`);
    } else if (!isLoading && !user) {
      router.replace('/login');
    } else if (!isLoading && user && user.role !== 'patient') {
        router.replace('/dashboard'); // Redirect non-patients to dashboard
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="ml-2">Redirecting to your appointments...</p>
    </div>
  );
}

    