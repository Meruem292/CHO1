
'use client';

import { useCallback } from 'react';
import { database } from '@/lib/firebase-config';
import { ref, push, set, serverTimestamp, query, orderByChild, limitToLast, onValue } from 'firebase/database';
import type { AuditLog, AuditLogAction, UserRole, User } from '@/types';

// Centralized function to create an audit log
export const createAuditLog = async (
  currentUser: User,
  action: AuditLogAction,
  description: string,
  targetId?: string,
  targetType?: string,
  details?: Record<string, any>
) => {
  if (!currentUser) {
    console.error("Cannot create audit log: current user is not available.");
    return;
  }

  const logEntry: Omit<AuditLog, 'id'> = {
    timestamp: serverTimestamp(),
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    action,
    description,
    targetId,
    targetType,
    details,
  };

  // Remove undefined properties before sending to Firebase
  Object.keys(logEntry).forEach(key => {
    const K = key as keyof typeof logEntry;
    if (logEntry[K] === undefined) {
      delete logEntry[K];
    }
  });


  try {
    const logRef = push(ref(database, 'auditLogs'));
    await set(logRef, logEntry);
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Depending on requirements, you might want to handle this more gracefully
  }
};


// Hook for using audit log functionality in components
export function useAudit() {
  
  const logAction = useCallback(async (
    currentUser: User,
    action: AuditLogAction,
    description: string,
    targetId?: string,
    targetType?: string,
    details?: Record<string, any>
  ) => {
    await createAuditLog(currentUser, action, description, targetId, targetType, details);
  }, []);


  const getAuditLogs = useCallback((
    limit: number, 
    setLogs: (logs: AuditLog[]) => void, 
    setIsLoading: (loading: boolean) => void
  ) => {
    setIsLoading(true);
    const logsQuery = query(ref(database, 'auditLogs'), orderByChild('timestamp'), limitToLast(limit));

    const unsubscribe = onValue(logsQuery, (snapshot) => {
      const logs: AuditLog[] = [];
      snapshot.forEach(childSnapshot => {
        logs.push({ id: childSnapshot.key!, ...childSnapshot.val() });
      });
      // Firebase returns ascending, so we reverse for most-recent-first
      setLogs(logs.reverse());
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching audit logs:", error);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  return { logAction, getAuditLogs };
}
