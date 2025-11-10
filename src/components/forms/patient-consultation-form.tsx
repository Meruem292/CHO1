
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
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
import { CalendarIcon, Save } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

const PH_TIMEZONE = 'Asia/Manila';

function formatInPHTime_PPP(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return new Intl.DateTimeFormat('en-US', { timeZone: PH_TIMEZONE, year: 'numeric', month: 'short', day: 'numeric' }).format(d);
}

// A simpler schema for patient-submitted notes
const patientConsultationSchema = z.object({
  date: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }),
  notes: z.string().min(10, { message: "Please describe your symptoms or concern in at least 10 characters." }),
});

type PatientConsultationFormData = z.infer<typeof patientConsultationSchema>;

interface PatientConsultationFormProps {
  onSubmit: (data: PatientConsultationFormData) => void;
  onCancel?: () => void;
}

export function PatientConsultationForm({ onSubmit, onCancel }: PatientConsultationFormProps) {
  const form = useForm<PatientConsultationFormData>({
    resolver: zodResolver(patientConsultationSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  const handleSubmit = (data: PatientConsultationFormData) => {
    onSubmit(data);
    form.reset(); 
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Concern</FormLabel>
               <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        formatInPHTime_PPP(field.value)
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? parseISO(field.value) : undefined}
                    onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : '')}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>My Patient Concern</FormLabel>
              <FormControl>
                <Textarea placeholder="Please describe how you're feeling, your symptoms, or any health concerns you have..." {...field} rows={6}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" /> 
            Save Notes
          </Button>
        </div>
      </form>
    </Form>
  );
}
