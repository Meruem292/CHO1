'use client';

import type { Patient, ConsultationRecord, MaternityRecord, BabyRecord } from '@/types';
import { useState, useEffect, useCallback } from 'react';

const createMockId = () => `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };
  return [storedValue, setValue] as const;
}


export function useMockDb() {
  const [patients, setPatients] = useLocalStorage<Patient[]>('mockPatients', []);
  const [consultations, setConsultations] = useLocalStorage<ConsultationRecord[]>('mockConsultations', []);
  const [maternityRecords, setMaternityRecords] = useLocalStorage<MaternityRecord[]>('mockMaternityRecords', []);
  const [babyRecords, setBabyRecords] = useLocalStorage<BabyRecord[]>('mockBabyRecords', []);

  // Initialize with some default data if empty
  useEffect(() => {
    if (patients.length === 0) {
        const initialPatientId = createMockId();
        setPatients([{ id: initialPatientId, name: 'Jane Doe', dateOfBirth: '1990-01-01', contact: '555-1234', address: '123 Main St' }]);
        setConsultations([{ id: createMockId(), patientId: initialPatientId, date: new Date().toISOString().split('T')[0], notes: 'Initial checkup, patient is healthy.', diagnosis: 'Healthy', treatmentPlan: 'Routine follow-up in 6 months.'}])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount


  // Patient CRUD
  const getPatients = useCallback(() => patients, [patients]);
  const getPatientById = useCallback((id: string) => patients.find(p => p.id === id), [patients]);
  const addPatient = useCallback((patientData: Omit<Patient, 'id'>) => {
    const newPatient: Patient = { ...patientData, id: createMockId() };
    setPatients(prev => [...prev, newPatient]);
    return newPatient;
  }, [setPatients]);
  const updatePatient = useCallback((id: string, updates: Partial<Patient>) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, [setPatients]);
  const deletePatient = useCallback((id: string) => {
    setPatients(prev => prev.filter(p => p.id !== id));
    // Also delete related records
    setConsultations(prev => prev.filter(c => c.patientId !== id));
    setMaternityRecords(prev => prev.filter(m => m.patientId !== id));
    setBabyRecords(prev => prev.filter(b => b.motherId !== id));
  }, [setPatients, setConsultations, setMaternityRecords, setBabyRecords]);

  // Consultation CRUD
  const getConsultationsByPatientId = useCallback((patientId: string) => consultations.filter(c => c.patientId === patientId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [consultations]);
  const addConsultation = useCallback((consultationData: Omit<ConsultationRecord, 'id'>) => {
    const newConsultation: ConsultationRecord = { ...consultationData, id: createMockId() };
    setConsultations(prev => [...prev, newConsultation]);
    return newConsultation;
  }, [setConsultations]);
   const updateConsultation = useCallback((id: string, updates: Partial<ConsultationRecord>) => {
    setConsultations(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, [setConsultations]);
  const deleteConsultation = useCallback((id: string) => {
    setConsultations(prev => prev.filter(c => c.id !== id));
  }, [setConsultations]);


  // Maternity CRUD
  const getMaternityHistoryByPatientId = useCallback((patientId: string) => maternityRecords.filter(m => m.patientId === patientId).sort((a,b) => b.pregnancyNumber - a.pregnancyNumber), [maternityRecords]);
  const addMaternityRecord = useCallback((recordData: Omit<MaternityRecord, 'id'>) => {
    const newRecord: MaternityRecord = { ...recordData, id: createMockId() };
    setMaternityRecords(prev => [...prev, newRecord]);
    return newRecord;
  }, [setMaternityRecords]);
  const updateMaternityRecord = useCallback((id: string, updates: Partial<MaternityRecord>) => {
    setMaternityRecords(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }, [setMaternityRecords]);
  const deleteMaternityRecord = useCallback((id: string) => {
    setMaternityRecords(prev => prev.filter(m => m.id !== id));
  }, [setMaternityRecords]);


  // Baby Health CRUD
  const getBabyRecordsByMotherId = useCallback((motherId: string) => babyRecords.filter(b => b.motherId === motherId).sort((a,b) => new Date(b.birthDate).getTime() - new Date(a.birthDate).getTime()), [babyRecords]);
  const addBabyRecord = useCallback((recordData: Omit<BabyRecord, 'id'>) => {
    const newRecord: BabyRecord = { ...recordData, id: createMockId() };
    setBabyRecords(prev => [...prev, newRecord]);
    return newRecord;
  }, [setBabyRecords]);
  const updateBabyRecord = useCallback((id: string, updates: Partial<BabyRecord>) => {
    setBabyRecords(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }, [setBabyRecords]);
  const deleteBabyRecord = useCallback((id: string) => {
    setBabyRecords(prev => prev.filter(b => b.id !== id));
  }, [setBabyRecords]);


  return {
    // Patients
    getPatients,
    getPatientById,
    addPatient,
    updatePatient,
    deletePatient,
    // Consultations
    getConsultationsByPatientId,
    addConsultation,
    updateConsultation,
    deleteConsultation,
    // Maternity
    getMaternityHistoryByPatientId,
    addMaternityRecord,
    updateMaternityRecord,
    deleteMaternityRecord,
    // Baby Health
    getBabyRecordsByMotherId,
    addBabyRecord,
    updateBabyRecord,
    deleteBabyRecord,
  };
}
