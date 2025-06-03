import { z } from 'zod';

export const loginSchema = z.object({
  role: z.enum(['admin', 'doctor', 'patient'], {
    required_error: 'You need to select a role.',
  }),
});

export const patientSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  dateOfBirth: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }),
  contact: z.string().min(5, { message: "Contact information is too short." }),
  address: z.string().min(5, { message: "Address is too short." }),
});

export const consultationSchema = z.object({
  date: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }),
  notes: z.string().min(10, { message: "Notes must be at least 10 characters." }),
  diagnosis: z.string().optional(),
  treatmentPlan: z.string().optional(),
});

export const maternityHistorySchema = z.object({
  pregnancyNumber: z.coerce.number().int().positive({ message: "Pregnancy number must be positive." }),
  deliveryDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }).optional().or(z.literal('')),
  outcome: z.string().optional(),
  complications: z.string().optional(),
});

export const babyHealthSchema = z.object({
  name: z.string().optional(),
  birthDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }),
  birthWeight: z.string().optional(),
  birthLength: z.string().optional(),
  apgarScore: z.string().optional(),
});

export const aiSuggestionSchema = z.object({
  motherConsultationRecords: z.string().min(10, { message: "Mother's consultation records are required." }),
  maternityHistory: z.string().min(10, { message: "Maternity history is required." }),
  babyHealthRecords: z.string().min(10, { message: "Baby's health records are required." }),
});
