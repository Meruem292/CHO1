
import type { NavItem, UserRole } from '@/types';
import { LayoutDashboard, Users, ClipboardList, Baby, HeartPulse, Sparkles, Stethoscope, UserCog, CalendarClock, CalendarPlus, BriefcaseMedical } from 'lucide-react';

export const USER_ROLES: UserRole[] = ['admin', 'doctor', 'patient'];

// Note: For dynamic paths like '/users/[userId]/appointments',
// the SidebarNavItems component will construct the full path using the logged-in user's ID.
// The href here can be a placeholder or the base path.
// The redirector pages for patient/doctor "My Appointments" handle the actual routing.

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'doctor', 'patient'],
  },
  // Admin Specific
  {
    href: '/patients', // Admin views/manages all patients (role='patient')
    label: 'Manage Patients',
    icon: Users,
    roles: ['admin'],
  },
  {
    href: '/doctors', // Admin views/manages all doctors (role='doctor')
    label: 'Manage Doctors',
    icon: Stethoscope,
    roles: ['admin'],
  },
  {
    href: '/user-management', // Admin manages all users (any role)
    label: 'User Management',
    icon: UserCog,
    roles: ['admin'],
  },
  {
    href: '/admin/appointments', // Admin manages all appointments
    label: 'Manage Appointments',
    icon: CalendarClock,
    roles: ['admin'],
  },
  {
    href: '/admin/schedules', // Admin manages all doctor schedules
    label: 'Doctor Schedules',
    icon: BriefcaseMedical,
    roles: ['admin'],
  },
  // Doctor Specific
  {
    href: '/patients', // Doctors view their associated patients
    label: 'My Associated Patients',
    icon: Users,
    roles: ['doctor'],
  },
  {
    href: '/doctor/my-schedule', // Doctor manages their own schedule
    label: 'My Schedule',
    icon: CalendarPlus,
    roles: ['doctor'],
  },
  {
    href: '/doctor/my-appointments', // Doctor views their own appointments (redirects to /users/[doctorId]/appointments)
    label: 'My Appointments',
    icon: CalendarClock,
    roles: ['doctor'],
  },
   {
    href: '/ai-suggestions',
    label: 'AI Health Suggestions',
    icon: Sparkles,
    roles: ['admin', 'doctor'],
  },
  // Patient Specific
  {
    href: '/patient/my-appointments', // Patient views their own appointments (redirects to /users/[patientId]/appointments)
    label: 'My Appointments',
    icon: CalendarClock,
    roles: ['patient'],
  },
  {
    href: '/patient/book-appointment',
    label: 'Book Appointment',
    icon: CalendarPlus,
    roles: ['patient'],
  },
  // Patient record specific items - for patient viewing their own records.
  // SidebarNavItems will construct href like /patients/[patientId]/consultations
  {
    href: '/consultations',
    label: 'My Consultations',
    icon: ClipboardList,
    roles: ['patient'],
    patientSpecific: true,
  },
  {
    href: '/maternity-history',
    label: 'My Maternity History',
    icon: Baby,
    roles: ['patient'],
    patientSpecific: true,
  },
  {
    href: '/baby-health',
    label: 'My Baby\'s Health',
    icon: HeartPulse,
    roles: ['patient'],
    patientSpecific: true,
  },
];

// Patient specific navigation items, shown when an admin/doctor is viewing a specific patient's records from the /patients/[patientId]/... routes
export const PATIENT_NAV_ITEMS: NavItem[] = [
   {
    href: '/consultations', // Appends to /patients/[patientId]
    label: 'Consultations',
    icon: ClipboardList,
    roles: ['admin', 'doctor'],
    patientSpecific: true,
  },
  {
    href: '/maternity-history', // Appends to /patients/[patientId]
    label: 'Maternity History',
    icon: Baby,
    roles: ['admin', 'doctor'],
    patientSpecific: true,
  },
  {
    href: '/baby-health', // Appends to /patients/[patientId]
    label: 'Baby Health Records',
    icon: HeartPulse,
    roles: ['admin', 'doctor'],
    patientSpecific: true,
  },
  // This one would need to navigate to /users/[patientId]/appointments
  // If we add this, SidebarNavItems needs to be aware of 'viewingPatientId' context to build this link correctly.
  // For now, admin/doctor access specific patient appointments via the main "Manage Appointments" or by going to the patient's profile if that's built.
  // Let's keep it simple for now and not add this specific link in the patient sub-menu.
  // {
  //   href: `/users/[patientId]/appointments`, // This is tricky, needs dynamic patientId from context
  //   label: "Patient's Appointments",
  //   icon: CalendarClock,
  //   roles: ['admin', 'doctor'],
  //   patientSpecific: true, // or a new flag like 'contextualPatientSpecific'
  // }
];

export const APP_NAME = 'City Health Office';

    
