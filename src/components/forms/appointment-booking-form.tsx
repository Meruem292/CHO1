
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { appointmentBookingFormSchema, type AppointmentBookingFormData } from '@/zod-schemas';
import { CheckCircle } from 'lucide-react';

interface AppointmentBookingFormProps {
  onSubmit: (data: AppointmentBookingFormData) => void;
  isLoading: boolean;
  selectedDoctorName?: string;
  selectedDate?: string; // Formatted date string
  selectedTimeSlot?: string; // Formatted time string
}

export function AppointmentBookingForm({
  onSubmit,
  isLoading,
  selectedDoctorName,
  selectedDate,
  selectedTimeSlot,
}: AppointmentBookingFormProps) {
  const form = useForm<AppointmentBookingFormData>({
    resolver: zodResolver(appointmentBookingFormSchema),
    defaultValues: {
      reasonForVisit: '',
    },
  });

  const handleSubmit = (data: AppointmentBookingFormData) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {selectedDoctorName && selectedDate && selectedTimeSlot && (
          <div className="p-4 border rounded-md bg-muted/50 space-y-2">
            <p className="font-medium">Confirm Your Appointment Details:</p>
            <p><strong>Doctor:</strong> {selectedDoctorName}</p>
            <p><strong>Date:</strong> {selectedDate}</p>
            <p><strong>Time:</strong> {selectedTimeSlot}</p>
          </div>
        )}
        <FormField
          control={form.control}
          name="reasonForVisit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason for Visit (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Briefly describe the reason for your appointment..."
                  {...field}
                  rows={3}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            'Booking...'
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" /> Confirm Booking
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
