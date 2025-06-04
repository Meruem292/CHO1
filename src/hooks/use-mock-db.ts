
'use client';

import type { Patient, ConsultationRecord, MaternityRecord, BabyRecord, DoctorSchedule, Appointment, AppointmentStatus, UserRole, DayOfWeek } from '@/types';
import { useState, useEffect, useCallback } from 'react';
import { database } from '@/lib/firebase-config';
import { ref, onValue, set, push, update as firebaseUpdate, remove as firebaseRemove, child, serverTimestamp, query, orderByChild, equalTo, get } from 'firebase/database';
import { useAuth } from './use-auth-hook';
import { 
  format, 
  parseISO, 
  startOfDay, 
  endOfDay, 
  addMinutes as addMinutesFn, 
  isBefore, 
  isAfter, 
  isEqual, 
  setHours, 
  setMinutes, 
  setSeconds, 
  setMilliseconds, 
  addHours, 
  getDay, 
  compareAsc 
} from 'date-fns';

const PH_TIMEZONE = 'Asia/Manila'; // Define if not already defined globally or locally as needed

// Helper to transform Firebase snapshot to array
const snapshotToArray = <T extends { id: string }>(snapshot: any): T[] => {
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  if (data === null || typeof data !== 'object') {
    return [];
  }
  return Object.keys(data).map(key => ({ ...data[key], id: key } as T));
};


