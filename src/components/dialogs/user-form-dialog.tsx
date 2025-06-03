
'use client';

import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type * as z from 'zod';
import type { Patient, UserRole } from '@/types'; // Patient type for submit data, UserRole for role enum
import { adminCreateUserSchema } from '@/zod-schemas';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth-hook'; // To use adminCreateUserWithEmail
import { toast } from '@/hooks/use-toast';


interface UserFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Patient, 'id'>) => Promise<void>; // Omit 'id' as it's generated
  defaultRole?: UserRole; // Optional default role pre-selection
}

type AdminCreateUserFormData = z.infer<typeof adminCreateUserSchema>;

export function UserFormDialog({ isOpen, onClose, onSubmit, defaultRole = 'patient' }: UserFormDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { adminCreateUserWithEmail } = useAuth(); // Using this directly for now

  const form = useForm<AdminCreateUserFormData>({
    resolver: zodResolver(adminCreateUserSchema),
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      password: '',
      role: defaultRole,
    },
  });

  // Reset form when dialog opens with a new defaultRole or simply re-opens
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        password: '',
        role: defaultRole,
      });
    }
  }, [isOpen, defaultRole, form.reset]);


  const handleFormSubmit = async (data: AdminCreateUserFormData) => {
    setIsSaving(true);
    try {
      // Construct the full name for the Patient object
      const fullNameParts = [data.firstName, data.middleName, data.lastName].filter(Boolean);
      const name = fullNameParts.join(' ');
      
      const patientData: Omit<Patient, 'id'> = {
        name: name,
        firstName: data.firstName,
        middleName: data.middleName || undefined, // Store as undefined if empty
        lastName: data.lastName,
        email: data.email,
        role: data.role,
        // password is not part of Patient type, it's used for auth creation
      };
      await onSubmit(patientData); // This is the prop from parent, which calls addPatient
      // The parent (DoctorsPage or UserManagementPage) will show success toast and close.
      // The adminCreateUserWithEmail logic is now inside AuthProvider.
      // The `onSubmit` from parent (e.g., UserManagementPage) calls `addUser` from `useMockDb`
      // which in turn calls `adminCreateUserWithEmail` or a similar Firebase function.
      // For `UserFormDialog` itself, we only need to pass data to the `onSubmit` prop.
      
      onClose(); // Close dialog after successful submission
    } catch (error) {
      console.error("Error submitting user form:", error);
      // Error toast will be handled by the parent component's submit handler
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new user account. They will receive credentials to log in.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Juan" {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="middleName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Middle Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Rizal" {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Dela Cruz" {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@example.com" {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSaving}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="doctor">Doctor/Midwife</SelectItem>
                      <SelectItem value="patient">Patient</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Creating User...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
