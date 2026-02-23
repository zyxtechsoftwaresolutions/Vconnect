import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/user';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { useToast } from '../../hooks/use-toast';

const db = supabaseAdmin || supabase;

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CreateGroupModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);

  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.PRINCIPAL;

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setIsPrivate(false);
      if (isAdmin) {
        loadDepartments();
        setDepartment('');
      } else {
        setDepartment(user?.department || '');
      }
    }
  }, [open]);

  const loadDepartments = async () => {
    const { data } = await db.from('departments').select('name').order('name');
    if (data?.length) {
      setDepartments(data.map(d => d.name));
    } else {
      setDepartments(['CSE', 'CSM', 'ECE', 'EEE', 'CIVIL', 'MECH', 'MCA', 'MBA']);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !user) return;
    setSaving(true);
    try {
      const { error } = await db.from('groups').insert({
        name: name.trim(),
        description: description.trim() || null,
        department: department || null,
        is_private: isPrivate,
        created_by: user.id,
        admins: [user.id],
        members: [user.id],
      });

      if (error) throw error;

      toast({ title: 'Group created', description: `"${name.trim()}" has been created successfully.` });
      onCreated();
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create group', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Group Name *</Label>
            <Input placeholder="e.g. CSE-A Announcements" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea placeholder="What is this group about?" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            {isAdmin ? (
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Departments</SelectItem>
                  {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={department} disabled />
            )}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Private Group</Label>
              <p className="text-xs text-gray-500">Only visible to added members</p>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : 'Create Group'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupModal;