export function useMockDb() {
  const { user } = useAuth();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);

  const [consultations, setConsultations] = useState<ConsultationRecord[]>([]);
  const [consultationsLoading, setConsultationsLoading] = useState(true);

  const [maternityRecords, setMaternityRecords] = useState<MaternityRecord[]>([]);
  const [maternityRecordsLoading, setMaternityRecordsLoading] = useState(true);

  const [babyRecords, setBabyRecords] = useState<BabyRecord[]>([]);
  const [babyRecordsLoading, setBabyRecordsLoading] = useState(true);

  const [doctorSchedule, setDoctorSchedule] = useState<DoctorSchedule | null>(null);
  const [doctorScheduleLoading, setDoctorScheduleLoading] = useState(true);

  const [appointments, setAppointments] = useState<Appointment[]>([]); 
  const [appointmentsLoading, setAppointmentsLoading] = useState(true); 

  const [doctorAppointmentsForBooking, setDoctorAppointmentsForBooking] = useState<Appointment[]>([]);
  const [doctorAppointmentsLoading, setDoctorAppointmentsLoading] = useState(true);


  useEffect(() => {
    const patientsRef = ref(database, 'patients');
    const unsubscribe = onValue(patientsRef, (snapshot) => {
      setPatients(snapshotToArray<Patient>(snapshot));
      setPatientsLoading(false);
    }, (error) => {
      console.error("Error fetching patients:", error);
      setPatientsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const getPatients = useCallback(() => patients, [patients]);
  const getPatientById = useCallback((id: string): Patient | undefined => patients.find(p => p.id === id), [patients]);


  const addPatient = useCallback(async (patientData: Omit<Patient, 'id' | 'role'>) => {
    const newPatientRef = push(ref(database, 'patients'));
    const dataToSave: Omit<Patient, 'id'> = { ...patientData, role: 'patient', createdAt: serverTimestamp() };
    await set(newPatientRef, dataToSave);
    return { ...dataToSave, id: newPatientRef.key! } as Patient;
  }, []);

  const updatePatient = useCallback(async (id: string, updates: Partial<Omit<Patient, 'id'>>) => {
    const patientRef = ref(database, `patients/${id}`);
    await firebaseUpdate(patientRef, { ...updates, updatedAt: serverTimestamp() });
  }, []);

  const deletePatient = useCallback(async (id: string) => {
    await firebaseRemove(ref(database, `patients/${id}`));
    const consultsQuery = query(ref(database, 'consultations'), orderByChild('patientId'), equalTo(id));
    onValue(consultsQuery, (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            firebaseRemove(childSnapshot.ref);
        });
    }, { onlyOnce: true });
     const maternityQuery = query(ref(database, 'maternityRecords'), orderByChild('patientId'), equalTo(id));
    onValue(maternityQuery, (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            firebaseRemove(childSnapshot.ref);
        });
    }, { onlyOnce: true });
    const babyQuery = query(ref(database, 'babyRecords'), orderByChild('motherId'), equalTo(id));
    onValue(babyQuery, (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            firebaseRemove(childSnapshot.ref);
        });
    }, { onlyOnce: true });
    const appointmentsAsPatientQuery = query(ref(database, 'appointments'), orderByChild('patientId'), equalTo(id));
    onValue(appointmentsAsPatientQuery, (snapshot) => {
      snapshot.forEach((childSnapshot) => firebaseRemove(childSnapshot.ref));
    }, { onlyOnce: true });
     const appointmentsAsDoctorQuery = query(ref(database, 'appointments'), orderByChild('doctorId'), equalTo(id));
    onValue(appointmentsAsDoctorQuery, (snapshot) => {
      snapshot.forEach((childSnapshot) => firebaseRemove(childSnapshot.ref));
    }, { onlyOnce: true });
    const doctorScheduleRef = ref(database, `doctorSchedules/${id}`);
    firebaseRemove(doctorScheduleRef);
  }, []);

  const getConsultationsByPatientId = useCallback((patientId: string) => {
    setConsultationsLoading(true);
    const consultsQuery = query(ref(database, 'consultations'), orderByChild('patientId'), equalTo(patientId));
    const unsubscribe = onValue(consultsQuery, (snapshot) => {
        const records = snapshotToArray<ConsultationRecord>(snapshot);
        setConsultations(records.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setConsultationsLoading(false);
    }, (error) => {
        console.error(`Error fetching consultations for patient ${patientId}:`, error);
        setConsultationsLoading(false);
    });
    return unsubscribe;
  }, []);

  const addConsultation = useCallback(async (consultationData: Omit<ConsultationRecord, 'id'>) => {
    const newRef = push(ref(database, 'consultations'));
    await set(newRef, { ...consultationData, createdAt: serverTimestamp() });
    return { ...consultationData, id: newRef.key! } as ConsultationRecord;
  }, []);

  const updateConsultation = useCallback(async (id: string, updates: Partial<Omit<ConsultationRecord, 'id'>>) => {
    await firebaseUpdate(ref(database, `consultations/${id}`), { ...updates, updatedAt: serverTimestamp() });
  }, []);

  const deleteConsultation = useCallback(async (id: string) => {
    await firebaseRemove(ref(database, `consultations/${id}`));
  }, []);

  const getMaternityHistoryByPatientId = useCallback((patientId: string) => {
    setMaternityRecordsLoading(true);
    const recordsQuery = query(ref(database, 'maternityRecords'), orderByChild('patientId'), equalTo(patientId));
     const unsubscribe = onValue(recordsQuery, (snapshot) => {
        const records = snapshotToArray<MaternityRecord>(snapshot);
        setMaternityRecords(records.sort((a,b) => (b.pregnancyNumber || 0) - (a.pregnancyNumber || 0)));
        setMaternityRecordsLoading(false);
    }, (error) => {
        console.error(`Error fetching maternity records for patient ${patientId}:`, error);
        setMaternityRecordsLoading(false);
    });
    return unsubscribe;
  }, []);

  const addMaternityRecord = useCallback(async (recordData: Omit<MaternityRecord, 'id'>) => {
    const newRef = push(ref(database, 'maternityRecords'));
    await set(newRef, { ...recordData, createdAt: serverTimestamp() });
    return { ...recordData, id: newRef.key! } as MaternityRecord;
  }, []);

  const updateMaternityRecord = useCallback(async (id: string, updates: Partial<Omit<MaternityRecord, 'id'>>) => {
    await firebaseUpdate(ref(database, `maternityRecords/${id}`), { ...updates, updatedAt: serverTimestamp() });
  }, []);

  const deleteMaternityRecord = useCallback(async (id: string) => {
    await firebaseRemove(ref(database, `maternityRecords/${id}`));
  }, []);

  const getBabyRecordsByMotherId = useCallback((motherId: string) => {
    setBabyRecordsLoading(true);
    const recordsQuery = query(ref(database, 'babyRecords'), orderByChild('motherId'), equalTo(motherId));
    const unsubscribe = onValue(recordsQuery, (snapshot) => {
        const records = snapshotToArray<BabyRecord>(snapshot);
        setBabyRecords(records.sort((a,b) => new Date(b.birthDate).getTime() - new Date(a.birthDate).getTime()));
        setBabyRecordsLoading(false);
    }, (error) => {
        console.error(`Error fetching baby records for mother ${motherId}:`, error);
        setBabyRecordsLoading(false);
    });
    return unsubscribe;
  }, []);

  const addBabyRecord = useCallback(async (recordData: Omit<BabyRecord, 'id'>) => {
    const newRef = push(ref(database, 'babyRecords'));
    await set(newRef, { ...recordData, createdAt: serverTimestamp() });
    return { ...recordData, id: newRef.key! } as BabyRecord;
  }, []);

  const updateBabyRecord = useCallback(async (id: string, updates: Partial<Omit<BabyRecord, 'id'>>) => {
    await firebaseUpdate(ref(database, `babyRecords/${id}`), { ...updates, updatedAt: serverTimestamp() });
  }, []);

  const deleteBabyRecord = useCallback(async (id: string) => {
    await firebaseRemove(ref(database, `babyRecords/${id}`));
  }, []);

  const getDoctorScheduleById = useCallback((doctorId: string) => {
    setDoctorScheduleLoading(true);
    const scheduleRef = ref(database, `doctorSchedules/${doctorId}`);
    const unsubscribe = onValue(scheduleRef, (snapshot) => {
      if (snapshot.exists()) {
        setDoctorSchedule({ ...snapshot.val(), id: doctorId, doctorId: doctorId } as DoctorSchedule);
      } else {
        setDoctorSchedule(null);
      }
      setDoctorScheduleLoading(false);
    }, (error) => {
      console.error(`Error fetching schedule for doctor ${doctorId}:`, error);
      setDoctorSchedule(null);
      setDoctorScheduleLoading(false);
    });
    return unsubscribe;
  }, []);

  const saveDoctorSchedule = useCallback(async (scheduleData: Omit<DoctorSchedule, 'id' | 'createdAt' | 'updatedAt'>) => {
    const scheduleRef = ref(database, `doctorSchedules/${scheduleData.doctorId}`);
    const dataToSave: Partial<DoctorSchedule> = {
      ...scheduleData,
      updatedAt: serverTimestamp(),
    };
    const snapshot = await get(scheduleRef);
    if (!snapshot.exists()) {
      dataToSave.createdAt = serverTimestamp();
    }
    await set(scheduleRef, dataToSave);
    return { ...scheduleData, id: scheduleData.doctorId } as DoctorSchedule;
  }, []);

  const getAppointmentsByPatientId = useCallback((patientId: string) => {
    setAppointmentsLoading(true);
    const appointmentsQuery = query(ref(database, 'appointments'), orderByChild('patientId'), equalTo(patientId));
    const unsubscribe = onValue(appointmentsQuery, (snapshot) => {
      const records = snapshotToArray<Appointment>(snapshot);
      records.sort((a, b) => {
        const aDate = parseISO(a.appointmentDateTimeStart);
        const bDate = parseISO(b.appointmentDateTimeStart);
        if (a.status === 'scheduled' && b.status !== 'scheduled') return -1;
        if (a.status !== 'scheduled' && b.status === 'scheduled') return 1;
        if (a.status === 'scheduled' && b.status === 'scheduled') {
          return compareAsc(aDate, bDate);
        }
        return compareAsc(bDate, aDate); 
      });
      setAppointments(records);
      setAppointmentsLoading(false);
    }, (error) => {
      console.error(`Error fetching appointments for patient ${patientId}:`, error);
      setAppointmentsLoading(false);
    });
    return unsubscribe;
  }, []);

  const getAppointmentsByDoctorIdForBooking = useCallback((doctorId: string) => {
    setDoctorAppointmentsLoading(true);
    const appointmentsQuery = query(ref(database, 'appointments'), orderByChild('doctorId'), equalTo(doctorId));
    const unsubscribe = onValue(appointmentsQuery, (snapshot) => {
        const records = snapshotToArray<Appointment>(snapshot);
        setDoctorAppointmentsForBooking(records);
        setDoctorAppointmentsLoading(false);
    }, (error) => {
        console.error(`Error fetching appointments for doctor ${doctorId} (for booking):`, error);
        setDoctorAppointmentsForBooking([]);
        setDoctorAppointmentsLoading(false);
    });
    return unsubscribe;
  }, []);

  const addAppointment = useCallback(async (appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newAppointmentRef = push(ref(database, 'appointments'));

    const patientRec = getPatientById(appointmentData.patientId);
    const doctorRec = getPatientById(appointmentData.doctorId);

    const dataToSave: Omit<Appointment, 'id'> = {
      ...appointmentData,
      patientName: patientRec?.name || 'Unknown Patient',
      doctorName: doctorRec?.name || 'Unknown Doctor',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await set(newAppointmentRef, dataToSave);
    return { ...dataToSave, id: newAppointmentRef.key! } as Appointment;
  }, [getPatientById]);

  const updateAppointmentStatus = useCallback(async (appointmentId: string, status: AppointmentStatus, cancelledByRole?: UserRole, cancellationReason?: string) => {
    const appointmentRef = ref(database, `appointments/${appointmentId}`);
    const updates: Partial<Appointment> = {
      status,
      updatedAt: serverTimestamp(),
    };
    if (status.startsWith('cancelled')) {
      updates.cancelledByRole = cancelledByRole;
      updates.cancellationReason = cancellationReason || (cancelledByRole === 'patient' ? 'Cancelled by patient' : 'Cancelled');
      updates.cancelledById = user?.id; 
    }
    await firebaseUpdate(appointmentRef, updates);
  }, [user?.id]);


  return {
    patients, patientsLoading, getPatients, getPatientById, addPatient, updatePatient, deletePatient,
    consultations, consultationsLoading, getConsultationsByPatientId, addConsultation, updateConsultation, deleteConsultation,
    maternityRecords, maternityRecordsLoading, getMaternityHistoryByPatientId, addMaternityRecord, updateMaternityRecord, deleteMaternityRecord,
    babyRecords, babyRecordsLoading, getBabyRecordsByMotherId, addBabyRecord, updateBabyRecord, deleteBabyRecord,
    doctorSchedule, doctorScheduleLoading, getDoctorScheduleById, saveDoctorSchedule,
    appointments, appointmentsLoading, getAppointmentsByPatientId, updateAppointmentStatus, 
    doctorAppointmentsForBooking, doctorAppointmentsLoading, getAppointmentsByDoctorIdForBooking, 
    addAppointment,
  };
}
