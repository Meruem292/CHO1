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
import { Input } from '@/components/ui/input';
import { Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';

const bmiRecordingSchema = z.object({
  weightKg: z.coerce.number().positive({ message: "Weight must be a positive number." }),
  heightM: z.coerce.number().positive({ message: "Height must be a positive number." }),
});

type BmiRecordingFormData = z.infer<typeof bmiRecordingSchema>;

interface BmiRecordingFormProps {
  onSubmit: (data: BmiRecordingFormData) => Promise<void>;
  isLoading: boolean;
}

export function BmiRecordingForm({ onSubmit, isLoading }: BmiRecordingFormProps) {
  const form = useForm<BmiRecordingFormData>({
    resolver: zodResolver(bmiRecordingSchema),
    defaultValues: {
      weightKg: undefined,
      heightM: undefined,
    },
  });

  const handleFormSubmit = async (data: BmiRecordingFormData) => {
    await onSubmit(data);
    form.reset();
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle>Record New Measurement</CardTitle>
            <CardDescription>Enter the patient's current weight and height to add a new entry to their BMI history.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                    control={form.control}
                    name="weightKg"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Weight (kg)</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.1" placeholder="e.g., 65.5" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="heightM"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Height (m)</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.01" placeholder="e.g., 1.75" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                     <div className="sm:pt-8">
                        <Button type="submit" disabled={isLoading || !form.formState.isValid} className="w-full">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {isLoading ? 'Saving...' : 'Save Measurement'}
                        </Button>
                    </div>
                </div>
            </form>
            </Form>
        </CardContent>
    </Card>
  );
}
