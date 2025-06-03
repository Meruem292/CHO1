
export type UserRole = 'admin' | 'doctor' | 'patient';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email?: string; // Optional: can be added if needed for user object
}

export interface Patient {
  id: string; // Firebase UID - this will be the key in the RTDB, added by snapshotToArray
  name: string;
  email: string; // Email used for login/signup
  role: UserRole; // Role of the user/patient
  dateOfBirth?: string;
  contact?: string;
  address?: string;
  createdAt?: object; // For Firebase serverTimestamp
  updatedAt?: object; // For Firebase serverTimestamp
  // Add other patient-specific fields
}

export interface ConsultationRecord {
  id: string;
  patientId: string;
  date: string;
  notes: string;
  diagnosis?: string;
  treatmentPlan?: string;
  // Add other consultation-specific fields
}

export interface MaternityRecord {
  id: string;
  patientId: string;
  pregnancyNumber: number;
  deliveryDate?: string;
  outcome?: string; // e.g., 'Live Birth', 'Stillbirth'
  complications?: string;
  // Add other maternity-specific fields
}

export interface BabyRecord {
  id: string;
  motherId: string; // Link to mother (Patient ID)
  name?: string; // Baby's name might not be available at birth
  birthDate: string;
  birthWeight?: string; // e.g., '3.5kg'
  birthLength?: string; // e.g., '50cm'
  apgarScore?: string;
  vaccinations?: Array<{ date: string; vaccine: string; notes?: string }>;
  checkups?: Array<{ date: string; notes: string; weight?: string; height?: string }>;
  // Add other baby-specific fields
}

export interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  patientSpecific?: boolean; // True if this link needs a patientId context
  subItems?: NavItem[];
}
