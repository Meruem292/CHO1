

import { z } from 'zod';
import { ALL_DAYS_OF_WEEK, type DayOfWeek } from '@/types';

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
  terms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms and Conditions." }),
  }),
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
  role: z.enum(['doctor', 'midwife/nurse', 'patient'], { message: "Role is required." }),
});
export type AdminCreateUserFormData = z.infer<typeof adminCreateUserSchema>;


export const patientFormDataSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }).max(50, { message: "First name is too long."}),
  middleName: z.string().max(50, { message: "Middle name is too long."}).optional().default(''),
  lastName: z.string().min(1, { message: "Last name is required." }).max(50, { message: "Last name is too long."}),
  dateOfBirth: z.string()
    .refine(date => date === '' || !isNaN(Date.parse(date)), { message: "Invalid date format." }).optional(),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phoneNumber: z.string().min(5, { message: "Contact information is too short." }).optional().default(''),
  city: z.string().optional().default(''),
  province: z.string().optional().default(''),
  sex: z.enum(['male', 'female', 'other']).optional(),
  civilStatus: z.string().optional().default(''),
  religion: z.string().optional().default(''),
  ethnicity: z.string().optional().default(''),
  nationality: z.string().optional().default(''),
  highestEducation: z.string().optional().default(''),
  occupation: z.string().optional().default(''),
  monthlyIncome: z.string().optional().default(''),
  philhealthMember: z.enum(['yes', 'no']).optional(),
  philhealthNumber: z.string().optional().default(''),
  healthFacilityMember: z.enum(['yes', 'no']).optional(),
  householdMember: z.enum(['yes', 'no']).optional(),
  bloodType: z.string().optional().default(''),
  remarks: z.string().optional().default(''),
});
export type PatientFormData = z.infer<typeof patientFormDataSchema>;


// This schema is used for the actual data saved to the DB, derived from PatientFormData
export const patientSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  role: z.enum(['admin', 'doctor', 'midwife/nurse', 'patient']),
  firstName: z.string().min(1),
  middleName: z.string().optional(),
  lastName: z.string().min(1),
  dateOfBirth: z.string().optional(),
  phoneNumber: z.string().min(5, { message: "Contact information is too short." }).optional(),
  city: z.string().optional(),
  province: z.string().optional(),
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
  subjectType: z.enum(['mother', 'baby']).optional().default('mother'),
  babyId: z.string().optional(),
  babyName: z.string().optional(), // This will be populated programmatically, not by user input usually
}).superRefine((data, ctx) => {
  if (data.subjectType === 'baby' && !data.babyId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please select a baby if the consultation is for a baby.",
      path: ["babyId"],
    });
  }
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


// Appointment System Schemas
const timeFormatRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/; // HH:MM format

export const timeSlotSchema = z.object({
  startTime: z.string().regex(timeFormatRegex, { message: "Invalid start time format (HH:MM)." }),
  endTime: z.string().regex(timeFormatRegex, { message: "Invalid end time format (HH:MM)." }),
}).refine(data => data.startTime < data.endTime, {
  message: "End time must be after start time.",
  path: ["endTime"],
});

export const workingDaySchema = z.object({
  dayOfWeek: z.enum(ALL_DAYS_OF_WEEK as [DayOfWeek, ...DayOfWeek[]]),
  isEnabled: z.boolean().default(false),
  startTime: z.string().regex(timeFormatRegex, { message: "Invalid start time format (HH:MM)." }).optional().or(z.literal('')),
  endTime: z.string().regex(timeFormatRegex, { message: "Invalid end time format (HH:MM)." }).optional().or(z.literal('')),
  breakTimes: z.array(timeSlotSchema).optional(),
}).superRefine((data, ctx) => {
  if (data.isEnabled) {
    if (!data.startTime || !timeFormatRegex.test(data.startTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start time is required when day is enabled.",
        path: ["startTime"],
      });
    }
    if (!data.endTime || !timeFormatRegex.test(data.endTime)) {
       ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time is required when day is enabled.",
        path: ["endTime"],
      });
    }
    if (data.startTime && data.endTime && data.startTime >= data.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time.",
        path: ["endTime"],
      });
    }
  }
});

export const doctorScheduleSchema = z.object({
  doctorId: z.string().min(1, "Doctor ID is required."),
  workingHours: z.array(workingDaySchema).length(7, "Must have 7 working day entries."),
  unavailableDates: z.array(z.string().date("Invalid date format for unavailable date.")).optional(),
  defaultSlotDurationMinutes: z.coerce.number().int().positive({ message: "Slot duration must be a positive number." }).min(5, "Slot duration too short.").max(240, "Slot duration too long."),
  noticePeriodHours: z.coerce.number().int().nonnegative({ message: "Notice period cannot be negative." }).optional(),
});
export type DoctorScheduleFormData = z.infer<typeof doctorScheduleSchema>;

export const appointmentBookingFormSchema = z.object({
  reasonForVisit: z.string().max(500, "Reason is too long.").optional(),
});
export type AppointmentBookingFormData = z.infer<typeof appointmentBookingFormSchema>;
