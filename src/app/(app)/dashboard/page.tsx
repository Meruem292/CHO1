'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth-hook";
import { useMockDb } from "@/hooks/use-mock-db";
import { Users, ClipboardList, Baby, HeartPulse } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuth();
  const { getPatients, getConsultationsByPatientId, getMaternityHistoryByPatientId, getBabyRecordsByMotherId } = useMockDb();
  
  const totalPatients = user?.role !== 'patient' ? getPatients().length : 0;
  // For patient role, statistics would be specific to them.
  // This requires identifying the patient user. For simplicity, we'll use user.id as patientId if role is patient.
  const patientIdForStats = user?.role === 'patient' ? user.id : undefined;

  const myConsultationsCount = patientIdForStats ? getConsultationsByPatientId(patientIdForStats).length : 0;
  const myMaternityRecordsCount = patientIdForStats ? getMaternityHistoryByPatientId(patientIdForStats).length : 0;
  const myBabyRecordsCount = patientIdForStats ? getBabyRecordsByMotherId(patientIdForStats).length : 0;


  const stats = user?.role === 'patient' ? [
    { title: "My Consultations", value: myConsultationsCount, icon: ClipboardList, href: `/patients/${user.id}/consultations` },
    { title: "My Maternity Records", value: myMaternityRecordsCount, icon: Baby, href: `/patients/${user.id}/maternity-history` },
    { title: "My Baby's Records", value: myBabyRecordsCount, icon: HeartPulse, href: `/patients/${user.id}/baby-health` },
  ] : [
    { title: "Total Patients", value: totalPatients, icon: Users, href: "/patients" },
    // Add more admin/doctor specific stats if needed. Example:
    // { title: "Today's Appointments", value: 5, icon: CalendarDays, href: "/appointments" }, 
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Welcome, {user?.name}!</h1>
      <p className="text-muted-foreground">
        This is your central hub for managing health records.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Link href={stat.href} key={stat.title}>
            <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                {/* <p className="text-xs text-muted-foreground">
                  +20.1% from last month
                </p> */}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {user?.role !== 'patient' && (
         <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
                <Link href="/patients" className="text-primary hover:underline">View All Patients</Link>
                <Link href="/ai-suggestions" className="text-primary hover:underline">Get AI Health Suggestions</Link>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
