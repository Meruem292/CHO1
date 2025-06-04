
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
import { addDays, format, parseISO, startOfDay, eachMinuteOfInterval, isFuture, isBefore, getDay, setHours, setMinutes, setSeconds, setMilliseconds, addMinutes as addMinutesFn, isEqual, endOfDay as dateFnsEndOfDay, isAfter } from 'date-fns';
import { toZonedTime, zonedTimeToUtc, formatInTimeZone } from 'date-fns-tz';

const PH_TIMEZONE = 'Asia/Manila';

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableSlots, setAvailableSlots] = useState<Date[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<Date | null>(null);
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
    const dayOfWeek = format(selectedDate, 'EEEE') as DayOfWeek;
    const workingDayInfo = doctorSchedule.workingHours.find(wh => wh.dayOfWeek === dayOfWeek);

    if (!workingDayInfo || !workingDayInfo.isEnabled || !workingDayInfo.startTime || !workingDayInfo.endTime) {
      setAvailableSlots([]);
      setIsLoadingSlots(false);
      return;
    }

    const slotDuration = doctorSchedule.defaultSlotDurationMinutes;
    const noticePeriodDate = doctorSchedule.noticePeriodHours
      ? addMinutesFn(new Date(), doctorSchedule.noticePeriodHours * 60)
      : new Date();

    const dayStartInPH = setMilliseconds(setSeconds(setMinutes(setHours(startOfDay(selectedDate), parseInt(workingDayInfo.startTime.split(':')[0])), parseInt(workingDayInfo.startTime.split(':')[1])), 0), 0);
    const dayEndInPH = setMilliseconds(setSeconds(setMinutes(setHours(startOfDay(selectedDate), parseInt(workingDayInfo.endTime.split(':')[0])), parseInt(workingDayInfo.endTime.split(':')[1])), 0), 0);
    
    const potentialSlots = eachMinuteOfInterval(
      { start: dayStartInPH, end: addMinutesFn(dayEndInPH, -slotDuration) },
      { step: slotDuration }
    );

    const existingAppointmentsOnDate = doctorAppointmentsForBooking.filter(app => {
      const appDatePH = toZonedTime(parseISO(app.appointmentDateTimeStart), PH_TIMEZONE);
      return format(appDatePH, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') && app.status === 'scheduled';
    });
    
    const isUnavailableDate = doctorSchedule.unavailableDates?.some(
      unavailableDateStr => format(parseISO(unavailableDateStr), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
    );

    if (isUnavailableDate) {
      setAvailableSlots([]);
      setIsLoadingSlots(false);
      return;
    }

    potentialSlots.forEach(slotStartPH => {
      const slotEndPH = addMinutesFn(slotStartPH, slotDuration);

      if (!isFuture(slotStartPH) || isBefore(slotStartPH, noticePeriodDate)) {
        return;
      }

      if (isBefore(slotStartPH, dayStartInPH) || isAfter(slotEndPH, dayEndInPH)) {
        return;
      }
      
      const conflict = existingAppointmentsOnDate.some(existingApp => {
        const existingStartPH = toZonedTime(parseISO(existingApp.appointmentDateTimeStart), PH_TIMEZONE);
        const existingEndPH = toZonedTime(parseISO(existingApp.appointmentDateTimeEnd), PH_TIMEZONE);
        return (isBefore(slotStartPH, existingEndPH) && isAfter(slotEndPH, existingStartPH)) || isEqual(slotStartPH, existingStartPH);
      });

      if (!conflict) {
        slots.push(slotStartPH);
      }
    });

    setAvailableSlots(slots);
    setIsLoadingSlots(false);
  }, [selectedDoctorId, doctorSchedule, selectedDate, doctorAppointmentsForBooking, doctorAppointmentsLoading]);

  useEffect(() => {
    calculateAvailableSlots();
  }, [selectedDate, doctorSchedule, doctorAppointmentsForBooking, calculateAvailableSlots]);


  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const today = startOfDay(new Date());
      if (isBefore(date, today)) {
         toast({ variant: "destructive", title: "Invalid Date", description: "Please select a future date." });
         setSelectedDate(undefined);
      } else {
        setSelectedDate(startOfDay(date));
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

    const slotStartUTC = zonedTimeToUtc(selectedTimeSlot, PH_TIMEZONE);
    const slotEndUTC = zonedTimeToUtc(addMinutesFn(selectedTimeSlot, doctorSchedule.defaultSlotDurationMinutes), PH_TIMEZONE);

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
        description: `Your appointment with Dr. ${doctors.find(d => d.id === selectedDoctorId)?.name || 'Doctor'} on ${format(selectedDate, 'PPP')} at ${formatInTimeZone(selectedTimeSlot, PH_TIMEZONE, 'p')} is confirmed.`,
        variant: 'default',
      });
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
            <Select onValueChange={setSelectedDoctorId} value={selectedDoctorId || undefined}>
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

      {selectedDoctorId && !doctorScheduleLoading && !doctorSchedule && (
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
                disabled={(date) => isBefore(date, startOfDay(new Date())) || !doctorSchedule.workingHours.find(wh => wh.dayOfWeek === format(date, 'EEEE') as DayOfWeek && wh.isEnabled) || (doctorSchedule.unavailableDates?.some(ud => format(parseISO(ud), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')) || false)}
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
                  Showing available slots for {format(selectedDate, 'PPP')} with Dr. {selectedDoctorDetails?.name}.
                  Appointments are approximately {doctorSchedule.defaultSlotDurationMinutes} minutes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {availableSlots.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {availableSlots.map(slot => (
                      <Button
                        key={slot.toISOString()}
                        variant={selectedTimeSlot && isEqual(slot, selectedTimeSlot) ? 'default' : 'outline'}
                        onClick={() => setSelectedTimeSlot(slot)}
                        className="w-full"
                      >
                        {formatInTimeZone(slot, PH_TIMEZONE, 'p')}
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
                  selectedDate={selectedDate ? format(selectedDate, 'PPP') : undefined}
                  selectedTimeSlot={selectedTimeSlot ? formatInTimeZone(selectedTimeSlot, PH_TIMEZONE, 'p') : undefined}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
    

    