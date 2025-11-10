
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth-hook';
import { Loader2 } from 'lucide-react';

export default function DoctorMyAppointmentsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && (user.role === 'doctor' || user.role === 'midwife/nurse')) {
      router.replace(`/users/${user.id}/appointments`);
    } else if (!isLoading && !user) {
      router.replace('/login');
    } else if (!isLoading && user && user.role !== 'doctor' && user.role !== 'midwife/nurse') {
        router.replace('/dashboard'); // Redirect other roles to dashboard
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="ml-2">Redirecting to your appointments...</p>
    </div>
  );
}
