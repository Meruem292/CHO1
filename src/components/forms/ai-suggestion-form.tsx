'use client';

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
import { Textarea } from '@/components/ui/textarea';
import { aiSuggestionSchema } from '@/zod-schemas';
import { Sparkles } from 'lucide-react';

interface AiSuggestionFormProps {
  onSubmit: (data: z.infer<typeof aiSuggestionSchema>) => void;
  isLoading: boolean;
}

export function AiSuggestionForm({ onSubmit, isLoading }: AiSuggestionFormProps) {
  const form = useForm<z.infer<typeof aiSuggestionSchema>>({
    resolver: zodResolver(aiSuggestionSchema),
    defaultValues: {
      motherConsultationRecords: '',
      maternityHistory: '',
      babyHealthRecords: '',
    },
  });

  const handleSubmit = (data: z.infer<typeof aiSuggestionSchema>) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="motherConsultationRecords"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mother's Consultation Records</FormLabel>
              <FormControl>
                <Textarea placeholder="Summarize mother's consultation records..." {...field} rows={5} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="maternityHistory"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maternity History</FormLabel>
              <FormControl>
                <Textarea placeholder="Detail mother's maternity history..." {...field} rows={5} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="babyHealthRecords"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Baby's Health Records</FormLabel>
              <FormControl>
                <Textarea placeholder="Summarize baby's health records..." {...field} rows={5} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Generating...' : <><Sparkles className="mr-2 h-4 w-4" /> Get Suggestions</>}
        </Button>
      </form>
    </Form>
  );
}
