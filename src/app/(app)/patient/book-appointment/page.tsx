
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth-hook';
import { useMockDb } from '@/hooks/use-mock-db';
import Link from 'next/link';
import { ChevronLeft, CalendarPlus, Users, CalendarDays, Clock, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AppointmentBookingForm, type AppointmentBookingFormDataType } from '@/components/forms/appointment-booking-form';
import type { Patient, DoctorSchedule, Appointment, DayOfWeek } from '@/types';
import { toast } from '@/hooks/use-toast';
import { 
  format, 
  parseISO, 
  startOfDay, 
  eachMinuteOfInterval, 
  isFuture, 
  isBefore, 
  isAfter,
  setHours, 
  setMinutes, 
  setSeconds, 
  setMilliseconds, 
  addMinutes as addMinutesFn, 
  isEqual,
  endOfDay as dateFnsEndOfDay 
} from 'date-fns';

const PH_TIMEZONE = 'Asia/Manila';

// Helper to format a Date object or UTC string into a specific format for PH_TIMEZONE
function formatInPHTime(date: Date | string, formatToken: 'p' | 'PPP' | 'yyyy-MM-dd' | 'EEEE'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (formatToken === 'p') { // e.g., 10:00 AM
    return new Intl.DateTimeFormat('en-US', { timeZone: PH_TIMEZONE, hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
  }
  if (formatToken === 'PPP') { // e.g., Jul 15, 2024
     return new Intl.DateTimeFormat('en-US', { timeZone: PH_TIMEZONE, year: 'numeric', month: 'short', day: 'numeric' }).format(d);
  }
  if (formatToken === 'yyyy-MM-dd') { // e.g., 2024-07-15
    const year = new Intl.DateTimeFormat('en-US', { timeZone: PH_TIMEZONE, year: 'numeric' }).format(d);
    const month = new Intl.DateTimeFormat('en-US', { timeZone: PH_TIMEZONE, month: '2-digit' }).format(d);
    const day = new Intl.DateTimeFormat('en-US', { timeZone: PH_TIMEZONE, day: '2-digit' }).format(d);
    return `${year}-${month}-${day}`;
  }
  if (formatToken === 'EEEE') { // e.g., Monday
    return new Intl.DateTimeFormat('en-US', { timeZone: PH_TIMEZONE, weekday: 'long' }).format(d);
  }
  return format(d, formatToken); // Fallback, though should not be reached with defined tokens
}

// Helper to convert a Date object (representing Manila local time components) to its UTC equivalent Date object
function convertManilaDateToUtcDate(manilaDate: Date): Date {
  const year = manilaDate.getFullYear();
  const month = String(manilaDate.getMonth() + 1).padStart(2, '0');
  const day = String(manilaDate.getDate()).padStart(2, '0');
  const hour = String(manilaDate.getHours()).padStart(2, '0');
  const minute = String(manilaDate.getMinutes()).padStart(2, '0');
  const second = String(manilaDate.getSeconds()).padStart(2, '0');
  
  // Manila is UTC+08:00 and does not observe DST.
  const isoStringWithPhOffset = `${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`;
  return new Date(isoStringWithPhOffset);
}


export default function PatientBookAppointmentPage() {
  const { user } = useAuth();
  const {
    patients,
    patientsLoading,
    getDoctorScheduleById,
    doctorSchedule,
    doctorScheduleLoading,
    getAppointmentsByDoctorIdForBooking,
    doctorAppointmentsForBooking,
    doctorAppointmentsLoading,
    addAppointment,
  } = useMockDb();

  const [doctors, setDoctors] = useState<Patient[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined); // This date is UTC start of day
  const [availableSlots, setAvailableSlots] = useState<Date[]>([]); // These slots are Date objects representing Manila time
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<Date | null>(null); // This is a Date object representing Manila time
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientsLoading) {
      setDoctors(patients.filter(p => p.role === 'doctor'));
    }
  }, [patients, patientsLoading]);

  useEffect(() => {
    let unsubscribeSchedule: (() => void) | undefined;
    if (selectedDoctorId) {
      unsubscribeSchedule = getDoctorScheduleById(selectedDoctorId);
    }
    return () => {
      if (unsubscribeSchedule) unsubscribeSchedule();
    };
  }, [selectedDoctorId, getDoctorScheduleById]);

  useEffect(() => {
    let unsubscribeAppointments: (() => void) | undefined;
    if (selectedDoctorId) {
      unsubscribeAppointments = getAppointmentsByDoctorIdForBooking(selectedDoctorId);
    }
    return () => {
      if (unsubscribeAppointments) unsubscribeAppointments();
    };
  }, [selectedDoctorId, getAppointmentsByDoctorIdForBooking]);

  const calculateAvailableSlots = useCallback(() => {
    if (!selectedDoctorId || !doctorSchedule || !selectedDate || doctorAppointmentsLoading) {
      setAvailableSlots([]);
      return;
    }
    setIsLoadingSlots(true);

    const slots: Date[] = [];
    const dayOfWeekInManila = formatInPHTime(selectedDate, 'EEEE') as DayOfWeek;
    const workingDayInfo = doctorSchedule.workingHours.find(wh => wh.dayOfWeek === dayOfWeekInManila);

    if (!workingDayInfo || !workingDayInfo.isEnabled || !workingDayInfo.startTime || !workingDayInfo.endTime) {
      setAvailableSlots([]);
      setIsLoadingSlots(false);
      return;
    }

    const slotDuration = doctorSchedule.defaultSlotDurationMinutes;
    const noticePeriodBoundary = doctorSchedule.noticePeriodHours
      ? addMinutesFn(new Date(), doctorSchedule.noticePeriodHours * 60) // This is a UTC Date
      : new Date(0); // A very past date if no notice period, meaning all future slots are fine

    // Construct day start/end times using Manila date components for the selected UTC date
    const selectedDateManilaStr = formatInPHTime(selectedDate, 'yyyy-MM-dd');
    const selectedDateInManilaYear = parseInt(selectedDateManilaStr.substring(0,4));
    const selectedDateInManilaMonth = parseInt(selectedDateManilaStr.substring(5,7)) -1; 
    const selectedDateInManilaDay = parseInt(selectedDateManilaStr.substring(8,10));

    const dayStartManila = setMilliseconds(setSeconds(setMinutes(setHours(new Date(selectedDateInManilaYear, selectedDateInManilaMonth, selectedDateInManilaDay), parseInt(workingDayInfo.startTime.split(':')[0])), parseInt(workingDayInfo.startTime.split(':')[1])), 0), 0);
    const dayEndManila = setMilliseconds(setSeconds(setMinutes(setHours(new Date(selectedDateInManilaYear, selectedDateInManilaMonth, selectedDateInManilaDay), parseInt(workingDayInfo.endTime.split(':')[0])), parseInt(workingDayInfo.endTime.split(':')[1])), 0), 0);
    
    const potentialSlots = eachMinuteOfInterval(
      { start: dayStartManila, end: addMinutesFn(dayEndManila, -slotDuration) }, // Ensure last slot can complete within working hours
      { step: slotDuration }
    );
    
    const existingAppointmentsOnDate = doctorAppointmentsForBooking.filter(app => {
      const appDateInManila = formatInPHTime(parseISO(app.appointmentDateTimeStart), 'yyyy-MM-dd');
      return appDateInManila === selectedDateManilaStr && app.status === 'scheduled';
    });
    
    const isUnavailableDate = doctorSchedule.unavailableDates?.some(
      unavailableDateStr => unavailableDateStr === selectedDateManilaStr
    );

    if (isUnavailableDate) {
      setAvailableSlots([]);
      setIsLoadingSlots(false);
      return;
    }

    potentialSlots.forEach(slotStartManila => { // slotStartManila is a Date object representing Manila local time
      const slotEndManila = addMinutesFn(slotStartManila, slotDuration);

      // Convert slotStartManila to its true UTC value for notice period comparison
      const slotStartManilaAsUtc = convertManilaDateToUtcDate(slotStartManila);
      
      if (!isFuture(slotStartManilaAsUtc) || isBefore(slotStartManilaAsUtc, noticePeriodBoundary)) {
        return; // Slot is in the past or within notice period
      }

      // Ensure slot is within doctor's working hours for the day
      // isBefore and isAfter are strict. For start times, isEqual or isAfter. For end times, isEqual or isBefore.
      // However, since potentialSlots are generated from dayStartManila to dayEndManila - slotDuration, they should inherently be within.
      // This is an extra check.
      if (isBefore(slotStartManila, dayStartManila) || isAfter(slotEndManila, dayEndManila)) {
          return; 
      }
      
      const conflict = existingAppointmentsOnDate.some(existingApp => {
        const existingAppStartUTC = parseISO(existingApp.appointmentDateTimeStart);
        const existingAppEndUTC = parseISO(existingApp.appointmentDateTimeEnd);

        // Create Date objects representing Manila wall-clock time for the existing appointment
        // This is more robust than new Date(date.toLocaleString('en-US', {timeZone: PH_TIMEZONE}))
        const yS = parseInt(new Intl.DateTimeFormat('en-US', {timeZone: PH_TIMEZONE, year: 'numeric'}).format(existingAppStartUTC));
        const mS = parseInt(new Intl.DateTimeFormat('en-US', {timeZone: PH_TIMEZONE, month: '2-digit'}).format(existingAppStartUTC)) -1;
        const dS = parseInt(new Intl.DateTimeFormat('en-US', {timeZone: PH_TIMEZONE, day: '2-digit'}).format(existingAppStartUTC));
        const hS = parseInt(new Intl.DateTimeFormat('en-US', {timeZone: PH_TIMEZONE, hour: '2-digit', hour12: false}).format(existingAppStartUTC));
        const minS = parseInt(new Intl.DateTimeFormat('en-US', {timeZone: PH_TIMEZONE, minute: '2-digit'}).format(existingAppStartUTC));
        const existingStartManilaWallClock = new Date(yS, mS, dS, hS, minS);

        const yE = parseInt(new Intl.DateTimeFormat('en-US', {timeZone: PH_TIMEZONE, year: 'numeric'}).format(existingAppEndUTC));
        const mE = parseInt(new Intl.DateTimeFormat('en-US', {timeZone: PH_TIMEZONE, month: '2-digit'}).format(existingAppEndUTC)) -1;
        const dE = parseInt(new Intl.DateTimeFormat('en-US', {timeZone: PH_TIMEZONE, day: '2-digit'}).format(existingAppEndUTC));
        const hE = parseInt(new Intl.DateTimeFormat('en-US', {timeZone: PH_TIMEZONE, hour: '2-digit', hour12: false}).format(existingAppEndUTC));
        const minE = parseInt(new Intl.DateTimeFormat('en-US', {timeZone: PH_TIMEZONE, minute: '2-digit'}).format(existingAppEndUTC));
        const existingEndManilaWallClock = new Date(yE, mE, dE, hE, minE);
        
        // Check for overlap: new slot [slotStartManila, slotEndManila) vs existing [existingStartManilaWallClock, existingEndManilaWallClock)
        // Overlap if max(start_new, start_existing) < min(end_new, end_existing)
        return Math.max(slotStartManila.getTime(), existingStartManilaWallClock.getTime()) < Math.min(slotEndManila.getTime(), existingEndManilaWallClock.getTime());
      });

      if (!conflict) {
        slots.push(slotStartManila); // Store Date objects representing Manila time
      }
    });

    setAvailableSlots(slots);
    setIsLoadingSlots(false);
  }, [selectedDoctorId, doctorSchedule, selectedDate, doctorAppointmentsForBooking, doctorAppointmentsLoading]);

  useEffect(() => {
    calculateAvailableSlots();
  }, [selectedDate, doctorSchedule, doctorAppointmentsForBooking, calculateAvailableSlots]); // Added doctorAppointmentsLoading to re-calc when they load


  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const todayUTCStartOfDay = startOfDay(new Date()); 
      if (isBefore(date, todayUTCStartOfDay)) { 
         toast({ variant: "destructive", title: "Invalid Date", description: "Please select a future date." });
         setSelectedDate(undefined);
      } else {
        setSelectedDate(date); // Store as UTC start of day
        setSelectedTimeSlot(null); 
      }
    } else {
      setSelectedDate(undefined);
      setSelectedTimeSlot(null);
    }
  };

  const handleBookingSubmit = async (formData: AppointmentBookingFormDataType) => {
    if (!user || !selectedDoctorId || !selectedDate || !selectedTimeSlot || !doctorSchedule) {
      setBookingError("Missing required information. Please select doctor, date, and time.");
      return;
    }
    setIsBooking(true);
    setBookingError(null);

    const slotStartUTC = convertManilaDateToUtcDate(selectedTimeSlot);
    const slotEndUTC = convertManilaDateToUtcDate(addMinutesFn(selectedTimeSlot, doctorSchedule.defaultSlotDurationMinutes));

    const newAppointment: Omit<Appointment, 'id' | 'patientName' | 'doctorName' | 'createdAt' | 'updatedAt'> = {
      patientId: user.id,
      doctorId: selectedDoctorId,
      appointmentDateTimeStart: slotStartUTC.toISOString(),
      appointmentDateTimeEnd: slotEndUTC.toISOString(),
      durationMinutes: doctorSchedule.defaultSlotDurationMinutes,
      status: 'scheduled',
      reasonForVisit: formData.reasonForVisit || '',
    };

    try {
      await addAppointment(newAppointment);
      toast({
        title: "Appointment Booked!",
        description: `Your appointment with Dr. ${doctors.find(d => d.id === selectedDoctorId)?.name || 'Doctor'} on ${formatInPHTime(selectedDate, 'PPP')} at ${formatInPHTime(selectedTimeSlot, 'p')} is confirmed.`,
        variant: 'default',
      });
      // Reset selection after successful booking
      setSelectedDoctorId(null); 
      setSelectedDate(undefined);
      setSelectedTimeSlot(null);
      setAvailableSlots([]);
    } catch (error) {
      console.error("Error booking appointment:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not book appointment. Please try again.";
      setBookingError(errorMessage);
      toast({ variant: "destructive", title: "Booking Failed", description: errorMessage });
    } finally {
      setIsBooking(false);
    }
  };

  if (!user || user.role !== 'patient') {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>This page is for patients only.</AlertDescription>
        </Alert>
        <Link href="/dashboard" className="text-primary hover:underline">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  const selectedDoctorDetails = useMemo(() => {
    return doctors.find(d => d.id === selectedDoctorId);
  }, [doctors, selectedDoctorId]);

  return (
    <div className="space-y-8">
      <Link href="/dashboard" className="flex items-center text-sm text-primary hover:underline mb-4">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <CalendarPlus className="mr-3 h-8 w-8 text-primary" /> Book an Appointment
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-primary" />Select a Doctor</CardTitle>
        </CardHeader>
        <CardContent>
          {patientsLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : doctors.length === 0 ? (
            <p>No doctors available for booking at the moment.</p>
          ) : (
            <Select 
              onValueChange={(value) => {
                setSelectedDoctorId(value);
                setSelectedDate(undefined); // Reset date when doctor changes
                setSelectedTimeSlot(null);
                setAvailableSlots([]);
              }} 
              value={selectedDoctorId || ""}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map(doc => (
                  <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedDoctorId && (doctorScheduleLoading || doctorAppointmentsLoading) && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="ml-2">Loading doctor's availability...</p>
        </div>
      )}

      {selectedDoctorId && !doctorScheduleLoading && !doctorSchedule && !doctorAppointmentsLoading && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Doctor Unavailable</AlertTitle>
          <AlertDescription>
            This doctor has not set up their schedule yet or is currently unavailable for booking.
            Please select another doctor or check back later.
          </AlertDescription>
        </Alert>
      )}

      {selectedDoctorId && !doctorScheduleLoading && doctorSchedule && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><CalendarDays className="mr-2 h-5 w-5 text-primary" />Select a Date</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) => {
                  if (isBefore(date, startOfDay(new Date()))) return true; // Disable past dates
                  const dayOfWeekInManila = formatInPHTime(date, 'EEEE') as DayOfWeek;
                  const workingDay = doctorSchedule.workingHours.find(wh => wh.dayOfWeek === dayOfWeekInManila);
                  if (!workingDay || !workingDay.isEnabled) return true; // Disable if not a working day
                  // Disable if it's an unavailable date for the doctor (in Manila time)
                  return doctorSchedule.unavailableDates?.some(udStr => udStr === formatInPHTime(date, 'yyyy-MM-dd')) || false;
                }}
                initialFocus
              />
            </CardContent>
          </Card>

          {selectedDate && (isLoadingSlots || doctorAppointmentsLoading) && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-2">Checking available slots...</p>
            </div>
          )}

          {selectedDate && !isLoadingSlots && !doctorAppointmentsLoading && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><Clock className="mr-2 h-5 w-5 text-primary" />Select a Time Slot</CardTitle>
                <CardDescription>
                  Showing available slots for {formatInPHTime(selectedDate, 'PPP')} with Dr. {selectedDoctorDetails?.name}.
                  Appointments are approximately {doctorSchedule.defaultSlotDurationMinutes} minutes. Timezone: Asia/Manila.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {availableSlots.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {availableSlots.map(slot => ( // slot is a Date object representing Manila time
                      <Button
                        key={slot.toISOString()} // Ensure key is unique
                        variant={selectedTimeSlot && isEqual(slot, selectedTimeSlot) ? 'default' : 'outline'}
                        onClick={() => setSelectedTimeSlot(slot)}
                        className="w-full"
                      >
                        {formatInPHTime(slot, 'p')}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <Alert>
                     <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No Slots Available</AlertTitle>
                    <AlertDescription>
                      There are no available slots for this doctor on the selected date. Please try another date or doctor.
                      This could be due to the doctor's schedule, existing bookings, or the notice period for new appointments.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {selectedTimeSlot && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><CheckCircle className="mr-2 h-5 w-5 text-green-500" />Confirm Your Booking</CardTitle>
              </CardHeader>
              <CardContent>
                {bookingError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Booking Error</AlertTitle>
                    <AlertDescription>{bookingError}</AlertDescription>
                  </Alert>
                )}
                <AppointmentBookingForm
                  onSubmit={handleBookingSubmit}
                  isLoading={isBooking}
                  selectedDoctorName={selectedDoctorDetails?.name}
                  selectedDate={selectedDate ? formatInPHTime(selectedDate, 'PPP') : undefined}
                  selectedTimeSlot={selectedTimeSlot ? formatInPHTime(selectedTimeSlot, 'p') : undefined}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

