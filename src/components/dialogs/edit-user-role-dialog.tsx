
'use client';

import React, { useState, useEffect } from 'react';
import type { Patient, UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface EditUserRoleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: Patient; // User whose role is being edited
  onSave: (userId: string, newRole: UserRole) => Promise<void>;
  allowedRoles?: UserRole[]; // Optional: restrict which roles can be assigned
}

export function EditUserRoleDialog({
  isOpen,
  onClose,
  user,
  onSave,
  allowedRoles = ['admin', 'doctor', 'patient'], // Default to all roles if not specified
}: EditUserRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Reset selected role when the user prop changes (e.g., dialog opens for a different user)
    setSelectedRole(user.role);
  }, [user]);

  const handleSave = async () => {
    if (!selectedRole) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a role.' });
      return;
    }
    setIsSaving(true);
    try {
      await onSave(user.id, selectedRole);
      // onClose(); // Parent component will handle closing and toast messages for success
    } catch (error) {
      console.error('Error saving role:', error);
      // Toast for error is likely handled by parent component's catch block
    } finally {
      setIsSaving(false);
    }
  };

  const availableRoles = allowedRoles.filter(role => role !== 'admin' || user.role === 'admin');


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Role for {user.name}</DialogTitle>
          <DialogDescription>
            Current role: <span className="font-semibold">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>.
            Select a new role for this user.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="role-select">New Role</Label>
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
              <SelectTrigger id="role-select">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((roleOption) => (
                  <SelectItem
                    key={roleOption}
                    value={roleOption}
                    disabled={roleOption === 'admin' && user.role !== 'admin'} // Prevent changing to admin unless already admin
                  >
                    {roleOption.charAt(0).toUpperCase() + roleOption.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           {user.role === 'admin' && selectedRole !== 'admin' && (
            <p className="text-sm text-destructive">
              Warning: Changing an admin's role is a significant action. Ensure this is intended.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || selectedRole === user.role}>
            {isSaving ? 'Saving...' : 'Save Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
