
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { consultationSchema } from '@/zod-schemas';
import type { ConsultationRecord, BabyRecord } from '@/types';
import { CalendarIcon, Save, User, Baby as BabyIcon, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { format, parse, parseISO, isValid } from 'date-fns';
import { useMockDb } from '@/hooks/use-mock-db'; // To fetch babies

const PH_TIMEZONE = 'Asia/Manila';

function formatInPHTime_PPP(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return new Intl.DateTimeFormat('en-US', { timeZone: PH_TIMEZONE, year: 'numeric', month: 'short', day: 'numeric' }).format(d);
}

interface ConsultationFormProps {
  consultation?: Partial<ConsultationRecord>; // Make it partial for new entries
  onSubmit: (data: z.infer<typeof consultationSchema>) => void;
  onCancel?: () => void;
  showSubjectSelection?: boolean;
  motherId?: string; // Required if showSubjectSelection is true
  motherName?: string; // For display
}

export function ConsultationForm({
  consultation,
  onSubmit,
  onCancel,
  showSubjectSelection = false,
  motherId,
  motherName,
}: ConsultationFormProps) {
  const form = useForm<z.infer<typeof consultationSchema>>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      date: consultation?.date || new Date().toISOString().split('T')[0],
      notes: consultation?.notes || '',
      diagnosis: consultation?.diagnosis || '',
      treatmentPlan: consultation?.treatmentPlan || '',
      subjectType: consultation?.subjectType || 'mother',
      babyId: consultation?.babyId || undefined,
      babyName: consultation?.babyName || undefined,
    },
  });

  const { fetchBabyRecordsForMotherOnce } = useMockDb();
  const [babiesList, setBabiesList] = useState<BabyRecord[]>([]);
  const [isLoadingBabies, setIsLoadingBabies] = useState(false);

  const subjectType = form.watch('subjectType');
  const isRespondingToPatient = consultation?.doctorName === 'Patient Entry';

  useEffect(() => {
    if (showSubjectSelection && subjectType === 'baby' && motherId) {
      setIsLoadingBabies(true);
      fetchBabyRecordsForMotherOnce(motherId)
        .then(setBabiesList)
        .catch(console.error)
        .finally(() => setIsLoadingBabies(false));
    } else {
      setBabiesList([]);
    }
  }, [showSubjectSelection, subjectType, motherId, fetchBabyRecordsForMotherOnce]);

  // Reset babyId if subjectType changes from 'baby' to 'mother'
  useEffect(() => {
    if (subjectType === 'mother') {
      form.setValue('babyId', undefined);
      form.setValue('babyName', undefined);
    }
  }, [subjectType, form]);

  useEffect(() => {
    form.reset({
      date: consultation?.date || new Date().toISOString().split('T')[0],
      notes: consultation?.notes || '',
      diagnosis: consultation?.diagnosis || '',
      treatmentPlan: consultation?.treatmentPlan || '',
      subjectType: consultation?.subjectType || 'mother',
      babyId: consultation?.babyId || undefined,
      babyName: consultation?.babyName || undefined,
    });
  }, [consultation, form]);

  const handleSubmit = (data: z.infer<typeof consultationSchema>) => {
    let finalData = { ...data };
    if (data.subjectType === 'baby' && data.babyId) {
      const selectedBaby = babiesList.find(b => b.id === data.babyId);
      finalData.babyName = selectedBaby?.name || 'Selected Baby';
    } else {
      finalData.babyId = undefined;
      finalData.babyName = undefined;
    }
    onSubmit(finalData);
     // Resetting form after submit if it's a new record
    if (!consultation?.id) {
       form.reset({ 
        date: new Date().toISOString().split('T')[0], 
        notes: '', diagnosis: '', 
        treatmentPlan: '',
        subjectType: showSubjectSelection ? 'mother' : undefined,
        babyId: undefined,
        babyName: undefined,
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {showSubjectSelection && motherName && (
          <FormField
            control={form.control}
            name="subjectType"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Consultation For:</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                    disabled={isRespondingToPatient}
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="mother" />
                      </FormControl>
                      <FormLabel className="font-normal flex items-center">
                        <User className="mr-2 h-4 w-4 text-muted-foreground" /> {motherName} (Mother)
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="baby" />
                      </FormControl>
                      <FormLabel className="font-normal flex items-center">
                        <BabyIcon className="mr-2 h-4 w-4 text-muted-foreground" /> A Baby
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {showSubjectSelection && subjectType === 'baby' && (
          <FormField
            control={form.control}
            name="babyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Baby</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingBabies || isRespondingToPatient}>
                  <FormControl>
                    <SelectTrigger>
                      {isLoadingBabies ? (
                        <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading babies...</span>
                      ) : (
                        <SelectValue placeholder="Select the baby" />
                      )}
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {!isLoadingBabies && babiesList.length === 0 && (
                      <SelectItem value="no-babies" disabled>No babies found for this mother.</SelectItem>
                    )}
                    {babiesList.map((baby) => (
                      <SelectItem key={baby.id} value={baby.id}>
                        {baby.name || `Baby (Born: ${formatInPHTime_PPP(baby.birthDate)})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Consultation Date</FormLabel>
               <Popover>
                  <div className="relative flex items-center">
                    <FormControl>
                        <Input
                        placeholder="YYYY-MM-DD"
                        value={field.value ? format(parseISO(field.value), "yyyy-MM-dd") : ""}
                        onChange={(e) => {
                            const date = parse(e.target.value, "yyyy-MM-dd", new Date());
                            if (isValid(date)) {
                            field.onChange(format(date, "yyyy-MM-dd"));
                            } else {
                            field.onChange(e.target.value);
                            }
                        }}
                        disabled={isRespondingToPatient}
                        className="pr-10"
                        />
                    </FormControl>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="absolute right-1 h-8 w-8" disabled={isRespondingToPatient}>
                            <CalendarIcon className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                  </div>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? parseISO(field.value) : undefined}
                    onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : '')}
                    disabled={(date) => date > new Date() || isRespondingToPatient}
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
              <FormLabel>{isRespondingToPatient ? "Concern of the Patient" : "Notes"}</FormLabel>
              <FormControl>
                <Textarea 
                    placeholder={isRespondingToPatient ? "" : "Enter consultation notes"} 
                    {...field} 
                    rows={4}
                    disabled={isRespondingToPatient}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="diagnosis"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Diagnosis</FormLabel>
              <FormControl>
                <Input placeholder="Enter diagnosis" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="treatmentPlan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Treatment Plan</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter treatment plan" {...field} rows={3}/>
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
          <Button type="submit" disabled={showSubjectSelection && subjectType === 'baby' && isLoadingBabies}>
            <Save className="mr-2 h-4 w-4" /> 
            {consultation?.id ? 'Update Consultation' : 'Save Consultation'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

    