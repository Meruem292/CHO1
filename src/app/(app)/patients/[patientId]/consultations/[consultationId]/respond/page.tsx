
'use client';

import React, { useState, useEffect, use } from 'react';
import type { ConsultationRecord } from '@/types';
import { useMockDb } from '@/hooks/use-mock-db';
import { useAuth } from '@/hooks/use-auth-hook';
import { ConsultationForm } from '@/components/forms/consultation-form';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { database } from '@/lib/firebase-config';
import { ref as dbRef, onValue } from 'firebase/database';
import { useRouter } from 'next/navigation';

interface ResolvedPageParams {
  patientId: string;
  consultationId: string;
}

interface RespondToConsultationPageProps {
  params: Promise<ResolvedPageParams>;
}

export default function RespondToConsultationPage({ params: paramsPromise }: RespondToConsultationPageProps) {
  const actualParams = use(paramsPromise);
  const { patientId, consultationId } = actualParams;
  const router = useRouter();

  const { user } = useAuth();
  const { updateConsultation } = useMockDb();

  const [consultation, setConsultation] = useState<ConsultationRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!consultationId) {
      setIsLoading(false);
      return;
    }
    const consultationRef = dbRef(database, `consultations/${consultationId}`);
    const unsubscribe = onValue(consultationRef, (snapshot) => {
      if (snapshot.exists() && snapshot.val().patientId === patientId) {
        setConsultation({ id: snapshot.key!, ...snapshot.val() });
      } else {
        setConsultation(null);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching consultation:", error);
      setConsultation(null);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [consultationId, patientId]);

  const handleResponseSubmit = async (data: Omit<ConsultationRecord, 'id' | 'patientId'>) => {
    if (!consultation || !user || user.role !== 'doctor') {
      toast({ variant: 'destructive', title: 'Permission Denied', description: 'You cannot respond to this consultation.' });
      return;
    }

    const updates = {
      ...data, // Contains diagnosis and treatmentPlan
      // Ensure doctor attribution is updated
      doctorId: user.id,
      doctorName: user.name,
    };
    
    try {
      await updateConsultation(consultation.id, updates);
      toast({ title: "Response Submitted", description: `Your response for ${consultation.patientName} has been saved.` });
      router.push(`/patients/${patientId}/consultations`);
    } catch (error) {
      console.error("Error submitting response:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save response." });
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading consultation...</p>
      </div>
    );
  }

  if (!consultation || user?.role !== 'doctor') {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied or Not Found</AlertTitle>
          <AlertDescription>
            The consultation could not be found, or you do not have permission to respond to it.
          </AlertDescription>
        </Alert>
        <Link href={`/patients/${patientId}/consultations`} passHref>
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Consultations</Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
       <Link href={`/patients/${patientId}/consultations`} className="flex items-center text-sm text-primary hover:underline mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Consultation History
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Respond to Consultation</CardTitle>
          <CardDescription>
            Review the patient's concern and provide your diagnosis and treatment plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConsultationForm
            consultation={consultation}
            onSubmit={handleResponseSubmit}
            onCancel={() => router.push(`/patients/${patientId}/consultations`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
