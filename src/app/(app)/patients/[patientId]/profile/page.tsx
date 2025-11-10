
'use client';

import React, { useState, useEffect, use } from 'react';
import type { Patient } from '@/types';
import { useAuth } from '@/hooks/use-auth-hook';
import { useMockDb } from '@/hooks/use-mock-db';
import { database } from '@/lib/firebase-config';
import { ref as dbRef, onValue } from 'firebase/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, User, ShieldAlert, AlertTriangle, Edit, Ruler, Weight, HeartPulse } from 'lucide-react';
import { parseISO } from 'date-fns';
import { PatientForm } from '@/components/forms/patient-form';
import type { PatientFormData } from '@/zod-schemas';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const PH_TIMEZONE = 'Asia/Manila';

function formatInPHTime_PPP(date: Date | string | undefined): string {
  if (!date) return 'N/A';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return new Intl.DateTimeFormat('en-US', { timeZone: PH_TIMEZONE, year: 'numeric', month: 'short', day: 'numeric' }).format(d);
  } catch (e) {
    return 'Invalid Date';
  }
}

interface ResolvedPageParams {
  patientId: string;
}

interface PatientProfilePageProps {
  params: Promise<ResolvedPageParams>;
}

export default function PatientProfilePage({ params: paramsPromise }: PatientProfilePageProps) {
  const actualParams = use(paramsPromise);
  const { patientId } = actualParams;
  const { user } = useAuth();
  const { updatePatient, bmiHistory, getBmiHistoryByPatientId } = useMockDb();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const canEditProfile = user?.role === 'admin' || user?.role === 'doctor' || user?.role === 'midwife/nurse';

  useEffect(() => {
    if (!patientId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setIsEditing(false); // Reset editing state on patient change
    
    const patientRecordRef = dbRef(database, `patients/${patientId}`);
    const unsubscribePatient = onValue(patientRecordRef, (snapshot) => {
      if (snapshot.exists()) {
        setPatient({ id: snapshot.key!, ...snapshot.val() } as Patient);
      } else {
        setPatient(null);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching patient data for profile:", error);
      setPatient(null);
      setIsLoading(false);
    });

    const unsubscribeBmi = getBmiHistoryByPatientId(patientId);
    
    return () => {
      unsubscribePatient();
      unsubscribeBmi();
    }
  }, [patientId, getBmiHistoryByPatientId]);

  const handleUpdatePatient = async (formData: PatientFormData) => {
    if (!patient) return;
    setIsUpdating(true);
    try {
      const name = [formData.firstName, formData.middleName, formData.lastName]
        .filter(Boolean)
        .join(' ');

      const updatesForDb: Partial<Omit<Patient, 'id' | 'role' | 'createdAt' | 'updatedAt'>> = {
        ...formData,
        name,
      };

      await updatePatient(patient.id, updatesForDb);
      toast({ title: "Patient Profile Updated", description: `${name}'s profile has been successfully updated.` });
      setIsEditing(false); // Exit editing mode after successful update
    } catch (error) {
      console.error("Error updating patient profile:", error);
      toast({ variant: "destructive", title: "Update Failed", description: "Could not update patient profile." });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading patient information...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <Alert variant="destructive" className="mt-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Patient Not Found</AlertTitle>
        <AlertDescription>
          The patient profile could not be loaded. The record may not exist.
        </AlertDescription>
      </Alert>
    );
  }

  const InfoItem = ({ label, value }: { label: string; value?: string | number | null }) => (
    value || value === 0 ? (
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-md">{value}</p>
      </div>
    ) : null
  );

  const lastBmiRecord = bmiHistory.length > 0 ? bmiHistory[bmiHistory.length - 1] : null;

  const getBmiCategory = (bmi: number) => {
    if (bmi < 18.5) return { category: 'Underweight', variant: 'destructive' as const };
    if (bmi >= 18.5 && bmi <= 24.9) return { category: 'Normal weight', variant: 'default' as const };
    if (bmi >= 25 && bmi <= 29.9) return { category: 'Overweight', variant: 'secondary' as const };
    return { category: 'Obesity', variant: 'destructive' as const };
  };
  
  const bmiInfo = lastBmiRecord ? getBmiCategory(lastBmiRecord.bmi) : null;


  // Admin/Provider view: Editable form
  if (canEditProfile && isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span><User className="mr-2 h-6 w-6 text-primary inline-block" />Edit Patient Profile: {patient.name}</span>
            <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isUpdating}>
              Cancel Edit
            </Button>
          </CardTitle>
          <CardDescription>Update the details for {patient.name}. Physical measurements are managed on the BMI History page.</CardDescription>
        </CardHeader>
        <CardContent>
          <PatientForm
            patient={patient}
            onSubmit={handleUpdatePatient}
            isLoading={isUpdating}
            onCancel={() => setIsEditing(false)}
            isProviderEditing={user?.role === 'doctor' || user?.role === 'midwife/nurse'}
          />
        </CardContent>
      </Card>
    );
  }

  // Default read-only view for everyone, or provider before clicking "Edit"
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span><User className="mr-2 h-6 w-6 text-primary inline-block" />Patient Profile Details</span>
          {canEditProfile && !isEditing && (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          )}
        </CardTitle>
        <CardDescription>Detailed information for {patient.name}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <InfoItem label="Full Name" value={patient.name} />
          <InfoItem label="Email" value={patient.email} />
          <InfoItem label="Phone Number" value={patient.phoneNumber} />
          <InfoItem label="Date of Birth" value={formatInPHTime_PPP(patient.dateOfBirth)} />
          <InfoItem label="Sex" value={patient.sex} />
          <InfoItem label="Civil Status" value={patient.civilStatus} />
          <InfoItem label="Religion" value={patient.religion} />
          <InfoItem label="Ethnicity" value={patient.ethnicity} />
          <InfoItem label="Nationality" value={patient.nationality} />
          <InfoItem label="City" value={patient.city} />
          <InfoItem label="Province" value={patient.province} />
        </div>
        <Separator />
        <h3 className="text-lg font-medium text-primary">Latest Physical Measurements</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <InfoItem label="Weight" value={lastBmiRecord ? `${lastBmiRecord.weightKg} kg` : 'N/A'} />
          <InfoItem label="Height" value={lastBmiRecord ? `${lastBmiRecord.heightM} m` : 'N/A'} />
          <div>
            <p className="text-sm font-medium text-muted-foreground">BMI</p>
            {lastBmiRecord ? (
              <div className="flex items-center space-x-2">
                <p className="text-md font-semibold">{lastBmiRecord.bmi.toFixed(2)}</p>
                {bmiInfo && <Badge variant={bmiInfo.variant}>{bmiInfo.category}</Badge>}
              </div>
            ) : (
              <p className="text-md">N/A</p>
            )}
          </div>
        </div>
        <Separator />
        <h3 className="text-lg font-medium text-primary">Socio-Economic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <InfoItem label="Highest Education" value={patient.highestEducation} />
          <InfoItem label="Occupation" value={patient.occupation} />
          <InfoItem label="Monthly Income" value={patient.monthlyIncome} />
        </div>
        <Separator />
        <h3 className="text-lg font-medium text-primary">Health & Membership</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <InfoItem label="PhilHealth Member" value={patient.philhealthMember} />
          <InfoItem label="PhilHealth Number" value={patient.philhealthNumber} />
          <InfoItem label="Facility Member" value={patient.healthFacilityMember} />
          <InfoItem label="Household Member" value={patient.householdMember} />
          <InfoItem label="Blood Type" value={patient.bloodType} />
        </div>
        {patient.remarks && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Remarks</p>
              <p className="text-md whitespace-pre-wrap">{patient.remarks}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
