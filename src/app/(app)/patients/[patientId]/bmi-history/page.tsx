
'use client';

import React, { use, useEffect, useMemo } from 'react';
import type { BmiRecord } from '@/types';
import { useMockDb } from '@/hooks/use-mock-db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, TrendingUp, History, User } from 'lucide-react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts';
import { DataTable } from '@/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';

const PH_TIMEZONE = 'Asia/Manila';

function formatInPHTime_PPP(date: Date | string | undefined): string {
  if (!date) return 'N/A';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return new Intl.DateTimeFormat('en-US', { timeZone: PH_TIMEZONE, year: 'numeric', month: 'short', day: 'numeric' }).format(d);
  } catch (e) {
    return 'Invalid Date';
  }
}

interface ResolvedPageParams {
  patientId: string;
}

interface BmiHistoryPageProps {
  params: Promise<ResolvedPageParams>;
}

export default function BmiHistoryPage({ params: paramsPromise }: BmiHistoryPageProps) {
  const actualParams = use(paramsPromise);
  const { patientId } = actualParams;
  const { bmiHistory, bmiHistoryLoading, getBmiHistoryByPatientId } = useMockDb();

  useEffect(() => {
    const unsubscribe = getBmiHistoryByPatientId(patientId);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [patientId, getBmiHistoryByPatientId]);

  const chartData = useMemo(() => {
    return bmiHistory.map(record => ({
      date: format(parseISO(record.date), 'MMM d, yyyy'),
      BMI: record.bmi,
      Weight: record.weightKg,
    })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [bmiHistory]);

  const columns: ColumnDef<BmiRecord>[] = useMemo(() => [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => formatInPHTime_PPP(row.original.date),
    },
    {
      accessorKey: 'weightKg',
      header: 'Weight (kg)',
      cell: ({ row }) => `${row.original.weightKg.toFixed(1)} kg`,
    },
    {
      accessorKey: 'heightM',
      header: 'Height (m)',
       cell: ({ row }) => `${row.original.heightM.toFixed(2)} m`,
    },
    {
      accessorKey: 'bmi',
      header: 'BMI',
       cell: ({ row }) => row.original.bmi.toFixed(2),
    },
    {
      accessorKey: 'recordedByName',
      header: 'Recorded By',
    },
  ], []);

  if (bmiHistoryLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading BMI history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      {bmiHistory.length === 0 ? (
        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertTitle>No BMI History Found</AlertTitle>
          <AlertDescription>
            There are no weight and height records to display a BMI history. Records are added when a provider updates the patient's profile.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><TrendingUp className="mr-2 h-5 w-5 text-primary" />BMI Trend</CardTitle>
              <CardDescription>Visual representation of the patient's BMI over time.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'BMI', angle: -90, position: 'insideLeft', fill: 'hsl(var(--foreground))' }} />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'Weight (kg)', angle: 90, position: 'insideRight', fill: 'hsl(var(--foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                    }}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="BMI" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--chart-1))" }} activeDot={{ r: 6 }} />
                  <Line yAxisId="right" type="monotone" dataKey="Weight" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--chart-2))" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><History className="mr-2 h-5 w-5 text-primary" />Historical Data</CardTitle>
              <CardDescription>Detailed log of all recorded BMI entries.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={bmiHistory}
                filterColumnId="recordedByName"
                filterPlaceholder="Filter by recorder..."
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
