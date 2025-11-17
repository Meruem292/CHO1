
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth-hook';
import { database } from '@/lib/firebase-config';
import { ref, get } from 'firebase/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChevronLeft, ShieldAlert, Loader2, Download, KeyRound, Database } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { createAuditLog } from '@/hooks/use-audit';

export default function BackupPage() {
  const { user, reauthenticateWithPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleBackup = async () => {
    if (!user || user.role !== 'admin') {
      toast({ variant: 'destructive', title: 'Error', description: 'Permission denied.' });
      return;
    }

    if (!password) {
      toast({ variant: 'destructive', title: 'Password Required', description: 'Please enter your password to confirm.' });
      return;
    }

    setIsAuthenticating(true);
    const isAuthenticated = await reauthenticateWithPassword(password);
    setIsAuthenticating(false);

    if (!isAuthenticated) {
      setPassword('');
      return; // Toast is handled by the auth hook
    }

    setIsDownloading(true);
    try {
      const dbRef = ref(database);
      const snapshot = await get(dbRef);
      const data = snapshot.val();
      
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2)
      )}`;
      
      const link = document.createElement("a");
      link.href = jsonString;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `firebase-backup-${timestamp}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ title: 'Backup Successful', description: 'Your database backup has been downloaded.' });
      await createAuditLog(user, 'database_backup_downloaded', 'Downloaded a full database backup.');

    } catch (error) {
      console.error("Error creating database backup:", error);
      toast({ variant: 'destructive', title: 'Backup Failed', description: 'Could not fetch database for backup.' });
    } finally {
      setIsDownloading(false);
      setPassword('');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You do not have permission to view this page.</AlertDescription>
        </Alert>
        <Link href="/dashboard" className="text-primary hover:underline">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  const isLoading = isAuthenticating || isDownloading;

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="flex items-center text-sm text-primary hover:underline mb-4">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <Database className="mr-3 h-8 w-8 text-primary" /> Backup & Restore
        </h1>
      </div>
      <p className="text-muted-foreground">
        Download a complete JSON backup of the application database.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Create Full Database Backup</CardTitle>
          <CardDescription>
            This action will download a JSON file containing all data from the database. 
            For security, please enter your administrator password to confirm.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-password">
                <KeyRound className="inline-block mr-2 h-4 w-4" />
                Administrator Password
            </Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>
      
      <Button onClick={handleBackup} disabled={isLoading || !password} className="w-full sm:w-auto">
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {isAuthenticating ? 'Verifying...' : isDownloading ? 'Downloading...' : 'Download Backup'}
      </Button>
    </div>
  );
}
