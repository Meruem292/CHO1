
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }).or(z.string().min(3, { message: "Username must be at least 3 characters."})),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  rememberMe: z.boolean().optional(),
});

export const signupSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }).max(50, { message: "First name is too long."}),
  middleName: z.string().max(50, { message: "Middle name is too long."}).optional(),
  lastName: z.string().min(1, { message: "Last name is required." }).max(50, { message: "Last name is too long."}),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // path of error
});

export const adminCreateUserSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }).max(50),
  middleName: z.string().max(50).optional(),
  lastName: z.string().min(1, { message: "Last name is required." }).max(50),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(['doctor', 'patient'], { message: "Role is required." }),
});
export type AdminCreateUserFormData = z.infer<typeof adminCreateUserSchema>;


export const patientFormDataSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }).max(50, { message: "First name is too long."}),
  middleName: z.string().max(50, { message: "Middle name is too long."}).optional().default(''),
  lastName: z.string().min(1, { message: "Last name is required." }).max(50, { message: "Last name is too long."}),
  dateOfBirth: z.string()
    .optional()
    .default('')
    .refine(date => date === '' || !isNaN(Date.parse(date)), { message: "Invalid date format." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phoneNumber: z.string().min(5, { message: "Contact information is too short." }).optional().default(''),
  municipal: z.string().min(2, "Municipal is too short").optional().default(''),
  city: z.string().min(2, "City is too short").optional().default(''),
  sex: z.enum(['male', 'female', 'other']).optional(),
  civilStatus: z.string().optional().default(''),
  religion: z.string().optional().default(''),
  ethnicity: z.string().optional().default(''),
  nationality: z.string().optional().default(''),
  highestEducation: z.string().optional().default(''),
  occupation: z.string().optional().default(''),
  monthlyIncome: z.string().optional().default(''), // Assuming string for flexibility, can be z.coerce.number()
  philhealthMember: z.enum(['yes', 'no']).optional(),
  philhealthNumber: z.string().optional().default(''),
  healthFacilityMember: z.enum(['yes', 'no']).optional(), // Renamed for consistency
  householdMember: z.enum(['yes', 'no']).optional(), // Renamed for consistency
  bloodType: z.string().optional().default(''),
  remarks: z.string().optional().default(''),
});
export type PatientFormData = z.infer<typeof patientFormDataSchema>;


// This schema is used for the actual data saved to the DB, derived from PatientFormData
export const patientSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  role: z.enum(['admin', 'doctor', 'patient']),
  firstName: z.string().min(1),
  middleName: z.string().optional(),
  lastName: z.string().min(1),
  dateOfBirth: z.string().optional(), // Should align with PatientFormData
  phoneNumber: z.string().min(5, { message: "Contact information is too short." }).optional(),
  municipal: z.string().min(2, "Municipal is too short").optional(),
  city: z.string().min(2, "City is too short").optional(),
  sex: z.enum(['male', 'female', 'other']).optional(),
  civilStatus: z.string().optional(),
  religion: z.string().optional(),
  ethnicity: z.string().optional(),
  nationality: z.string().optional(),
  highestEducation: z.string().optional(),
  occupation: z.string().optional(),
  monthlyIncome: z.string().optional(),
  philhealthMember: z.enum(['yes', 'no']).optional(),
  philhealthNumber: z.string().optional(),
  healthFacilityMember: z.enum(['yes', 'no']).optional(),
  householdMember: z.enum(['yes', 'no']).optional(),
  bloodType: z.string().optional(),
  remarks: z.string().optional(),
});


export const consultationSchema = z.object({
  date: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format." }),
  notes: z.string().min(10, { message: "Notes must be at least 10 characters." }),
  diagnosis: z.string().optional(),
  treatmentPlan: z.string().optional(),
});

export const maternityHistorySchema = z.object({
  pregnancyNumber: z.coerce.number().int().positive({ message: "Pregnancy number must be positive." }),
  deliveryDate: z.string().refine((date) => date === '' || !isNaN(Date.parse(date)), { message: "Invalid date format." }).optional().or(z.literal('')),
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
