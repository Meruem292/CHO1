
export type UserRole = 'admin' | 'doctor' | 'patient';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
}

export interface PatientFormData {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth?: string;
  email: string;
  phoneNumber?: string;
  municipal?: string;
  city?: string;
  sex?: 'male' | 'female' | 'other';
  civilStatus?: string;
  religion?: string;
  ethnicity?: string;
  nationality?: string;
  highestEducation?: string;
  occupation?: string;
  monthlyIncome?: string;
  philhealthMember?: 'yes' | 'no';
  philhealthNumber?: string;
  healthFacilityMember?: 'yes' | 'no';
  householdMember?: 'yes' | 'no';
  bloodType?: string;
  remarks?: string;
}

// This reflects the structure in Firebase, including the combined 'name' and 'role'
export interface Patient extends PatientFormData {
  id: string; // Firebase UID - this will be the key in the RTDB
  name: string; // Combined name
  role: UserRole;
  createdAt?: object; // For Firebase serverTimestamp
  updatedAt?: object; // For Firebase serverTimestamp
}


export interface ConsultationRecord {
  id: string;
  patientId: string;
  date: string;
  notes: string;
  diagnosis?: string;
  treatmentPlan?: string;
  doctorId?: string; // ID of the doctor who made the record
  doctorName?: string; // Name of the doctor
  createdAt?: object;
  updatedAt?: object;
}

export interface MaternityRecord {
  id: string;
  patientId: string;
  pregnancyNumber: number;
  deliveryDate?: string;
  outcome?: string;
  complications?: string;
  doctorId?: string;
  doctorName?: string;
  createdAt?: object;
  updatedAt?: object;
}

export interface BabyRecord {
  id: string;
  motherId: string;
  name?: string;
  birthDate: string;
  birthWeight?: string;
  birthLength?: string;
  apgarScore?: string;
  vaccinations?: Array<{ date: string; vaccine: string; notes?: string }>;
  checkups?: Array<{ date: string; notes: string; weight?: string; height?: string }>;
  doctorId?: string;
  doctorName?: string;
  createdAt?: object;
  updatedAt?: object;
}

export interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  patientSpecific?: boolean;
  subItems?: NavItem[];
}

// Appointment System Types
export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export const ALL_DAYS_OF_WEEK: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];


export interface TimeSlot {
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

export interface WorkingDay {
  dayOfWeek: DayOfWeek;
  isEnabled: boolean;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  breakTimes?: TimeSlot[];
}

export interface DoctorSchedule {
  id: string; // Corresponds to doctorId (Firebase key)
  doctorId: string; // doctor's User.id
  workingHours: WorkingDay[]; // Array of 7 WorkingDay objects, one for each day
  unavailableDates?: string[]; // Array of "YYYY-MM-DD"
  customAvailableSlots?: Array<{ date: string; startTime: string; endTime: string; slotDurationMinutes?: number }>;
  defaultSlotDurationMinutes: number;
  noticePeriodHours?: number; // Min hours before appointment booking/cancellation
  createdAt?: object;
  updatedAt?: object;
}

export type AppointmentStatus =
  | 'scheduled'
  | 'completed'
  | 'cancelledByPatient'
  | 'cancelledByDoctor'
  | 'cancelledByAdmin'
  | 'rescheduled';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  appointmentDateTimeStart: string; // ISO String (UTC)
  appointmentDateTimeEnd: string; // ISO String (UTC)
  durationMinutes: number;
  status: AppointmentStatus;
  reasonForVisit?: string;
  notes?: string; // Doctor/Admin notes
  cancellationReason?: string;
  cancelledByRole?: UserRole;
  cancelledById?: string;
  rescheduledFromId?: string; // If this appointment was rescheduled from another
  rescheduledToId?: string; // If this appointment was rescheduled to another
  createdAt?: object;
  updatedAt?: object;
}

// For Admin bootstrapping if used
export interface AdminBootstrapConfig {
  email: string;
  password: string;
  name?: string;
}

// For the appointment booking form
export interface AppointmentBookingFormData {
  reasonForVisit?: string;
}

