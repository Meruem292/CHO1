
import type { NavItem, UserRole } from '@/types';
import { LayoutDashboard, Users, ClipboardList, Baby, HeartPulse, Sparkles, Stethoscope, UserCog, CalendarClock, CalendarPlus, BriefcaseMedical } from 'lucide-react';

export const USER_ROLES: UserRole[] = ['admin', 'doctor', 'patient'];

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'doctor', 'patient'],
  },
  // Admin Specific
  {
    href: '/patients',
    label: 'Manage Patients',
    icon: Users,
    roles: ['admin'], // Changed from ['admin', 'doctor']
  },
  {
    href: '/doctors',
    label: 'Manage Doctors',
    icon: Stethoscope,
    roles: ['admin'],
  },
  {
    href: '/user-management',
    label: 'User Management',
    icon: UserCog,
    roles: ['admin'],
  },
  {
    href: '/admin/appointments',
    label: 'Manage Appointments',
    icon: CalendarClock,
    roles: ['admin'],
  },
  {
    href: '/admin/schedules',
    label: 'Doctor Schedules',
    icon: BriefcaseMedical, // Or another suitable icon
    roles: ['admin'],
  },
  // Doctor Specific (but some accessible by admin if they navigate to a doctor's context)
  {
    href: '/doctor/my-schedule', // Will need logic to route to /doctors/[doctorId]/schedule
    label: 'My Schedule',
    icon: CalendarPlus,
    roles: ['doctor'],
  },
  {
    href: '/doctor/my-appointments', // Will need logic to route to /doctors/[doctorId]/appointments
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
    href: '/patient/my-appointments', // Will need logic to route to /patients/[patientId]/appointments
    label: 'My Appointments',
    icon: CalendarClock,
    roles: ['patient'],
  },
  {
    href: '/patient/book-appointment', // New page for patient to book
    label: 'Book Appointment',
    icon: CalendarPlus,
    roles: ['patient'],
  },
  // Patient record specific items - still relevant for patient role
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

// Patient specific navigation items, shown when an admin/doctor is viewing a patient's records
export const PATIENT_NAV_ITEMS: NavItem[] = [
   {
    href: '/consultations',
    label: 'Consultations',
    icon: ClipboardList,
    roles: ['admin', 'doctor'],
    patientSpecific: true,
  },
  {
    href: '/maternity-history',
    label: 'Maternity History',
    icon: Baby,
    roles: ['admin', 'doctor'],
    patientSpecific: true,
  },
  {
    href: '/baby-health',
    label: 'Baby Health Records',
    icon: HeartPulse,
    roles: ['admin', 'doctor'],
    patientSpecific: true,
  },
  // Could add a link to view patient's appointments from admin/doctor context too
  // {
  //   href: '/appointments',
  //   label: "Patient's Appointments",
  //   icon: CalendarClock,
  //   roles: ['admin', 'doctor'],
  //   patientSpecific: true,
  // }
];

export const APP_NAME = 'City Health Office';
