
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { Patient, UserRole } from '@/types';
import { adminCreateUserSchema, type AdminCreateUserFormData } from '@/zod-schemas'; // Import AdminCreateUserFormData
import { useMockDb } from '@/hooks/use-mock-db';
import { useAuth } from '@/hooks/use-auth-hook';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, PlusCircle, Trash2, Edit, UserCog, Loader2, ShieldAlert } from 'lucide-react';
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
  const { user, adminCreateUserWithEmail } = useAuth(); // Get adminCreateUserWithEmail
  const { 
    patients: allUsers, 
    patientsLoading: usersLoading, 
    // addPatient is no longer directly used for user creation here. adminCreateUserWithEmail handles it.
    updatePatient: updateUser,
    deletePatient: deleteUser 
  } = useMockDb();
  
  const [isAddUserFormOpen, setIsAddUserFormOpen] = useState(false);
  const [isEditRoleFormOpen, setIsEditRoleFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Patient | undefined>(undefined);
  const [userToDelete, setUserToDelete] = useState<Patient | null>(null);

  // No filtering by role needed, show all users
  const displayedUsers = useMemo(() => allUsers, [allUsers]);

  const handleAddUserSubmit = async (data: AdminCreateUserFormData) => {
    try {
      // Call adminCreateUserWithEmail, which handles Auth and DB record creation
      await adminCreateUserWithEmail(
        data.email, 
        data.password, 
        data.firstName, 
        data.middleName, 
        data.lastName, 
        data.role
      );
      // adminCreateUserWithEmail in AuthProvider should handle success toasts and potential navigation.
      // It will also sign the admin in as the new user, and a toast warns about this.
      setIsAddUserFormOpen(false); // Close the dialog
    } catch (error) {
      console.error("Error adding user from UserManagementPage:", error);
      // Error toasts are handled by adminCreateUserWithEmail or handleAuthError in AuthProvider
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

  const handleDeleteUserConfirm = async () => {
    if (userToDelete) {
      try {
        if (userToDelete.role === 'admin') {
            toast({ variant: "destructive", title: "Action Not Allowed", description: "Admin users cannot be deleted from this interface." });
            setUserToDelete(null);
            return;
        }
        await deleteUser(userToDelete.id); // This deletes from RTDB and related records
        toast({ title: "User Removed", description: `${userToDelete.name} has been removed from the application's database. Their Firebase Authentication record may still exist.` });
        setUserToDelete(null);
      } catch (error) {
        console.error("Error deleting user:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete user." });
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
        return <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            role === 'admin' ? 'bg-red-100 text-red-700' :
            role === 'doctor' ? 'bg-blue-100 text-blue-700' :
            'bg-green-100 text-green-700'
        }`}>{role.charAt(0).toUpperCase() + role.slice(1)}</span>;
      }
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const targetUser = row.original;
        if (user?.role !== 'admin' || targetUser.id === user.id || targetUser.role === 'admin') {
          // Admins cannot edit themselves or other admins via this interface
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
              <DropdownMenuItem onClick={() => setUserToDelete(targetUser)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" /> Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [user?.role, user?.id, allUsers]); // Added user.id to dependencies for self-edit check

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
            filterColumnId="name" // Can also filter by 'email' or 'role' if needed
            filterPlaceholder="Filter by name, email, or role..."
        />
      )}
      

      <UserFormDialog
        isOpen={isAddUserFormOpen}
        onClose={() => setIsAddUserFormOpen(false)}
        onSubmit={handleAddUserSubmit}
        // defaultRole could be set to 'doctor' if this page primarily manages doctors
      />

      {editingUser && (
        <EditUserRoleDialog
            isOpen={isEditRoleFormOpen}
            onClose={() => { setIsEditRoleFormOpen(false); setEditingUser(undefined);}}
            user={editingUser}
            onSave={handleEditRoleSubmit}
            allowedRoles={['doctor', 'patient']} // Admins can change users to 'doctor' or 'patient'
        />
      )}
      

      {userToDelete && (
        <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will remove "{userToDelete.name}" ({userToDelete.role}) 
                from the application's database and their associated health records. 
                Their Firebase Authentication record might remain.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteUserConfirm} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Delete User
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
