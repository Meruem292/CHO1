
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { Patient, UserRole } from '@/types';
import { adminCreateUserSchema, type AdminCreateUserFormData } from '@/zod-schemas'; 
import { useMockDb } from '@/hooks/use-mock-db';
import { useAuth } from '@/hooks/use-auth-hook';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, PlusCircle, Trash2, Edit, UserCog, Loader2, ShieldAlert, Archive } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { UserFormDialog } from '@/components/dialogs/user-form-dialog';
import { EditUserRoleDialog } from '@/components/dialogs/edit-user-role-dialog';

export default function UserManagementPage() {
  const { user, adminCreateUserWithEmail } = useAuth(); 
  const { 
    patients: allUsers, 
    patientsLoading: usersLoading, 
    updatePatient: updateUser,
    deletePatient: archiveUser 
  } = useMockDb();
  
  const [isAddUserFormOpen, setIsAddUserFormOpen] = useState(false);
  const [isEditRoleFormOpen, setIsEditRoleFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Patient | undefined>(undefined);
  const [userToArchive, setUserToArchive] = useState<Patient | null>(null);

  const displayedUsers = useMemo(() => allUsers, [allUsers]);

  const handleAddUserSubmit = async (data: AdminCreateUserFormData) => {
    const emailExists = allUsers.some(u => u.email === data.email);
    if (emailExists) {
      toast({
        variant: "destructive",
        title: "Email Already Exists",
        description: "A user with this email address is already registered in the database.",
      });
      return; 
    }

    try {
      await adminCreateUserWithEmail(
        data.email, 
        data.password, 
        data.firstName, 
        data.middleName, 
        data.lastName, 
        data.role
      );
      setIsAddUserFormOpen(false); 
    } catch (error) {
      console.error("Error adding user from UserManagementPage:", error);
    }
  };

  const handleEditRoleSubmit = async (userId: string, newRole: UserRole) => {
    try {
      const userToUpdate = allUsers.find(u => u.id === userId);
      if (!userToUpdate) throw new Error("User not found for role update.");

      await updateUser(userId, { role: newRole });
      toast({ title: "User Role Updated", description: `${userToUpdate.name}'s role changed to ${newRole}.` });
      setIsEditRoleFormOpen(false);
      setEditingUser(undefined);
    } catch (error) {
      console.error("Error updating user role:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update user role." });
    }
  };
  
  const openEditRoleForm = (userToEdit: Patient) => {
    setEditingUser(userToEdit);
    setIsEditRoleFormOpen(true);
  };

  const handleArchiveUserConfirm = async () => {
    if (userToArchive) {
      try {
        if (userToArchive.role === 'admin') {
            toast({ variant: "destructive", title: "Action Not Allowed", description: "Admin users cannot be archived from this interface." });
            setUserToArchive(null);
            return;
        }
        await archiveUser(userToArchive.id); 
        toast({ title: "User Archived", description: `${userToArchive.name} has been archived.` });
        setUserToArchive(null);
      } catch (error) {
        console.error("Error archiving user:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to archive user." });
      }
    }
  };

  const columns: ColumnDef<Patient>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.getValue("role") as UserRole;
        const roleText = role === 'midwife/nurse' ? 'Midwife/Nurse' : role.charAt(0).toUpperCase() + role.slice(1);
        return <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            role === 'admin' ? 'bg-red-100 text-red-700' :
            role === 'doctor' ? 'bg-blue-100 text-blue-700' :
            role === 'midwife/nurse' ? 'bg-purple-100 text-purple-700' :
            'bg-green-100 text-green-700'
        }`}>{roleText}</span>;
      }
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const targetUser = row.original;
        if (user?.role !== 'admin' || targetUser.id === user.id || targetUser.role === 'admin') {
          return null;
        }
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => openEditRoleForm(targetUser)}>
                <Edit className="mr-2 h-4 w-4" /> Edit Role
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setUserToArchive(targetUser)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Archive className="mr-2 h-4 w-4" /> Archive User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [user?.role, user?.id, allUsers]); 

  if (user?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
            You do not have permission to view this page. This page is for administrators only.
            </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (usersLoading && displayedUsers.length === 0) {
    return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading users list...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <UserCog className="mr-3 h-8 w-8 text-primary" /> User Management
        </h1>
        <Button onClick={() => setIsAddUserFormOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      {displayedUsers.length === 0 && !usersLoading ? (
        <Alert>
          <UserCog className="h-4 w-4" />
          <AlertTitle>No Users Found</AlertTitle>
          <AlertDescription>
            There are no users in the system yet. You can add one using the "Add User" button.
          </AlertDescription>
        </Alert>
      ) : (
        <DataTable
            columns={columns}
            data={displayedUsers}
            filterColumnId="name" 
            filterPlaceholder="Filter by name, email, or role..."
        />
      )}
      

      <UserFormDialog
        isOpen={isAddUserFormOpen}
        onClose={() => setIsAddUserFormOpen(false)}
        onSubmit={handleAddUserSubmit}
      />

      {editingUser && (
        <EditUserRoleDialog
            isOpen={isEditRoleFormOpen}
            onClose={() => { setIsEditRoleFormOpen(false); setEditingUser(undefined);}}
            user={editingUser}
            onSave={handleEditRoleSubmit}
            allowedRoles={['doctor', 'patient', 'midwife/nurse']}
        />
      )}
      

      {userToArchive && (
        <AlertDialog open={!!userToArchive} onOpenChange={() => setUserToArchive(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will archive the user "{userToArchive.name}" ({userToArchive.role}) and prevent them from logging in.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToArchive(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchiveUserConfirm} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Archive User
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
