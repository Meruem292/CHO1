
'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import type { Appointment, Patient, UserRole, AppointmentStatus, ConsultationRecord } from '@/types';
import { useMockDb } from '@/hooks/use-mock-db';
import { useAuth } from '@/hooks/use-auth-hook';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, ChevronLeft, Loader2, CalendarX2, ShieldAlert, CircleSlash, CheckCircle, CalendarClock, Eye, ClipboardList } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { database } from '@/lib/firebase-config';
import { ref as dbRef, onValue } from 'firebase/database';
import { format, parseISO, isFuture } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConsultationForm } from '@/components/forms/consultation-form';
import { consultationSchema as consultationFormSchemaType } from '@/zod-schemas';
import type * as z from 'zod';

const PH_TIMEZONE = 'Asia/Manila';

function formatInPHTime_Combined(dateString: string | undefined): string {
  if (!dateString) return "Invalid Date";
  try {
    const d = parseISO(dateString);
    const datePart = new Intl.DateTimeFormat('en-US', { timeZone: PH_TIMEZONE, year: 'numeric', month: 'short', day: 'numeric' }).format(d);
    const timePart = new Intl.DateTimeFormat('en-US', { timeZone: PH_TIMEZONE, hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
    return `${datePart} at ${timePart}`;
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return "Invalid Date";
  }
}


interface ResolvedPageParams {
  userId: string;
}

interface UserAppointmentsPageProps {
  params: Promise<ResolvedPageParams>;
}

export default function UserAppointmentsPage({ params: paramsPromise }: UserAppointmentsPageProps) {
  const actualParams = use(paramsPromise);
  const { userId: viewingUserId } = actualParams;

  const { user: currentUser } = useAuth();
  const {
    appointments: userSpecificAppointments,
    appointmentsLoading,
    getAppointmentsByPatientId,
    getAppointmentsByDoctorId,
    updateAppointmentStatus,
    addConsultation,
  } = useMockDb();

  const [viewingUser, setViewingUser] = useState<Patient | undefined>(undefined);
  const [viewingUserLoading, setViewingUserLoading] = useState(true);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  const [isConsultationFormOpen, setIsConsultationFormOpen] = useState(false);
  const [selectedAppointmentForConsultation, setSelectedAppointmentForConsultation] = useState<Appointment | null>(null);

  useEffect(() => {
    if (viewingUserId) {
      setViewingUserLoading(true);
      const userRecordRef = dbRef(database, `patients/${viewingUserId}`);
      const unsubscribeUser = onValue(userRecordRef, (snapshot) => {
        if (snapshot.exists()) {
          setViewingUser({ id: snapshot.key!, ...snapshot.val() } as Patient);
        } else {
          setViewingUser(undefined);
        }
        setViewingUserLoading(false);
      }, (error) => {
        console.error("Error fetching viewing user data:", error);
        setViewingUser(undefined);
        setViewingUserLoading(false);
      });
      return () => unsubscribeUser();
    }
  }, [viewingUserId]);

  useEffect(() => {
    let unsubscribeAppointments: (() => void) | undefined;
    if (viewingUser) {
      if (viewingUser.role === 'patient') {
        unsubscribeAppointments = getAppointmentsByPatientId(viewingUser.id);
      } else if (viewingUser.role === 'doctor') {
        unsubscribeAppointments = getAppointmentsByDoctorId(viewingUser.id);
      }
    }
    return () => {
      if (unsubscribeAppointments) unsubscribeAppointments();
    };
  }, [viewingUser, getAppointmentsByPatientId, getAppointmentsByDoctorId]);

  const canManageThisAppointment = (appointment: Appointment) => {
    if (!currentUser || !appointment) return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'patient' && currentUser.id === appointment.patientId) return true;
    if (currentUser.role === 'doctor' && currentUser.id === appointment.doctorId) return true;
    return false;
  };

  const handleCancelConfirm = async () => {
    if (!appointmentToCancel || !currentUser) return;
    const reason = cancellationReason.trim() || (currentUser.role === 'patient' ? 'Cancelled by patient' : (currentUser.role === 'doctor' ? 'Cancelled by doctor' : 'Cancelled by admin'));
    try {
      const roleSuffix = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
      await updateAppointmentStatus(appointmentToCancel.id, `cancelledBy${roleSuffix}` as AppointmentStatus, currentUser.role, reason);
      toast({ title: "Appointment Cancelled", description: `The appointment for ${appointmentToCancel.patientName} with Dr. ${appointmentToCancel.doctorName} has been cancelled.` });
      setAppointmentToCancel(null);
      setCancellationReason('');
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to cancel appointment." });
    }
  };

  const handleOpenConsultationForm = (appointment: Appointment) => {
    setSelectedAppointmentForConsultation(appointment);
    setIsConsultationFormOpen(true);
  };

  const handleConsultationSubmit = async (data: z.infer<typeof consultationFormSchemaType>) => {
    if (!selectedAppointmentForConsultation || !currentUser || currentUser.role !== 'doctor') {
      toast({ variant: "destructive", title: "Error", description: "Cannot submit consultation. Invalid context." });
      return;
    }

    // Ensure patientId is the mother's ID from the appointment
    const consultationPayload: Omit<ConsultationRecord, 'id'> = {
      ...data, // This now includes subjectType, babyId, babyName if applicable from the form
      patientId: selectedAppointmentForConsultation.patientId,
      // doctorId and doctorName will be set by addConsultation if currentUser is a doctor
    };

    try {
      await addConsultation(consultationPayload);
      await updateAppointmentStatus(selectedAppointmentForConsultation.id, 'completed', currentUser.role);
      const subjectName = data.subjectType === 'baby' && data.babyName ? data.babyName : selectedAppointmentForConsultation.patientName;
      toast({ title: "Consultation Saved & Appointment Completed", description: `Consultation for ${subjectName} has been saved and the appointment marked as completed.` });
      setIsConsultationFormOpen(false);
      setSelectedAppointmentForConsultation(null);
    } catch (error) {
      console.error("Error submitting consultation or updating appointment:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save consultation or update appointment status." });
    }
  };


  const columns: ColumnDef<Appointment>[] = useMemo(() => [
    {
      id: 'dateTime',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Date & Time <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => formatInPHTime_Combined(row.original?.appointmentDateTimeStart),
      accessorFn: (row) => row.original?.appointmentDateTimeStart || '',
      sortingFn: 'datetime',
    },
    ...(viewingUser?.role === 'patient' ? [{
      accessorKey: 'doctorName',
      header: 'Doctor',
      cell: ({ row }: { row: { original?: Appointment } }) => row.original?.doctorName || 'N/A',
    }] : []),
    ...(viewingUser?.role === 'doctor' ? [{
      accessorKey: 'patientName',
      header: 'Patient',
      cell: ({ row }: { row: { original?: Appointment } }) => row.original?.patientName || 'N/A',
    }] : []),
    {
      accessorKey: 'reasonForVisit',
      header: 'Reason',
      cell: ({ row }) => <p className="truncate max-w-xs">{row.original?.reasonForVisit || 'N/A'}</p>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original?.status;
        if (!status) return 'N/A';
        let icon = <CalendarClock className="mr-2 h-4 w-4 text-blue-500" />;
        if (status === 'completed') icon = <CheckCircle className="mr-2 h-4 w-4 text-green-500" />;
        else if (status.startsWith('cancelled')) icon = <CircleSlash className="mr-2 h-4 w-4 text-red-500" />;
         return <span className={`flex items-center px-2 py-1 text-xs font-medium rounded-full bg-opacity-20 ${
            status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
            status === 'completed' ? 'bg-green-100 text-green-700' :
            status.startsWith('cancelled') ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
        }`}>{icon}{status.charAt(0).toUpperCase() + status.slice(1).replace(/([A-Z])/g, ' $1')}</span>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      }
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const appointment = row.original;
        if (!appointment || !appointment.appointmentDateTimeStart) {
          return null;
        }
        
        const showCancelButton = canManageThisAppointment(appointment) && appointment.status === 'scheduled' && isFuture(parseISO(appointment.appointmentDateTimeStart));
        const showViewPatientRecordsButton = (currentUser?.role === 'admin' || (currentUser?.role === 'doctor' && currentUser.id === viewingUserId)) && viewingUser?.role === 'doctor' && appointment.patientId;
        // Show Start Consultation button if current user is the doctor for this appointment AND status is 'scheduled' (future or past)
        // (Can add consultation for past scheduled appointments that were missed)
        const showStartConsultationButton = currentUser?.role === 'doctor' && currentUser.id === appointment.doctorId && appointment.status === 'scheduled';


        return (
          <div className="flex space-x-2">
            {showViewPatientRecordsButton && (
              <Link href={`/patients/${appointment.patientId}/profile`}>
                <Button variant="outline" size="sm">
                  <Eye className="mr-2 h-4 w-4" /> Patient Records
                </Button>
              </Link>
            )}
            {showStartConsultationButton && (
              <Button variant="default" size="sm" onClick={() => handleOpenConsultationForm(appointment)}>
                <ClipboardList className="mr-2 h-4 w-4" /> Start Consultation
              </Button>
            )}
            {showCancelButton && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive/90 border-destructive/50 hover:border-destructive/90" onClick={() => setAppointmentToCancel(appointment)}>
                    <CalendarX2 className="mr-2 h-4 w-4" /> Cancel
                  </Button>
                </AlertDialogTrigger>
              </AlertDialog>
            )}
          </div>
        );
      },
    },
  ], [viewingUser?.role, currentUser, viewingUserId, addConsultation, updateAppointmentStatus]);

  if (viewingUserLoading || (viewingUser && appointmentsLoading && userSpecificAppointments.length === 0 && !viewingUser)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading appointments...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertTitle>Access Denied</AlertTitle><AlertDescription>You must be logged in.</AlertDescription></Alert>
        <Link href="/login" className="text-primary hover:underline">Go to Login</Link>
      </div>
    );
  }

  if (!viewingUser) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard" className="flex items-center text-sm text-primary hover:underline mb-4"><ChevronLeft className="h-4 w-4 mr-1" />Back to Dashboard</Link>
        <Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertTitle>User Not Found</AlertTitle><AlertDescription>User with ID '{viewingUserId}' not found.</AlertDescription></Alert>
      </div>
    );
  }

  if (currentUser.role !== 'admin' && currentUser.id !== viewingUserId) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard" className="flex items-center text-sm text-primary hover:underline mb-4"><ChevronLeft className="h-4 w-4 mr-1" />Back to Dashboard</Link>
        <Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertTitle>Access Denied</AlertTitle><AlertDescription>You cannot view these appointments.</AlertDescription></Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="flex items-center text-sm text-primary hover:underline mb-4">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">
          {currentUser.id === viewingUserId ? "My Appointments" : `Appointments for ${viewingUser.name}`}
          {viewingUser.role === 'doctor' && currentUser.id !== viewingUserId && " (Doctor)"}
          {viewingUser.role === 'patient' && currentUser.id !== viewingUserId && " (Patient)"}
        </h1>
      </div>

      {appointmentsLoading && userSpecificAppointments.length === 0 ? (
         <div className="flex items-center justify-center h-40"> <Loader2 className="h-6 w-6 animate-spin text-primary" /> <p className="ml-2">Loading appointments...</p></div>
      ) :userSpecificAppointments.length === 0 ? (
        <Alert>
          <CalendarClock className="h-4 w-4" />
          <AlertTitle>No Appointments</AlertTitle>
          <AlertDescription>
            There are no appointments to display for {viewingUser.name}.
            {viewingUser.role === 'patient' && viewingUserId === currentUser.id && (
              <span> You can <Link href="/patient/book-appointment" className="text-primary hover:underline font-medium">book a new one</Link>.</span>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          data={userSpecificAppointments}
          filterColumnId="status"
          filterPlaceholder="Filter by status, patient, doctor..."
        />
      )}

      {appointmentToCancel && (
        <AlertDialog open={!!appointmentToCancel} onOpenChange={(open) => { if(!open) {setAppointmentToCancel(null); setCancellationReason('');} }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
              <AlertDialogDescription>
                Cancel appointment for {appointmentToCancel.patientName} with Dr. {appointmentToCancel.doctorName} on {formatInPHTime_Combined(appointmentToCancel.appointmentDateTimeStart)}?
                { currentUser.role !== 'patient' && <span className="block mt-2">Please provide a reason for cancellation.</span>}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="cancellationReason" className="mb-2 block">Reason for Cancellation</Label>
              <Input
                id="cancellationReason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder={currentUser.role === 'patient' ? "Optional reason" : "Reason (e.g., Doctor unavailable)"}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {setAppointmentToCancel(null); setCancellationReason('');}}>Keep Appointment</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancelConfirm} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Confirm Cancellation</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {selectedAppointmentForConsultation && (
        <Dialog open={isConsultationFormOpen} onOpenChange={(open) => { if(!open) { setIsConsultationFormOpen(false); setSelectedAppointmentForConsultation(null);}}}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Consultation for {selectedAppointmentForConsultation.patientName}</DialogTitle>
                    <DialogDescription>
                        Fill in the details for the consultation. Saving this will mark the appointment as completed.
                    </DialogDescription>
                </DialogHeader>
                <ConsultationForm
                    onSubmit={handleConsultationSubmit}
                    onCancel={() => { setIsConsultationFormOpen(false); setSelectedAppointmentForConsultation(null);}}
                    showSubjectSelection={true}
                    motherId={selectedAppointmentForConsultation.patientId}
                    motherName={selectedAppointmentForConsultation.patientName}
                />
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

