
'use client';

import type { Patient, ConsultationRecord, MaternityRecord, BabyRecord } from '@/types';
import { useState, useEffect, useCallback } from 'react';
import { database } from '@/lib/firebase-config';
import { ref, onValue, set, push, update as firebaseUpdate, remove as firebaseRemove, child, serverTimestamp, query, orderByChild, equalTo } from 'firebase/database';
import { useAuth } from './use-auth-hook'; // To get current user for potential filtering/rules

// Helper to transform Firebase snapshot to array
const snapshotToArray = <T extends { id: string }>(snapshot: any): T[] => {
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  // If data is null (e.g., a path exists but has no children, or it's explicitly null),
  // or if data is not an object (though Firebase usually returns objects or null for paths),
  // Object.keys(data) would throw.
  if (data === null || typeof data !== 'object') {
    return [];
  }
  return Object.keys(data).map(key => ({ ...data[key], id: key } as T));
};


export function useMockDb() {
  const { user } = useAuth(); // Get current user for potential rules or filtering

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);

  const [consultations, setConsultations] = useState<ConsultationRecord[]>([]);
  const [consultationsLoading, setConsultationsLoading] = useState(true);
  
  const [maternityRecords, setMaternityRecords] = useState<MaternityRecord[]>([]);
  const [maternityRecordsLoading, setMaternityRecordsLoading] = useState(true);

  const [babyRecords, setBabyRecords] = useState<BabyRecord[]>([]);
  const [babyRecordsLoading, setBabyRecordsLoading] = useState(true);


  // Fetch all patients
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

  // Patient operations
  const getPatients = useCallback(() => patients, [patients]);
  const getPatientById = useCallback((id: string) => patients.find(p => p.id === id), [patients]);

  const addPatient = useCallback(async (patientData: Omit<Patient, 'id'>) => {
    const newPatientRef = push(ref(database, 'patients'));
    await set(newPatientRef, { ...patientData, createdAt: serverTimestamp() });
    // The onValue listener will update the local state.
    // Return an optimistic ID or fetch the new patient if needed for immediate UI update.
    return { ...patientData, id: newPatientRef.key! } as Patient;
  }, []);

  const updatePatient = useCallback(async (id: string, updates: Partial<Omit<Patient, 'id'>>) => {
    const patientRef = ref(database, `patients/${id}`);
    await firebaseUpdate(patientRef, { ...updates, updatedAt: serverTimestamp() });
    // onValue updates local state
  }, []);

  const deletePatient = useCallback(async (id: string) => {
    await firebaseRemove(ref(database, `patients/${id}`));
    // Also delete related records - this is complex and needs careful handling of data integrity.
    // For simplicity, we'll rely on onValue updates if an app shows aggregated data.
    // Or, perform cascading deletes if business logic requires.
    // For now, only patient is deleted. Cascading deletes should be handled server-side or via more specific client logic.
    // Example: Delete associated consultations (if any)
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

  }, []);


  // Consultation operations
  const getConsultationsByPatientId = useCallback((patientId: string) => {
    // This requires fetching specific to a patientId.
    // For simplicity, if all consultations are already loaded, filter locally.
    // A more optimized way would be to query Firebase directly if consultations list is large.
    // For now, filtering locally assuming all are loaded by a general listener if needed,
    // or we need a separate useEffect for this.
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
    return unsubscribe; // The component using this should call this to cleanup
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


  // Maternity Record operations
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


  // Baby Health Record operations
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

  return {
    // Patients
    patients,
    patientsLoading,
    getPatients, // This can be removed if patients array is directly used
    getPatientById, // This can be derived from patients array if needed
    addPatient,
    updatePatient,
    deletePatient,
    // Consultations
    consultations, // State for currently loaded consultations (specific to a patient)
    consultationsLoading,
    getConsultationsByPatientId, // This function now initiates fetching and returns unsubscribe
    addConsultation,
    updateConsultation,
    deleteConsultation,
    // Maternity
    maternityRecords, // State for currently loaded maternity records
    maternityRecordsLoading,
    getMaternityHistoryByPatientId, // Initiates fetching, returns unsubscribe
    addMaternityRecord,
    updateMaternityRecord,
    deleteMaternityRecord,
    // Baby Health
    babyRecords, // State for currently loaded baby records
    babyRecordsLoading,
    getBabyRecordsByMotherId, // Initiates fetching, returns unsubscribe
    addBabyRecord,
    updateBabyRecord,
    deleteBabyRecord,
  };
}
