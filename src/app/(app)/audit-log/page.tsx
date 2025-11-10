
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth-hook';
import { useAudit } from '@/hooks/use-audit';
import { DataTable } from '@/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import type { AuditLog } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ChevronLeft, ListOrdered, ShieldAlert } from 'lucide-react';
import { format, fromUnixTime, isValid } from 'date-fns';

const PH_TIMEZONE = 'Asia/Manila';

function formatTimestamp(timestamp: any): string {
  if (!timestamp || typeof timestamp !== 'number') return "N/A";
  try {
    // Firebase serverTimestamp is milliseconds since epoch on read.
    const date = new Date(timestamp);
    if (!isValid(date)) {
        return "Invalid Date";
    }
    const datePart = new Intl.DateTimeFormat('en-US', { timeZone: PH_TIMEZONE, year: 'numeric', month: 'short', day: 'numeric' }).format(date);
    const timePart = new Intl.DateTimeFormat('en-US', { timeZone: PH_TIMEZONE, hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).format(date);
    return `${datePart}, ${timePart}`;
  } catch (error) {
    console.error("Error formatting timestamp:", timestamp, error);
    return "Invalid Date";
  }
}

export default function AuditLogPage() {
  const { user } = useAuth();
  const { getAuditLogs } = useAudit();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only admins should fetch the full log for now.
    // This can be expanded later to fetch user-specific logs.
    if (user?.role === 'admin') {
      const unsubscribe = getAuditLogs(200, setLogs, setIsLoading); // Fetch last 200 logs
      return () => unsubscribe();
    } else {
      setIsLoading(false);
      setLogs([]);
    }
  }, [user, getAuditLogs]);

  const columns: ColumnDef<AuditLog>[] = useMemo(() => [
    {
      accessorKey: 'timestamp',
      header: 'Timestamp',
      cell: ({ row }) => formatTimestamp(row.original.timestamp),
    },
    {
      accessorKey: 'userName',
      header: 'User',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.userName}</span>
          <span className="text-xs text-muted-foreground">{row.original.userRole}</span>
        </div>
      ),
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }) => {
        const action = row.original.action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        return <span className="font-mono text-xs">{action}</span>;
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => <p className="max-w-md truncate">{row.original.description}</p>,
    },
     {
      accessorKey: 'targetId',
      header: 'Target ID',
      cell: ({ row }) => <p className="font-mono text-xs">{row.original.targetId || 'N/A'}</p>,
    },
  ], []);

  if (isLoading && user?.role === 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading audit logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="flex items-center text-sm text-primary hover:underline mb-4">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <ListOrdered className="mr-3 h-8 w-8 text-primary" /> Audit Log
        </h1>
      </div>
      <p className="text-muted-foreground">
        A chronological record of significant activities within the application.
      </p>

      {user?.role !== 'admin' && (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Administrator View</AlertTitle>
          <AlertDescription>
            The full application audit log is available for administrators only. Future updates may include a view of your own activities.
          </AlertDescription>
        </Alert>
      )}

      {user?.role === 'admin' && logs.length === 0 && !isLoading && (
        <Alert>
          <ListOrdered className="h-4 w-4" />
          <AlertTitle>No Logs Found</AlertTitle>
          <AlertDescription>There are no audit log entries in the system yet.</AlertDescription>
        </Alert>
      )}
      
      {user?.role === 'admin' && logs.length > 0 && (
        <DataTable
          columns={columns}
          data={logs}
          filterColumnId="userName" // Default filter
          filterPlaceholder="Filter by user, action, or description..."
        />
      )}
    </div>
  );
}
