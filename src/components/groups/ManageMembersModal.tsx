import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2, Search, UserPlus, X, Users, GraduationCap, BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/user';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { useToast } from '../../hooks/use-toast';

const db = supabaseAdmin || supabase;

interface GroupData {
  id: string;
  name: string;
  members: string[];
  admins: string[];
  department?: string;
  created_by: string;
}

interface UserEntry {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  register_id?: string;
  class?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  group: GroupData;
  onUpdated: () => void;
}

const ManageMembersModal: React.FC<Props> = ({ open, onClose, group, onUpdated }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState('members');
  const [members, setMembers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [classes, setClasses] = useState<{ id: string; name: string; department: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [classStudents, setClassStudents] = useState<UserEntry[]>([]);
  const [classLoading, setClassLoading] = useState(false);

  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState<UserEntry[]>([]);
  const [studentSearching, setStudentSearching] = useState(false);

  const [facultyList, setFacultyList] = useState<UserEntry[]>([]);
  const [facultySearch, setFacultySearch] = useState('');
  const [facultyLoading, setFacultyLoading] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.PRINCIPAL;
  const deptFilter = isAdmin ? null : user?.department;

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
      setTab('members');
      loadCurrentMembers();
      loadClasses();
      loadFaculty();
    }
  }, [open, group.id]);

  const loadCurrentMembers = async () => {
    if (!group.members?.length) { setMembers([]); return; }
    setLoading(true);
    try {
      const { data } = await db.from('users').select('id, name, email, role, department').in('id', group.members);
      setMembers(data || []);
    } catch { setMembers([]); }
    finally { setLoading(false); }
  };

  const loadClasses = async () => {
    let q = db.from('classes').select('id, name, department').eq('is_active', true).order('name');
    if (deptFilter) q = q.eq('department', deptFilter);
    const { data } = await q;
    setClasses(data || []);
  };

  const loadClassStudents = async (className: string) => {
    if (!className) { setClassStudents([]); return; }
    setClassLoading(true);
    try {
      const { data } = await db
        .from('students')
        .select('user_id, name, register_id, class, department')
        .eq('class', className);
      setClassStudents((data || []).map(s => ({
        id: s.user_id,
        name: s.name,
        email: '',
        role: 'STUDENT',
        department: s.department,
        register_id: s.register_id,
        class: s.class,
      })));
    } catch { setClassStudents([]); }
    finally { setClassLoading(false); }
  };

  const searchStudents = async () => {
    const term = studentSearch.trim();
    if (!term) return;
    setStudentSearching(true);
    try {
      let q = db.from('students').select('user_id, name, register_id, class, department');
      if (deptFilter) q = q.eq('department', deptFilter);
      q = q.or(`name.ilike.%${term}%,register_id.ilike.%${term}%`).limit(30);
      const { data } = await q;
      setStudentResults((data || []).map(s => ({
        id: s.user_id,
        name: s.name,
        email: '',
        role: 'STUDENT',
        department: s.department,
        register_id: s.register_id,
        class: s.class,
      })));
    } catch { setStudentResults([]); }
    finally { setStudentSearching(false); }
  };

  const loadFaculty = async () => {
    setFacultyLoading(true);
    try {
      let q = db.from('users').select('id, name, email, role, department')
        .in('role', ['FACULTY', 'COORDINATOR', 'HOD', 'PRINCIPAL']);
      if (deptFilter) q = q.eq('department', deptFilter);
      const { data } = await q.order('name');
      setFacultyList(data || []);
    } catch { setFacultyList([]); }
    finally { setFacultyLoading(false); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllFromList = (list: UserEntry[]) => {
    const newIds = list.map(u => u.id).filter(id => !group.members.includes(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      newIds.forEach(id => next.add(id));
      return next;
    });
  };

  const addSelectedMembers = async () => {
    if (selectedIds.size === 0) return;
    setSaving(true);
    try {
      const currentMembers = group.members || [];
      const newMembers = [...new Set([...currentMembers, ...Array.from(selectedIds)])];
      const { error } = await db.from('groups').update({ members: newMembers }).eq('id', group.id);
      if (error) throw error;
      toast({ title: 'Members added', description: `${selectedIds.size} member(s) added to the group.` });
      setSelectedIds(new Set());
      onUpdated();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to add members', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const removeMember = async (memberId: string) => {
    if (memberId === group.created_by) return;
    setSaving(true);
    try {
      const newMembers = (group.members || []).filter(id => id !== memberId);
      const newAdmins = (group.admins || []).filter(id => id !== memberId);
      const { error } = await db.from('groups').update({ members: newMembers, admins: newAdmins }).eq('id', group.id);
      if (error) throw error;
      toast({ title: 'Member removed' });
      onUpdated();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const filteredFaculty = useMemo(() => {
    const term = facultySearch.toLowerCase();
    if (!term) return facultyList;
    return facultyList.filter(f => f.name.toLowerCase().includes(term) || f.email.toLowerCase().includes(term));
  }, [facultyList, facultySearch]);

  const isAlreadyMember = (id: string) => group.members.includes(id);

  const UserRow: React.FC<{ u: UserEntry; showCheckbox?: boolean }> = ({ u, showCheckbox = true }) => {
    const already = isAlreadyMember(u.id);
    return (
      <div className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-md gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{u.name}</p>
          <p className="text-xs text-gray-500 truncate">
            {u.register_id || u.email}{u.department ? ` | ${u.department}` : ''}{u.class ? ` | ${u.class}` : ''}
          </p>
        </div>
        {already ? (
          <Badge variant="secondary" className="text-xs shrink-0">Added</Badge>
        ) : showCheckbox ? (
          <input
            type="checkbox"
            checked={selectedIds.has(u.id)}
            onChange={() => toggleSelect(u.id)}
            className="h-4 w-4 rounded border-gray-300 shrink-0"
          />
        ) : null}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Members &mdash; {group.name}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-4 shrink-0">
            <TabsTrigger value="members"><Users className="h-4 w-4 mr-1" />Current</TabsTrigger>
            <TabsTrigger value="class"><BookOpen className="h-4 w-4 mr-1" />Class</TabsTrigger>
            <TabsTrigger value="student"><GraduationCap className="h-4 w-4 mr-1" />Student</TabsTrigger>
            <TabsTrigger value="faculty"><UserPlus className="h-4 w-4 mr-1" />Faculty</TabsTrigger>
          </TabsList>

          {/* Current Members */}
          <TabsContent value="members" className="flex-1 overflow-y-auto mt-2">
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : members.length === 0 ? (
              <p className="text-center text-gray-500 py-6 text-sm">No members yet.</p>
            ) : (
              <div className="divide-y">
                {members.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-2 px-3 gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-xs text-gray-500 truncate">{m.role}{m.department ? ` | ${m.department}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {group.admins?.includes(m.id) && <Badge className="text-[10px]">Admin</Badge>}
                      {m.id !== group.created_by && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => removeMember(m.id)} disabled={saving}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Add By Class */}
          <TabsContent value="class" className="flex-1 overflow-hidden flex flex-col mt-2 gap-2">
            <Select value={selectedClass} onValueChange={v => { setSelectedClass(v); loadClassStudents(v); }}>
              <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c.id} value={c.name}>{c.name} ({c.department})</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex-1 overflow-y-auto border rounded-md">
              {classLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : classStudents.length === 0 ? (
                <p className="text-center text-gray-500 py-6 text-sm">{selectedClass ? 'No students found in this class.' : 'Select a class above.'}</p>
              ) : (
                <>
                  <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
                    <span className="text-xs text-gray-600">{classStudents.length} students</span>
                    <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => selectAllFromList(classStudents)}>Select All</Button>
                  </div>
                  {classStudents.map(s => <UserRow key={s.id} u={s} />)}
                </>
              )}
            </div>
            {selectedIds.size > 0 && (
              <Button onClick={addSelectedMembers} disabled={saving} className="shrink-0">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Add {selectedIds.size} Selected
              </Button>
            )}
          </TabsContent>

          {/* Add By Student Search */}
          <TabsContent value="student" className="flex-1 overflow-hidden flex flex-col mt-2 gap-2">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name or roll number..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchStudents()}
                className="flex-1"
              />
              <Button onClick={searchStudents} disabled={studentSearching} size="sm">
                {studentSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto border rounded-md">
              {studentResults.length === 0 ? (
                <p className="text-center text-gray-500 py-6 text-sm">Search for students to add.</p>
              ) : (
                <>
                  <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
                    <span className="text-xs text-gray-600">{studentResults.length} results</span>
                    <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => selectAllFromList(studentResults)}>Select All</Button>
                  </div>
                  {studentResults.map(s => <UserRow key={s.id} u={s} />)}
                </>
              )}
            </div>
            {selectedIds.size > 0 && (
              <Button onClick={addSelectedMembers} disabled={saving} className="shrink-0">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Add {selectedIds.size} Selected
              </Button>
            )}
          </TabsContent>

          {/* Add Faculty */}
          <TabsContent value="faculty" className="flex-1 overflow-hidden flex flex-col mt-2 gap-2">
            <Input
              placeholder="Filter faculty by name..."
              value={facultySearch}
              onChange={e => setFacultySearch(e.target.value)}
            />
            <div className="flex-1 overflow-y-auto border rounded-md">
              {facultyLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : filteredFaculty.length === 0 ? (
                <p className="text-center text-gray-500 py-6 text-sm">No faculty found.</p>
              ) : (
                <>
                  <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
                    <span className="text-xs text-gray-600">{filteredFaculty.length} faculty</span>
                    <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => selectAllFromList(filteredFaculty)}>Select All</Button>
                  </div>
                  {filteredFaculty.map(f => <UserRow key={f.id} u={f} />)}
                </>
              )}
            </div>
            {selectedIds.size > 0 && (
              <Button onClick={addSelectedMembers} disabled={saving} className="shrink-0">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Add {selectedIds.size} Selected
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ManageMembersModal;
