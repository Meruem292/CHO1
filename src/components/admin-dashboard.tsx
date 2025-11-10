
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { Patient, Appointment } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { DatePickerWithRange } from '@/components/ui/date-range-picker'; // Assume this exists or we'll create it
import type { DateRange } from 'react-day-picker';
import { addDays, format, isAfter, isBefore, isFuture, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { Users, Stethoscope, CalendarClock, CheckCircle, XCircle, TrendingUp, BarChart3, PieChart as PieIcon, Filter, Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface AdminDashboardProps {
  allPatients: Patient[];
  allAppointments: Appointment[];
  isLoading: boolean;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-background border border-border rounded-md shadow-lg">
        <p className="label font-medium">{`${label || payload[0].name} : ${payload[0].value}`}</p>
        {payload[0].payload.percentage && <p className="text-sm text-muted-foreground">{`(${(payload[0].payload.percentage * 100).toFixed(1)}%)`}</p>}
      </div>
    );
  }
  return null;
};


export function AdminDashboard({ allPatients, allAppointments, isLoading }: AdminDashboardProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const providers = useMemo(() => allPatients.filter(p => p.role === 'doctor' || p.role === 'midwife/nurse'), [allPatients]);
  const patients = useMemo(() => allPatients.filter(p => p.role === 'patient'), [allPatients]);

  const filteredAppointments = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      return allAppointments;
    }
    return allAppointments.filter(app => {
      try {
        const appDate = parseISO(app.appointmentDateTimeStart);
        return isWithinInterval(appDate, { start: startOfDay(dateRange.from!), end: endOfDay(dateRange.to!) });
      } catch (e) {
        return false; // Invalid date string
      }
    });
  }, [allAppointments, dateRange]);

  const stats = useMemo(() => {
    const futureScheduled = filteredAppointments.filter(app => app.status === 'scheduled' && app.appointmentDateTimeStart && isFuture(parseISO(app.appointmentDateTimeStart))).length;
    const completed = filteredAppointments.filter(app => app.status === 'completed').length;
    const cancelled = filteredAppointments.filter(app => app.status.startsWith('cancelled')).length;
    return {
      totalPatients: patients.length,
      totalProviders: providers.length,
      futureScheduled,
      completed,
      cancelled,
    };
  }, [patients, providers, filteredAppointments]);

  const appointmentsByStatusData = useMemo(() => {
    const scheduled = stats.futureScheduled;
    const completed = stats.completed;
    const cancelled = stats.cancelled;
    const total = scheduled + completed + cancelled;
    if (total === 0) return [];

    return [
      { name: 'Scheduled (Future)', value: scheduled, percentage: total > 0 ? scheduled / total : 0, fill: COLORS[0] },
      { name: 'Completed', value: completed, percentage: total > 0 ? completed / total : 0, fill: COLORS[1] },
      { name: 'Cancelled', value: cancelled, percentage: total > 0 ? cancelled / total : 0, fill: COLORS[2] },
    ].filter(item => item.value > 0);
  }, [stats]);

  const appointmentsPerProviderData = useMemo(() => {
    return providers.map(doc => ({
      name: doc.name.length > 20 ? doc.name.substring(0, 17) + '...' : doc.name, // Truncate long names
      appointments: filteredAppointments.filter(app => app.doctorId === doc.id).length,
    })).filter(d => d.appointments > 0)
       .sort((a,b) => b.appointments - a.appointments) // Sort by most appointments
       .slice(0,10); // Limit to top 10 for readability
  }, [providers, filteredAppointments]);
  
  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-3 text-lg">Loading admin analytics...</p>
        </div>
    );
  }


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold font-headline flex items-center">
            <TrendingUp className="mr-3 h-6 w-6 text-primary" />
            Platform Analytics Overview
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
          </div>
        </CardHeader>
        <CardDescription className="px-6 pb-4 text-sm text-muted-foreground">
          Displaying data {dateRange?.from ? `from ${format(dateRange.from, "LLL dd, y")}` : ''} {dateRange?.to ? `to ${format(dateRange.to, "LLL dd, y")}` : ''}.
        </CardDescription>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard title="Total Patients" value={stats.totalPatients} icon={Users} />
        <StatCard title="Total Providers" value={stats.totalProviders} icon={Stethoscope} />
        <StatCard title="Scheduled Appointments" value={stats.futureScheduled} icon={CalendarClock} description="Future & Active" />
        <StatCard title="Completed Appointments" value={stats.completed} icon={CheckCircle} />
        <StatCard title="Cancelled Appointments" value={stats.cancelled} icon={XCircle} />
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center"><PieIcon className="mr-2 h-5 w-5 text-primary" />Appointments by Status</CardTitle>
            <CardDescription>Distribution of appointments in the selected period.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
           {appointmentsByStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={appointmentsByStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${(percentage * 100).toFixed(0)}%)`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {appointmentsByStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
                 <Legend
                    formatter={(value, entry) => <span className="text-sm text-muted-foreground">{entry.payload?.name}</span>}
                    iconSize={10}
                    wrapperStyle={{fontSize: '0.8rem'}}
                 />
              </PieChart>
            </ResponsiveContainer>
             ) : (
                <NoDataAlert type="appointments by status" />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center"><BarChart3 className="mr-2 h-5 w-5 text-primary" />Appointments Per Provider</CardTitle>
             <CardDescription>Top providers by appointment volume in the selected period.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
          {appointmentsPerProviderData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={appointmentsPerProviderData} layout="vertical" margin={{ right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border) / 0.5)" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} interval={0} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}/>
                <Legend wrapperStyle={{fontSize: '0.8rem'}} />
                <Bar dataKey="appointments" name="Total Appointments" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
             ) : (
                 <NoDataAlert type="appointments per provider" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
}

function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-150">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        {description && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

function NoDataAlert({ type }: {type: string}) {
    return (
        <div className="flex items-center justify-center h-full">
            <Alert className="w-auto">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>No Data Available</AlertTitle>
                <AlertDescription>
                    There is no data for {type} in the selected date range.
                </AlertDescription>
            </Alert>
        </div>
    );
}

    