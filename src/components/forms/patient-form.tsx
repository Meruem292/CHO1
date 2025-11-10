
'use client';

import React, { useEffect } from 'react';
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
import { patientFormDataSchema, type PatientFormData } from '@/zod-schemas';
import type { Patient } from '@/types';
import { CalendarIcon, Save, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

const PH_TIMEZONE = 'Asia/Manila';

function formatInPHTime_PPP(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return new Intl.DateTimeFormat('en-US', { timeZone: PH_TIMEZONE, year: 'numeric', month: 'short', day: 'numeric' }).format(d);
}

interface PatientFormProps {
  patient?: Patient;
  onSubmit: (data: PatientFormData) => Promise<void>; // Make onSubmit async for parent to handle loading
  onCancel?: () => void;
  isLoading?: boolean; // Prop to indicate if submission is in progress
}

const formStructure = [
  {
    sectionTitle: "Personal Information",
    fields: [
      { name: 'firstName', label: 'First Name', placeholder: 'Juan' },
      { name: 'middleName', label: 'Middle Name (Optional)', placeholder: 'Rizal' },
      { name: 'lastName', label: 'Last Name', placeholder: 'Dela Cruz' },
      { name: 'sex', label: 'Sex', type: 'select', options: [{value: 'male', label: 'Male'}, {value: 'female', label: 'Female'}, {value: 'other', label: 'Other'}], placeholder: 'Select sex' },
      { name: 'civilStatus', label: 'Civil Status (Optional)', placeholder: 'e.g., Single, Married' },
      { name: 'religion', label: 'Religion (Optional)', placeholder: 'e.g., Catholic, Christian' },
      { name: 'ethnicity', label: 'Ethnicity (Optional)', placeholder: 'e.g., Tagalog, Visayan' },
      { name: 'nationality', label: 'Nationality (Optional)', placeholder: 'e.g., Filipino' },
    ]
  },
  {
    sectionTitle: "Contact & Address",
    fields: [
      { name: 'phoneNumber', label: 'Phone Number (Optional)', placeholder: '09xxxxxxxxx' },
      { name: 'email', label: 'Email Address', placeholder: 'juan@example.com' },
      { name: 'municipal', label: 'Municipal (Optional)', placeholder: 'e.g., Alaminos' },
      { name: 'city', label: 'City (Optional)', placeholder: 'e.g., San Pablo' },
    ]
  },
  {
    sectionTitle: "Socio-Economic Information",
    fields: [
      { name: 'highestEducation', label: 'Highest Education Attainment (Optional)', placeholder: 'e.g., College Graduate' },
      { name: 'occupation', label: 'Occupation (Optional)', placeholder: 'e.g., Farmer, Teacher' },
      { name: 'monthlyIncome', label: 'Monthly Income (Optional)', placeholder: 'e.g., 10000' },
    ]
  },
  {
    sectionTitle: "Health Information",
    fields: [
      { name: 'philhealthMember', label: 'PhilHealth Member? (Optional)', type: 'select', options: [{value: 'yes', label: 'Yes'}, {value: 'no', label: 'No'}], placeholder: 'Select status' },
      { name: 'philhealthNumber', label: 'PhilHealth Number (Optional)', placeholder: 'Enter PhilHealth No.' },
      { name: 'healthFacilityMember', label: 'Facility Member? (Optional)', type: 'select', options: [{value: 'yes', label: 'Yes'}, {value: 'no', label: 'No'}], placeholder: 'Select status' },
      { name: 'householdMember', label: 'Household Member? (Optional)', type: 'select', options: [{value: 'yes', label: 'Yes'}, {value: 'no', label: 'No'}], placeholder: 'Select status' },
      { name: 'bloodType', label: 'Blood Type (Optional)', placeholder: 'e.g., O+, A-' },
    ]
  },
  {
    sectionTitle: "Remarks",
    fields: [
      { name: 'remarks', label: 'Remarks (Optional)', type: 'textarea', placeholder: 'Any additional notes...' },
    ]
  }
];

const getInitialFormValues = (patient?: Patient): PatientFormData => {
  return {
    firstName: patient?.firstName || '',
    middleName: patient?.middleName || '',
    lastName: patient?.lastName || '',
    dateOfBirth: patient?.dateOfBirth || '',
    email: patient?.email || '',
    phoneNumber: patient?.phoneNumber || '',
    municipal: patient?.municipal || 'Dasmariñas',
    city: patient?.city || 'Cavite',
    sex: patient?.sex || undefined,
    civilStatus: patient?.civilStatus || '',
    religion: patient?.religion || '',
    ethnicity: patient?.ethnicity || '',
    nationality: patient?.nationality || '',
    highestEducation: patient?.highestEducation || '',
    occupation: patient?.occupation || '',
    monthlyIncome: patient?.monthlyIncome || '',
    philhealthMember: patient?.philhealthMember || undefined,
    philhealthNumber: patient?.philhealthNumber || '',
    healthFacilityMember: patient?.healthFacilityMember || undefined,
    householdMember: patient?.householdMember || undefined,
    bloodType: patient?.bloodType || '',
    remarks: patient?.remarks || '',
  };
};


export function PatientForm({ patient, onSubmit, onCancel, isLoading = false }: PatientFormProps) {
  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientFormDataSchema),
    defaultValues: getInitialFormValues(patient),
  });

  useEffect(() => {
    form.reset(getInitialFormValues(patient));
  }, [patient, form.reset]);

  const handleFormSubmit = async (data: PatientFormData) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Birth</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={isLoading}
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
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {formStructure.map((section, sectionIndex) => (
          <div key={sectionIndex} className="space-y-4">
            <h3 className="text-lg font-medium text-primary">{section.sectionTitle}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
              {section.fields.map((fieldConfig) => (
                <FormField
                  key={fieldConfig.name}
                  control={form.control}
                  name={fieldConfig.name as keyof PatientFormData}
                  render={({ field }) => (
                    <FormItem className={fieldConfig.type === 'textarea' ? 'md:col-span-2 lg:col-span-3' : ''}>
                      <FormLabel>{fieldConfig.label}</FormLabel>
                      {fieldConfig.type === 'select' ? (
                        <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={fieldConfig.placeholder || "Select an option"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {fieldConfig.options?.map(option => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : fieldConfig.type === 'textarea' ? (
                        <FormControl>
                          <Textarea placeholder={fieldConfig.placeholder} {...field} value={field.value || ''} rows={3} disabled={isLoading} />
                        </FormControl>
                      ) : (
                        <FormControl>
                          <Input placeholder={fieldConfig.placeholder} {...field} disabled={isLoading} />
                        </FormControl>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={() => { onCancel(); form.reset(getInitialFormValues(patient));}} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading || !form.formState.isDirty && !!patient}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isLoading ? 'Saving...' : (patient ? 'Update Patient' : 'Save Patient')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
