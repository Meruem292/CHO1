
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

  const [babyRecords, setBabyRecords] = useState<BabyRecord[]>([]); // Shared state for general baby record viewing
  const [babyRecordsLoading, setBabyRecordsLoading] = useState(true);

  const [doctorSchedule, setDoctorSchedule] = useState<DoctorSchedule | null>(null);
  const [doctorScheduleLoading, setDoctorScheduleLoading] = useState(true);

  const [allDoctorSchedules, setAllDoctorSchedules] = useState<DoctorSchedule[]>([]);
  const [allDoctorSchedulesLoading, setAllDoctorSchedulesLoading] = useState(true);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);

  const [allAppointmentsForAdmin, setAllAppointmentsForAdmin] = useState<Appointment[]>([]);
  const [allAppointmentsLoading, setAllAppointmentsLoading] = useState(true);

  const [doctorAppointmentsForBooking, setDoctorAppointmentsForBooking] = useState<Appointment[]>([]);
  const [doctorAppointmentsLoading, setDoctorAppointmentsLoading] = useState(true);

  // State for doctor's activity log
  const [doctorActivityConsultations, setDoctorActivityConsultations] = useState<ConsultationRecord[]>([]);
  const [doctorActivityMaternity, setDoctorActivityMaternity] = useState<MaternityRecord[]>([]);
  const [doctorActivityBaby, setDoctorActivityBaby] = useState<BabyRecord[]>([]);
  const [doctorActivityLoading, setDoctorActivityLoading] = useState(true);


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
    const patientRec = patients.find(p => p.id === consultationData.patientId);
    const dataToSave: Omit<ConsultationRecord, 'id'> & { doctorId?: string; doctorName?: string; patientName?: string; } = {
         ...consultationData,
         patientName: patientRec?.name || 'Unknown Patient',
         createdAt: serverTimestamp()
    };

    if (user && user.role === 'doctor') {
        dataToSave.doctorId = user.id;
        dataToSave.doctorName = user.name;
    }

    await set(newRef, dataToSave);
    return { ...dataToSave, id: newRef.key! } as ConsultationRecord;
  }, [user, patients]);

  const updateConsultation = useCallback(async (id: string, updates: Partial<Omit<ConsultationRecord, 'id'>>) => {
    const patientRec = updates.patientId ? patients.find(p => p.id === updates.patientId) : null;
    const dataToUpdate: Partial<Omit<ConsultationRecord, 'id'>> & { doctorId?: string; doctorName?: string; patientName?: string; updatedAt: object } = {
        ...updates,
        updatedAt: serverTimestamp()
    };
    if (patientRec) {
        dataToUpdate.patientName = patientRec.name;
    }

    if (user && user.role === 'doctor' && !updates.doctorId && !updates.doctorName) { 
        dataToUpdate.doctorId = user.id;
        dataToUpdate.doctorName = user.name;
    }

    await firebaseUpdate(ref(database, `consultations/${id}`), dataToUpdate);
  }, [user, patients]);

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
    const patientRec = patients.find(p => p.id === recordData.patientId);
    const dataToSave: Omit<MaternityRecord, 'id'> & { doctorId?: string; doctorName?: string; patientName?: string; } = {
        ...recordData,
        patientName: patientRec?.name || 'Unknown Patient',
        createdAt: serverTimestamp()
    };
    if (user && (user.role === 'doctor' || user.role === 'midwife/nurse')) {
        dataToSave.doctorId = user.id;
        dataToSave.doctorName = user.name;
    }
    await set(newRef, dataToSave);
    return { ...dataToSave, id: newRef.key! } as MaternityRecord;
  }, [user, patients]);

  const updateMaternityRecord = useCallback(async (id: string, updates: Partial<Omit<MaternityRecord, 'id'>>) => {
    const patientRec = updates.patientId ? patients.find(p => p.id === updates.patientId) : null;
    const dataToUpdate: Partial<Omit<MaternityRecord, 'id'>> & { doctorId?: string; doctorName?: string; patientName?: string; updatedAt: object } = {
        ...updates,
        updatedAt: serverTimestamp()
    };
    if (patientRec) {
      dataToUpdate.patientName = patientRec.name;
    }
     if (user && (user.role === 'doctor' || user.role === 'midwife/nurse') && !updates.doctorId && !updates.doctorName) { 
        dataToUpdate.doctorId = user.id;
        dataToUpdate.doctorName = user.name;
    }
    await firebaseUpdate(ref(database, `maternityRecords/${id}`), dataToUpdate);
  }, [user, patients]);

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
        setBabyRecords([]); 
        setBabyRecordsLoading(false);
    });
    return unsubscribe;
  }, []);

  const fetchBabyRecordsForMotherOnce = useCallback(async (motherId: string): Promise<BabyRecord[]> => {
    try {
      const recordsQuery = query(ref(database, 'babyRecords'), orderByChild('motherId'), equalTo(motherId));
      const snapshot = await get(recordsQuery);
      const records = snapshotToArray<BabyRecord>(snapshot);
      return records.sort((a, b) => new Date(b.birthDate).getTime() - new Date(a.birthDate).getTime());
    } catch (error) {
      console.error(`Error fetching baby records once for mother ${motherId}:`, error);
      return [];
    }
  }, []);


  const addBabyRecord = useCallback(async (recordData: Omit<BabyRecord, 'id'>) => {
    const newRef = push(ref(database, 'babyRecords'));
    const motherRec = patients.find(p => p.id === recordData.motherId);
    const dataToSave: Omit<BabyRecord, 'id'> & { doctorId?: string; doctorName?: string; motherName?: string; } = {
        ...recordData,
        motherName: motherRec?.name || 'Unknown Mother',
        createdAt: serverTimestamp()
    };
    if (user && (user.role === 'doctor' || user.role === 'midwife/nurse')) {
        dataToSave.doctorId = user.id;
        dataToSave.doctorName = user.name;
    }
    await set(newRef, dataToSave);
    return { ...dataToSave, id: newRef.key! } as BabyRecord;
  }, [user, patients]);

  const updateBabyRecord = useCallback(async (id: string, updates: Partial<Omit<BabyRecord, 'id'>>) => {
    const motherRec = updates.motherId ? patients.find(p => p.id === updates.motherId) : null;
    const dataToUpdate: Partial<Omit<BabyRecord, 'id'>> & { doctorId?: string; doctorName?: string; motherName?: string; updatedAt: object } = {
        ...updates,
        updatedAt: serverTimestamp()
    };
    if (motherRec) {
      dataToUpdate.motherName = motherRec.name;
    }
    if (user && (user.role === 'doctor' || user.role === 'midwife/nurse') && !updates.doctorId && !updates.doctorName) { 
        dataToUpdate.doctorId = user.id;
        dataToUpdate.doctorName = user.name;
    }
    await firebaseUpdate(ref(database, `babyRecords/${id}`), dataToUpdate);
  }, [user, patients]);

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
      console.error(`Error fetching schedule for provider ${doctorId}:`, error);
      setDoctorSchedule(null);
      setDoctorScheduleLoading(false);
    });
    return unsubscribe;
  }, []);

  const getAllDoctorSchedules = useCallback(() => {
    setAllDoctorSchedulesLoading(true);
    const schedulesRef = ref(database, 'doctorSchedules');
    const unsubscribe = onValue(schedulesRef, (snapshot) => {
      setAllDoctorSchedules(snapshotToArray<DoctorSchedule>(snapshot));
      setAllDoctorSchedulesLoading(false);
    }, (error) => {
      console.error("Error fetching all provider schedules:", error);
      setAllDoctorSchedules([]);
      setAllDoctorSchedulesLoading(false);
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
      let records = snapshotToArray<Appointment>(snapshot);
      records.sort((a, b) => {
        const aDate = parseISO(a.appointmentDateTimeStart || '1970-01-01T00:00:00.000Z');
        const bDate = parseISO(b.appointmentDateTimeStart || '1970-01-01T00:00:00.000Z');
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
      setAppointments([]);
      setAppointmentsLoading(false);
    });
    return unsubscribe;
  }, []);

  const getAppointmentsByDoctorId = useCallback((doctorId: string) => {
    setAppointmentsLoading(true);
    const appointmentsQuery = query(ref(database, 'appointments'), orderByChild('doctorId'), equalTo(doctorId));
    const unsubscribe = onValue(appointmentsQuery, (snapshot) => {
      let records = snapshotToArray<Appointment>(snapshot);
       records.sort((a, b) => {
        const aDate = parseISO(a.appointmentDateTimeStart || '1970-01-01T00:00:00.000Z');
        const bDate = parseISO(b.appointmentDateTimeStart || '1970-01-01T00:00:00.000Z');
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
      console.error(`Error fetching appointments for provider ${doctorId}:`, error);
      setAppointments([]);
      setAppointmentsLoading(false);
    });
    return unsubscribe;
  }, []);

  const getAllAppointments = useCallback(() => {
    setAllAppointmentsLoading(true);
    const appointmentsRef = ref(database, 'appointments');
    const unsubscribe = onValue(appointmentsRef, (snapshot) => {
      let records = snapshotToArray<Appointment>(snapshot);
      records.sort((a, b) => { 
        const aDate = parseISO(a.appointmentDateTimeStart || '1970-01-01T00:00:00.000Z');
        const bDate = parseISO(b.appointmentDateTimeStart || '1970-01-01T00:00:00.000Z');
        const dateComparison = compareAsc(aDate, bDate);
        if (dateComparison !== 0) return dateComparison; 

        if (a.status === 'scheduled' && b.status !== 'scheduled') return -1;
        if (a.status !== 'scheduled' && b.status === 'scheduled') return 1;
        return 0;
      });
      setAllAppointmentsForAdmin(records);
      setAllAppointmentsLoading(false);
    }, (error) => {
      console.error("Error fetching all appointments:", error);
      setAllAppointmentsForAdmin([]);
      setAllAppointmentsLoading(false);
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
        console.error(`Error fetching appointments for provider ${doctorId} (for booking):`, error);
        setDoctorAppointmentsForBooking([]);
        setDoctorAppointmentsLoading(false);
    });
    return unsubscribe;
  }, []);

  const addAppointment = useCallback(async (appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newAppointmentRef = push(ref(database, 'appointments'));
    const patientRec = patients.find(p => p.id === appointmentData.patientId);
    const doctorRec = patients.find(p => p.id === appointmentData.doctorId);

    const dataToSave: Omit<Appointment, 'id'> = {
      ...appointmentData,
      patientName: patientRec?.name || 'Unknown Patient',
      doctorName: doctorRec?.name || 'Unknown Provider',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await set(newAppointmentRef, dataToSave);
    return { ...dataToSave, id: newAppointmentRef.key! } as Appointment;
  }, [patients]); 

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


  // Doctor Activity Log Functions
  const getConsultationsByDoctor = useCallback((doctorId: string) => {
    setDoctorActivityLoading(true);
    const consultsQuery = query(ref(database, 'consultations'), orderByChild('doctorId'), equalTo(doctorId));
    const unsubscribe = onValue(consultsQuery, (snapshot) => {
      const doctorConsults = snapshotToArray<ConsultationRecord>(snapshot)
        .map(c => ({ ...c, patientName: patients.find(p => p.id === c.patientId)?.name || c.patientName || 'Unknown Patient' }))
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDoctorActivityConsultations(doctorConsults);
      setDoctorActivityLoading(false);
    }, (error) => {
      console.error(`Error fetching consultations for provider ${doctorId} activity:`, error);
      setDoctorActivityLoading(false);
    });
    return unsubscribe;
  }, [patients]);

  const getMaternityRecordsByDoctor = useCallback((doctorId: string) => {
    setDoctorActivityLoading(true);
    const maternityQuery = query(ref(database, 'maternityRecords'), orderByChild('doctorId'), equalTo(doctorId));
    const unsubscribe = onValue(maternityQuery, (snapshot) => {
      const doctorMaternity = snapshotToArray<MaternityRecord>(snapshot)
        .map(m => ({ ...m, patientName: patients.find(p => p.id === m.patientId)?.name || m.patientName || 'Unknown Patient' }))
        .sort((a,b) => (b.pregnancyNumber || 0) - (a.pregnancyNumber || 0));
      setDoctorActivityMaternity(doctorMaternity);
      setDoctorActivityLoading(false);
    }, (error) => {
      console.error(`Error fetching maternity records for provider ${doctorId} activity:`, error);
      setDoctorActivityLoading(false);
    });
    return unsubscribe;
  }, [patients]);

  const getBabyRecordsByDoctor = useCallback((doctorId: string) => {
    setDoctorActivityLoading(true);
    const babyQuery = query(ref(database, 'babyRecords'), orderByChild('doctorId'), equalTo(doctorId));
    const unsubscribe = onValue(babyQuery, (snapshot) => {
      const doctorBaby = snapshotToArray<BabyRecord>(snapshot)
        .map(b => ({ ...b, motherName: patients.find(p => p.id === b.motherId)?.name || b.motherName || 'Unknown Mother' }))
        .sort((a,b) => new Date(b.birthDate).getTime() - new Date(a.birthDate).getTime());
      setDoctorActivityBaby(doctorBaby);
      setDoctorActivityLoading(false);
    }, (error) => {
      console.error(`Error fetching baby records for provider ${doctorId} activity:`, error);
      setDoctorActivityLoading(false);
    });
    return unsubscribe;
  }, [patients]);


  return {
    patients, patientsLoading, getPatients, getPatientById, addPatient, updatePatient, deletePatient,
    consultations, consultationsLoading, getConsultationsByPatientId, addConsultation, updateConsultation, deleteConsultation,
    maternityRecords, maternityRecordsLoading, getMaternityHistoryByPatientId, addMaternityRecord, updateMaternityRecord, deleteMaternityRecord,
    babyRecords, babyRecordsLoading, getBabyRecordsByMotherId, fetchBabyRecordsForMotherOnce, addBabyRecord, updateBabyRecord, deleteBabyRecord,
    doctorSchedule, doctorScheduleLoading, getDoctorScheduleById, saveDoctorSchedule,
    allDoctorSchedules, allDoctorSchedulesLoading, getAllDoctorSchedules,
    appointments, appointmentsLoading, getAppointmentsByPatientId, getAppointmentsByDoctorId, updateAppointmentStatus,
    allAppointmentsForAdmin, allAppointmentsLoading, getAllAppointments,
    doctorAppointmentsForBooking, doctorAppointmentsLoading, getAppointmentsByDoctorIdForBooking,
    addAppointment,
    // Doctor Activity Log
    doctorActivityConsultations, doctorActivityMaternity, doctorActivityBaby, doctorActivityLoading,
    getConsultationsByDoctor, getMaternityRecordsByDoctor, getBabyRecordsByDoctor,
  };
}
