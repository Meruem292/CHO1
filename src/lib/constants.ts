import type { NavItem, UserRole } from '@/types';
import { LayoutDashboard, Users, ClipboardList, Baby, HeartPulse, Sparkles, Stethoscope, UserCircle } from 'lucide-react';

export const USER_ROLES: UserRole[] = ['admin', 'doctor', 'patient'];

export const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'doctor', 'patient'],
  },
  {
    href: '/patients',
    label: 'Patients',
    icon: Users,
    roles: ['admin', 'doctor'],
  },
  {
    href: '/consultations',
    label: 'My Consultations',
    icon: ClipboardList,
    roles: ['patient'],
    patientSpecific: true, // This indicates it should be /patients/[id]/consultations for patients
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
  {
    href: '/ai-suggestions',
    label: 'AI Health Suggestions',
    icon: Sparkles,
    roles: ['admin', 'doctor'],
  },
];

// Patient specific navigation items, shown when a patient is selected
export const PATIENT_NAV_ITEMS: NavItem[] = [
   {
    href: '/consultations', // Path will be relative to /patients/[patientId]
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
];

export const APP_NAME = 'City Health Office';
