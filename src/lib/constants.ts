

import type { NavItem, UserRole } from '@/types';
import { LayoutDashboard, Users, ClipboardList, Baby, HeartPulse, Sparkles, Stethoscope, UserCog, CalendarClock, CalendarPlus, BriefcaseMedical, History, ListOrdered, Archive } from 'lucide-react';

export const USER_ROLES: UserRole[] = ['admin', 'doctor', 'midwife/nurse', 'patient'];

// Note: For dynamic paths like '/users/[userId]/appointments',
// the SidebarNavItems component will construct the full path using the logged-in user's ID.
// The href here can be a placeholder or the base path.
// The redirector pages for patient/doctor "My Appointments" handle the actual routing.

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'doctor', 'midwife/nurse', 'patient'],
  },
  // Admin Specific
  {
    href: '/patients', // Admin views/manages all patients (role='patient')
    label: 'Manage Patients',
    icon: Users,
    roles: ['admin'],
  },
  {
    href: '/doctors', // Admin views/manages all providers (doctors and midwives)
    label: 'Manage Providers',
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
    href: '/admin/schedules', // Admin views all provider schedules
    label: 'Provider Schedules',
    icon: BriefcaseMedical,
    roles: ['admin'],
  },
  {
    href: '/admin/archive',
    label: 'Archive',
    icon: Archive,
    roles: ['admin'],
  },
   {
    href: '/audit-log',
    label: 'Audit Log',
    icon: ListOrdered,
    roles: ['admin', 'doctor'],
  },
  // Doctor & Midwife/Nurse Specific
  {
    href: '/patients', // Providers view their associated patients
    label: 'My Associated Patients',
    icon: Users,
    roles: ['doctor', 'midwife/nurse'],
  },
  {
    href: '/doctor/my-schedule', // Provider manages their own schedule
    label: 'My Schedule',
    icon: CalendarPlus,
    roles: ['doctor', 'midwife/nurse'],
  },
  {
    href: '/doctor/my-appointments', // Provider views their own appointments (redirects)
    label: 'My Appointments',
    icon: CalendarClock,
    roles: ['doctor', 'midwife/nurse'],
  },
  {
    href: '/doctor/activity-log',
    label: 'My Activity Log',
    icon: History,
    roles: ['doctor', 'midwife/nurse'],
  },
   {
    href: '/ai-suggestions',
    label: 'AI Health Suggestions',
    icon: Sparkles,
    roles: ['admin', 'doctor', 'midwife/nurse'],
  },
  // Patient Specific
  {
    href: '/patient/my-appointments', // Patient views their own appointments (redirects)
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
    roles: ['admin', 'doctor'], // Only admin and doctor can see this tab
    patientSpecific: true,
  },
  {
    href: '/maternity-history', // Appends to /patients/[patientId]
    label: 'Maternity History',
    icon: Baby,
    roles: ['admin', 'doctor', 'midwife/nurse'],
    patientSpecific: true,
  },
  {
    href: '/baby-health', // Appends to /patients/[patientId]
    label: 'Baby Health Records',
    icon: HeartPulse,
    roles: ['admin', 'doctor', 'midwife/nurse'],
    patientSpecific: true,
  },
];

export const APP_NAME = 'City Health Office';
