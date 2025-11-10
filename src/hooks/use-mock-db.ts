
'use client';

import type { Patient, ConsultationRecord, MaternityRecord, BabyRecord, DoctorSchedule, Appointment, AppointmentStatus, UserRole, DayOfWeek, AuditLogAction } from '@/types';
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
import { createAuditLog } from './use-audit';


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

  // New state for archived data
  const [archivedPatients, setArchivedPatients] = useState<Patient[]>([]);
  const [archivedPatientsLoading, setArchivedPatientsLoading] = useState(true);
  const [archivedConsultations, setArchivedConsultations] = useState<ConsultationRecord[]>([]);
  const [archivedConsultationsLoading, setArchivedConsultationsLoading] = useState(true);
  const [archivedMaternityRecords, setArchivedMaternityRecords] = useState<MaternityRecord[]>([]);
  const [archivedMaternityRecordsLoading, setArchivedMaternityRecordsLoading] = useState(true);
  const [archivedBabyRecords, setArchivedBabyRecords] = useState<BabyRecord[]>([]);
  const [archivedBabyRecordsLoading, setArchivedBabyRecordsLoading] = useState(true);


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
    if (!user) throw new Error("User must be logged in to add a patient.");
    const newPatientRef = push(ref(database, 'patients'));
    const dataToSave: Omit<Patient, 'id'> = { ...patientData, role: 'patient', createdAt: serverTimestamp() };
    await set(newPatientRef, dataToSave);
    const newId = newPatientRef.key!;
    await createAuditLog(user, 'patient_record_created', `Created patient record for ${dataToSave.name}`, newId, 'patient');
    return { ...dataToSave, id: newId } as Patient;
  }, [user]);

  const updatePatient = useCallback(async (id: string, updates: Partial<Omit<Patient, 'id'>>) => {
     if (!user) throw new Error("User must be logged in to update a patient.");
    const patientRef = ref(database, `patients/${id}`);
    await firebaseUpdate(patientRef, { ...updates, updatedAt: serverTimestamp() });
     await createAuditLog(user, 'patient_record_updated', `Updated patient record for ${updates.name || id}`, id, 'patient', { changes: updates });
  }, [user]);

  const archiveRecord = useCallback(async (sourcePath: string, archivePath: string, recordId: string, recordName: string, recordType: string, auditAction: AuditLogAction) => {
    if (!user) throw new Error("User must be logged in to archive a record.");
    const sourceRef = ref(database, `${sourcePath}/${recordId}`);
    const snapshot = await get(sourceRef);
    if (snapshot.exists()) {
        const recordData = snapshot.val();
        const archiveRef = ref(database, `${archivePath}/${recordId}`);
        await set(archiveRef, { ...recordData, archivedAt: serverTimestamp(), archivedBy: user.id });
        await firebaseRemove(sourceRef);
        await createAuditLog(user, auditAction, `Archived ${recordType} record for ${recordName}`, recordId, recordType);
    } else {
        throw new Error(`Record not found at ${sourcePath}/${recordId} to archive.`);
    }
  }, [user]);

  const deletePatient = useCallback(async (id: string) => {
    const patient = patients.find(p => p.id === id);
    await archiveRecord('patients', 'archivedData/patients', id, patient?.name || id, 'patient', 'patient_record_archived');
  }, [archiveRecord, patients]);

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
    if (!user) throw new Error("User must be logged in to add a consultation.");
    const newRef = push(ref(database, 'consultations'));
    const patientRec = patients.find(p => p.id === consultationData.patientId);
    
    // Add default values for fields that might be missing from a patient-submitted form
    const dataToSave: Omit<ConsultationRecord, 'id'> & { doctorId?: string; doctorName?: string; patientName?: string; } = {
         notes: '', // default empty notes
         ...consultationData,
         patientName: patientRec?.name || 'Unknown Patient',
         createdAt: serverTimestamp()
    };

    if (user && user.role === 'doctor') {
        dataToSave.doctorId = user.id;
        dataToSave.doctorName = user.name;
    } else if (user && user.role === 'patient') {
        // doctorName is already set to "Patient Entry" in the component
    }

    const newId = newRef.key!;
    await set(newRef, dataToSave);
    const actionBy = dataToSave.doctorName === "Patient Entry" ? "Patient" : dataToSave.doctorName;
    await createAuditLog(user, 'consultation_created', `Added consultation for ${dataToSave.patientName} (Entry by: ${actionBy})`, newId, 'consultation');
    return { ...dataToSave, id: newId } as ConsultationRecord;
}, [user, patients]);


  const updateConsultation = useCallback(async (id: string, updates: Partial<Omit<ConsultationRecord, 'id'>>) => {
    if (!user) throw new Error("User must be logged in to update a consultation.");
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
    await createAuditLog(user, 'consultation_updated', `Updated consultation for ${dataToUpdate.patientName || id}`, id, 'consultation', { changes: updates });
  }, [user, patients]);

  const deleteConsultation = useCallback(async (id: string) => {
    const consultation = consultations.find(c => c.id === id);
    await archiveRecord('consultations', 'archivedData/consultations', id, consultation?.patientName || id, 'consultation', 'consultation_deleted');
  }, [archiveRecord, consultations]);

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
    if (!user) throw new Error("User must be logged in to add a record.");
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
    const newId = newRef.key!;
    await set(newRef, dataToSave);
    await createAuditLog(user, 'maternity_record_created', `Added maternity record #${recordData.pregnancyNumber} for ${dataToSave.patientName}`, newId, 'maternityRecord');
    return { ...dataToSave, id: newId } as MaternityRecord;
  }, [user, patients]);

  const updateMaternityRecord = useCallback(async (id: string, updates: Partial<Omit<MaternityRecord, 'id'>>) => {
    if (!user) throw new Error("User must be logged in to update a record.");
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
    await createAuditLog(user, 'maternity_record_updated', `Updated maternity record #${updates.pregnancyNumber} for ${dataToUpdate.patientName || id}`, id, 'maternityRecord', { changes: updates });
  }, [user, patients]);

  const deleteMaternityRecord = useCallback(async (id: string) => {
    const record = maternityRecords.find(m => m.id === id);
    await archiveRecord('maternityRecords', 'archivedData/maternityRecords', id, `Pregnancy #${record?.pregnancyNumber} for ${record?.patientName || id}`, 'maternity record', 'maternity_record_deleted');
  }, [archiveRecord, maternityRecords]);

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
    if (!user) throw new Error("User must be logged in to add a record.");
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
    const newId = newRef.key!;
    await set(newRef, dataToSave);
    await createAuditLog(user, 'baby_record_created', `Added baby record for ${recordData.name || 'unnamed baby'} of ${dataToSave.motherName}`, newId, 'babyRecord');
    return { ...dataToSave, id: newId } as BabyRecord;
  }, [user, patients]);

  const updateBabyRecord = useCallback(async (id: string, updates: Partial<Omit<BabyRecord, 'id'>>) => {
    if (!user) throw new Error("User must be logged in to update a record.");
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
    await createAuditLog(user, 'baby_record_updated', `Updated baby record for ${updates.name || id}`, id, 'babyRecord', { changes: updates });
  }, [user, patients]);

  const deleteBabyRecord = useCallback(async (id: string) => {
    const record = babyRecords.find(b => b.id === id);
    await archiveRecord('babyRecords', 'archivedData/babyRecords', id, record?.name || id, 'baby record', 'baby_record_deleted');
  }, [archiveRecord, babyRecords]);

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
    if (!user) throw new Error("User must be logged in to save a schedule.");
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
    await createAuditLog(user, 'schedule_updated', `Updated schedule for provider ID ${scheduleData.doctorId}`, scheduleData.doctorId, 'doctorSchedule');
    return { ...scheduleData, id: scheduleData.doctorId } as DoctorSchedule;
  }, [user]);

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
    if (!user) throw new Error("User must be logged in to add an appointment.");
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

    const newId = newAppointmentRef.key!;
    await set(newAppointmentRef, dataToSave);
    await createAuditLog(user, 'appointment_booked', `Booked appointment for ${dataToSave.patientName} with ${dataToSave.doctorName}`, newId, 'appointment');
    return { ...dataToSave, id: newId } as Appointment;
  }, [patients, user]); 

  const updateAppointmentStatus = useCallback(async (appointmentId: string, status: AppointmentStatus, cancelledByRole?: UserRole, cancellationReason?: string) => {
    if (!user) throw new Error("User must be logged in to update an appointment.");
    const appointmentRef = ref(database, `appointments/${appointmentId}`);
    const updates: Partial<Appointment> = {
      status,
      updatedAt: serverTimestamp(),
    };

    let logActionType: AuditLogAction = 'appointment_completed';
    let logDescription = `Marked appointment ${appointmentId} as completed.`;

    if (status.startsWith('cancelled')) {
      updates.cancelledByRole = cancelledByRole;
      updates.cancellationReason = cancellationReason || (cancelledByRole === 'patient' ? 'Cancelled by patient' : 'Cancelled');
      updates.cancelledById = user?.id;
      logActionType = 'appointment_cancelled';
      logDescription = `Cancelled appointment ${appointmentId}. Reason: ${updates.cancellationReason}`;
    }
    
    await firebaseUpdate(appointmentRef, updates);
    await createAuditLog(user, logActionType, logDescription, appointmentId, 'appointment');
  }, [user]);


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

  // Archive-related functions
  const getArchivedData = useCallback((dataType: 'patients' | 'consultations' | 'maternityRecords' | 'babyRecords') => {
    const setLoading = {
      patients: setArchivedPatientsLoading,
      consultations: setArchivedConsultationsLoading,
      maternityRecords: setArchivedMaternityRecordsLoading,
      babyRecords: setArchivedBabyRecordsLoading,
    }[dataType];
    const setData = {
      patients: setArchivedPatients,
      consultations: setArchivedConsultations,
      maternityRecords: setArchivedMaternityRecords,
      babyRecords: setArchivedBabyRecords,
    }[dataType];

    setLoading(true);
    const archiveRef = ref(database, `archivedData/${dataType}`);
    const unsubscribe = onValue(archiveRef, (snapshot) => {
      setData(snapshotToArray(snapshot));
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching archived ${dataType}:`, error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const restoreArchivedRecord = useCallback(async (dataType: 'patients' | 'consultations' | 'maternityRecords' | 'babyRecords', recordId: string) => {
     if (!user) throw new Error("User must be logged in to restore a record.");
    const archiveRef = ref(database, `archivedData/${dataType}/${recordId}`);
    const snapshot = await get(archiveRef);
    if (snapshot.exists()) {
      let recordData = snapshot.val();
      const originalName = recordData.name || recordData.patientName || recordId;
      delete recordData.archivedAt; // Remove archive timestamp
      delete recordData.archivedBy;
      
      const destinationPath = {
        patients: 'patients',
        consultations: 'consultations',
        maternityRecords: 'maternityRecords',
        babyRecords: 'babyRecords',
      }[dataType];
      
      const destinationRef = ref(database, `${destinationPath}/${recordId}`);
      await set(destinationRef, recordData);
      await firebaseRemove(archiveRef);
      await createAuditLog(user, 'record_restored' as AuditLogAction, `Restored ${dataType.slice(0, -1)} record for ${originalName}`, recordId, dataType);
    } else {
      throw new Error(`Archived record not found to restore.`);
    }
  }, [user]);

  const permanentlyDeleteRecord = useCallback(async (dataType: 'patients' | 'consultations' | 'maternityRecords' | 'babyRecords', recordId: string) => {
    if (!user) throw new Error("User must be logged in to delete a record.");
    const archiveRef = ref(database, `archivedData/${dataType}/${recordId}`);
    const snapshot = await get(archiveRef);
    const recordName = snapshot.exists() ? snapshot.val().name || snapshot.val().patientName || recordId : recordId;
    await firebaseRemove(archiveRef);
    await createAuditLog(user, 'record_permanently_deleted' as AuditLogAction, `Permanently deleted ${dataType.slice(0, -1)} record for ${recordName}`, recordId, dataType);
  }, [user]);


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
    // Archive
    archivedPatients, archivedPatientsLoading,
    archivedConsultations, archivedConsultationsLoading,
    archivedMaternityRecords, archivedMaternityRecordsLoading,
    archivedBabyRecords, archivedBabyRecordsLoading,
    getArchivedData, restoreArchivedRecord, permanentlyDeleteRecord,
  };
}

    