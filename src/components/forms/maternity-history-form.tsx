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
import { Textarea } from '@/components/ui/textarea';
import { maternityHistorySchema } from '@/zod-schemas';
import type { MaternityRecord } from '@/types';
import { CalendarIcon, Save } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface MaternityHistoryFormProps {
  record?: MaternityRecord;
  onSubmit: (data: Omit<z.infer<typeof maternityHistorySchema>, 'id' | 'patientId'>) => void;
  onCancel?: () => void;
}

export function MaternityHistoryForm({ record, onSubmit, onCancel }: MaternityHistoryFormProps) {
  const form = useForm<z.infer<typeof maternityHistorySchema>>({
    resolver: zodResolver(maternityHistorySchema),
    defaultValues: record || {
      pregnancyNumber: 1,
      deliveryDate: '',
      outcome: '',
      complications: '',
    },
  });

  const handleSubmit = (data: z.infer<typeof maternityHistorySchema>) => {
    onSubmit(data);
    form.reset({ pregnancyNumber: (form.getValues().pregnancyNumber || 0) + 1 , deliveryDate: '', outcome: '', complications: ''});
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="pregnancyNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pregnancy Number</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 1, 2, 3" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="deliveryDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Delivery Date (Optional)</FormLabel>
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
                        format(new Date(field.value), "PPP")
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
                    selected={field.value ? new Date(field.value) : undefined}
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
          name="outcome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Outcome (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Live Birth, Stillbirth" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="complications"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Complications (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Note any complications" {...field} />
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
            <Save className="mr-2 h-4 w-4" /> Save Record
          </Button>
        </div>
      </form>
    </Form>
  );
}

