
'use client';

import React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doctorScheduleSchema, type DoctorScheduleFormData } from '@/zod-schemas';
import type { WorkingDay, DayOfWeek, DoctorSchedule } from '@/types';
import { ALL_DAYS_OF_WEEK } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Save, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface DoctorScheduleFormProps {
  doctorId: string;
  currentSchedule?: DoctorSchedule | null; // From Firebase, could be null if not set
  onSubmit: (data: DoctorScheduleFormData) => Promise<void>;
  isLoading: boolean;
}

const getDefaultWorkingHours = (): WorkingDay[] => {
  return ALL_DAYS_OF_WEEK.map(day => ({
    dayOfWeek: day,
    isEnabled: false,
    startTime: '09:00',
    endTime: '17:00',
    breakTimes: [],
  }));
};

export function DoctorScheduleForm({ doctorId, currentSchedule, onSubmit, isLoading }: DoctorScheduleFormProps) {
  const form = useForm<DoctorScheduleFormData>({
    resolver: zodResolver(doctorScheduleSchema),
    defaultValues: {
      doctorId: doctorId,
      workingHours: currentSchedule?.workingHours && currentSchedule.workingHours.length === 7 
                      ? currentSchedule.workingHours 
                      : getDefaultWorkingHours(),
      defaultSlotDurationMinutes: currentSchedule?.defaultSlotDurationMinutes || 30,
      noticePeriodHours: currentSchedule?.noticePeriodHours || 24,
      unavailableDates: currentSchedule?.unavailableDates || [],
    },
  });

  const { fields, update } = useFieldArray({
    control: form.control,
    name: "workingHours",
  });

  // Ensure fields are initialized if defaultValues were late
  React.useEffect(() => {
    if (fields.length === 0 && form.getValues('workingHours').length > 0) {
      form.reset({ // Resets the entire form
        doctorId: doctorId,
        workingHours: form.getValues('workingHours'),
        defaultSlotDurationMinutes: form.getValues('defaultSlotDurationMinutes'),
        noticePeriodHours: form.getValues('noticePeriodHours'),
        unavailableDates: form.getValues('unavailableDates'),
      });
    }
  }, [fields.length, form, doctorId]);
  

  const handleFormSubmit = async (data: DoctorScheduleFormData) => {
    await onSubmit(data);
  };
  
  const overallFormError = form.formState.errors.workingHours?.root?.message;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Default Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="defaultSlotDurationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Appointment Slot Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 30" {...field} onChange={e => {
                        const value = parseInt(e.target.value, 10);
                        field.onChange(isNaN(value) ? undefined : value);
                      }} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="noticePeriodHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Booking Notice Period (hours, optional)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 24" {...field} onChange={e => {
                        const value = parseInt(e.target.value, 10);
                        field.onChange(isNaN(value) ? undefined : value);
                      }} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Working Hours</CardTitle>
            <CardDescription>Define your standard weekly availability.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-3 p-4 border rounded-md shadow-sm bg-muted/20">
                <div className="flex items-center space-x-3">
                  <Controller
                    name={`workingHours.${index}.isEnabled`}
                    control={form.control}
                    render={({ field: checkboxField }) => (
                      <Checkbox
                        id={`workingHours.${index}.isEnabled`}
                        checked={checkboxField.value}
                        onCheckedChange={checkboxField.onChange}
                      />
                    )}
                  />
                  <Label htmlFor={`workingHours.${index}.isEnabled`} className="text-lg font-semibold text-primary">
                    {form.watch(`workingHours.${index}.dayOfWeek`)}
                  </Label>
                </div>

                {form.watch(`workingHours.${index}.isEnabled`) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-7">
                    <FormField
                      control={form.control}
                      name={`workingHours.${index}.startTime`}
                      render={({ field: timeField }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...timeField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`workingHours.${index}.endTime`}
                      render={({ field: timeField }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...timeField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                <FormMessage>{form.formState.errors.workingHours?.[index]?.startTime?.message}</FormMessage>
                <FormMessage>{form.formState.errors.workingHours?.[index]?.endTime?.message}</FormMessage>
                <FormMessage>{form.formState.errors.workingHours?.[index]?.dayOfWeek?.message}</FormMessage>
                 { index < fields.length -1 && <Separator className="mt-4"/>}
              </div>
            ))}
             {overallFormError && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Form Error</AlertTitle>
                <AlertDescription>{overallFormError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Placeholder for Unavailable Dates and Custom Slots - to be added later */}
        {/* 
        <Card>
          <CardHeader><CardTitle>Unavailable Dates & Custom Slots</CardTitle></CardHeader>
          <CardContent>...</CardContent>
        </Card>
        */}

        <Button type="submit" disabled={isLoading} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? 'Saving Schedule...' : 'Save Schedule'}
        </Button>
      </form>
    </Form>
  );
}
