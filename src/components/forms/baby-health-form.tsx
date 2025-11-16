
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
import { Input } from '@/components/ui/input';
import { babyHealthSchema } from '@/zod-schemas';
import type { BabyRecord } from '@/types';
import { CalendarIcon, Save } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format, parse, parseISO, isValid } from 'date-fns';

const PH_TIMEZONE = 'Asia/Manila';

function formatInPHTime_PPP(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return new Intl.DateTimeFormat('en-US', { timeZone: PH_TIMEZONE, year: 'numeric', month: 'short', day: 'numeric' }).format(d);
}

interface BabyHealthFormProps {
  record?: BabyRecord;
  onSubmit: (data: Omit<z.infer<typeof babyHealthSchema>, 'id' | 'motherId'>) => void;
  onCancel?: () => void;
}

export function BabyHealthForm({ record, onSubmit, onCancel }: BabyHealthFormProps) {
  const form = useForm<z.infer<typeof babyHealthSchema>>({
    resolver: zodResolver(babyHealthSchema),
    defaultValues: record || {
      name: '',
      birthDate: '',
      birthWeight: '',
      birthLength: '',
      apgarScore: '',
    },
  });

  const handleSubmit = (data: z.infer<typeof babyHealthSchema>) => {
    onSubmit(data);
    form.reset(); 
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Baby's Name (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Enter baby's name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="birthDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Birth Date</FormLabel>
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
                        className="pr-10"
                        />
                    </FormControl>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="absolute right-1 h-8 w-8">
                            <CalendarIcon className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                </div>
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
          name="birthWeight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Birth Weight (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 3.5kg" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="birthLength"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Birth Length (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 50cm" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="apgarScore"
          render={({ field }) => (
            <FormItem>
              <FormLabel>APGAR Score (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 9/10" {...field} />
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
            <Save className="mr-2 h-4 w-4" /> Save Baby Record
          </Button>
        </div>
      </form>
    </Form>
  );
}

    