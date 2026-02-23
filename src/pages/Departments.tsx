
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Building2, Plus, Users, UserCheck, Edit, Trash2, Loader2, X, Search, GraduationCap
} from 'lucide-react';
import Loader from '../components/ui/loader';
import { useAuth } from '../contexts/AuthContext';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useToast } from '../hooks/use-toast';

const db = supabaseAdmin || supabase;

interface DepartmentData {
  id: string;
  name: string;
  fullName: string;
  hodId: string | null;
  hodName: string;
  isActive: boolean;
  studentCount: number;
  facultyCount: number;
  classCount: number;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
}

const Departments: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formHodId, setFormHodId] = useState('');
  const [hodCandidates, setHodCandidates] = useState<UserOption[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadDepartments(); }, []);

  const [tableExists, setTableExists] = useState(true);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const { data: deptRows, error } = await db
        .from('departments')
        .select('*')
        .order('name');

      if (error) {
        console.warn('departments table query failed:', error.message);
        setTableExists(false);
        await buildDepartmentsFromUsers();
        return;
      }

      setTableExists(true);

      // If the table exists but is empty, auto-seed from users table
      if (!deptRows || deptRows.length === 0) {
        await seedDepartmentsFromUsers();
        return;
      }

      const depts: DepartmentData[] = [];

      for (const row of deptRows) {
        let hodName = 'Not Assigned';
        if (row.hod_id) {
          const { data: hodUser } = await db.from('users').select('name').eq('id', row.hod_id).single();
          if (hodUser) hodName = hodUser.name;
        }

        const { count: studentCount } = await db
          .from('students').select('*', { count: 'exact', head: true }).eq('department', row.name);
        const { count: facultyCount } = await db
          .from('users').select('*', { count: 'exact', head: true })
          .eq('department', row.name).in('role', ['FACULTY', 'HOD', 'COORDINATOR']);
        const { count: classCount } = await db
          .from('classes').select('*', { count: 'exact', head: true }).eq('department', row.name);

        depts.push({
          id: row.id,
          name: row.name,
          fullName: row.full_name || row.name,
          hodId: row.hod_id,
          hodName,
          isActive: row.is_active ?? true,
          studentCount: studentCount || 0,
          facultyCount: facultyCount || 0,
          classCount: classCount || 0,
        });
      }

      setDepartments(depts);
    } catch (err) {
      console.error('Error loading departments:', err);
    } finally {
      setLoading(false);
    }
  };

  const seedDepartmentsFromUsers = async () => {
    const { data: users } = await db.from('users').select('department, id, name, role').not('department', 'is', null);
    const uniqueDepts = [...new Set((users || []).map((u: any) => u.department).filter(Boolean))];

    for (const deptName of uniqueDepts) {
      const hod = (users || []).find((u: any) => u.department === deptName && u.role === 'HOD');
      const insertData: any = { name: deptName, full_name: deptName, is_active: true };
      if (hod) insertData.hod_id = hod.id;
      await db.from('departments').upsert([insertData], { onConflict: 'name' }).select();
    }

    await loadDepartments();
  };

  const buildDepartmentsFromUsers = async () => {
    const { data: users } = await db.from('users').select('department, id, name, role').not('department', 'is', null);
    const uniqueDepts = [...new Set((users || []).map((u: any) => u.department).filter(Boolean))];

    const depts: DepartmentData[] = [];
    for (const deptName of uniqueDepts) {
      const hod = (users || []).find((u: any) => u.department === deptName && u.role === 'HOD');
      const { count: studentCount } = await db
        .from('students').select('*', { count: 'exact', head: true }).eq('department', deptName);
      const { count: facultyCount } = await db
        .from('users').select('*', { count: 'exact', head: true })
        .eq('department', deptName).in('role', ['FACULTY', 'HOD', 'COORDINATOR']);
      const { count: classCount } = await db
        .from('classes').select('*', { count: 'exact', head: true }).eq('department', deptName);

      depts.push({
        id: deptName as string,
        name: deptName as string,
        fullName: deptName as string,
        hodId: hod?.id || null,
        hodName: hod?.name || 'Not Assigned',
        isActive: true,
        studentCount: studentCount || 0,
        facultyCount: facultyCount || 0,
        classCount: classCount || 0,
      });
    }
    setDepartments(depts);
    setLoading(false);
  };

  const loadHodCandidates = async (deptName?: string) => {
    setLoadingCandidates(true);
    try {
      let query = db.from('users').select('id, name, email, role, department')
        .in('role', ['HOD', 'FACULTY', 'COORDINATOR']).order('name');
      if (deptName) query = query.eq('department', deptName);
      const { data } = await query;
      setHodCandidates((data || []).map((u: any) => ({
        id: u.id, name: u.name, email: u.email, role: u.role, department: u.department
      })));
    } catch (err) {
      console.error('Error loading HOD candidates:', err);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const openCreateForm = () => {
    setEditingDept(null);
    setFormName('');
    setFormFullName('');
    setFormHodId('');
    setHodCandidates([]);
    setShowCreateForm(true);
    loadHodCandidates();
  };

  const openEditForm = (dept: DepartmentData) => {
    setEditingDept(dept);
    setFormName(dept.name);
    setFormFullName(dept.fullName);
    setFormHodId(dept.hodId || '');
    setShowCreateForm(true);
    loadHodCandidates(dept.name);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: 'Error', description: 'Department name is required.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (editingDept) {
        // Update existing department
        const { error } = await db.from('departments').update({
          full_name: formFullName || formName,
          hod_id: formHodId || null,
        }).eq('id', editingDept.id);

        if (error) {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
          return;
        }

        // If HOD changed, update the user's role to HOD
        if (formHodId && formHodId !== editingDept.hodId) {
          await db.from('users').update({ role: 'HOD', department: editingDept.name }).eq('id', formHodId);

          // Demote previous HOD to FACULTY if exists
          if (editingDept.hodId) {
            await db.from('users').update({ role: 'FACULTY' }).eq('id', editingDept.hodId);
          }
        }

        toast({ title: 'Department Updated', description: `${formName} updated successfully.` });
      } else {
        // Check duplicate
        const existing = departments.find(d => d.name.toUpperCase() === formName.trim().toUpperCase());
        if (existing) {
          toast({ title: 'Already Exists', description: `Department "${formName}" already exists.`, variant: 'destructive' });
          setSaving(false);
          return;
        }

        // Create new department
        const insertData: any = {
          name: formName.trim().toUpperCase(),
          full_name: formFullName || formName.trim(),
          is_active: true,
        };
        if (formHodId) insertData.hod_id = formHodId;

        const { error } = await db.from('departments').insert([insertData]);

        if (error) {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
          return;
        }

        // Promote selected user to HOD of this department
        if (formHodId) {
          await db.from('users').update({ role: 'HOD', department: formName.trim().toUpperCase() }).eq('id', formHodId);
        }

        toast({ title: 'Department Created', description: `${formName.trim().toUpperCase()} created successfully.` });
      }

      setShowCreateForm(false);
      setEditingDept(null);
      await loadDepartments();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dept: DepartmentData) => {
    if (dept.studentCount > 0 || dept.facultyCount > 0) {
      toast({
        title: 'Cannot Delete',
        description: `${dept.name} has ${dept.studentCount} students and ${dept.facultyCount} faculty. Remove them first.`,
        variant: 'destructive',
      });
      return;
    }

    if (!window.confirm(`Delete department "${dept.name}"? This cannot be undone.`)) return;

    try {
      const { error } = await db.from('departments').delete().eq('id', dept.id);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Deleted', description: `Department ${dept.name} deleted.` });
      await loadDepartments();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const filteredDepts = departments.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.hodName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (user?.role !== 'ADMIN' && user?.role !== 'PRINCIPAL') {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-gray-600">Only Admin can manage departments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Department Management</h1>
          <p className="text-sm sm:text-base text-gray-600">Create departments and assign HODs</p>
        </div>
        <Button onClick={openCreateForm} className="flex items-center gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Create Department
        </Button>
      </div>

      {!tableExists && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800 font-medium">
            The "departments" table is not set up yet. Showing departments detected from existing users.
            Please run the departments table SQL in your Supabase SQL Editor for full functionality.
          </p>
        </div>
      )}

      {/* Search */}
      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input placeholder="Search departments..." value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      {/* Department Cards */}
      {loading ? (
        <Loader text="Loading departments..." />
      ) : filteredDepts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No Departments Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'No match for your search.' : 'Create your first department to get started.'}
            </p>
            {!searchTerm && (
              <Button onClick={openCreateForm}><Plus className="h-4 w-4 mr-2" /> Create Department</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepts.map((dept) => (
            <Card key={dept.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <span>{dept.name}</span>
                  </div>
                  <Badge variant={dept.isActive ? 'default' : 'secondary'}>
                    {dept.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </CardTitle>
                {dept.fullName !== dept.name && (
                  <p className="text-sm text-gray-500">{dept.fullName}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1">
                      <UserCheck className="h-3.5 w-3.5" /> HOD
                    </span>
                    <span className={`font-medium ${dept.hodId ? 'text-green-700' : 'text-amber-600'}`}>
                      {dept.hodName}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-600">{dept.studentCount}</p>
                      <p className="text-xs text-gray-500">Students</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-purple-600">{dept.facultyCount}</p>
                      <p className="text-xs text-gray-500">Faculty</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600">{dept.classCount}</p>
                      <p className="text-xs text-gray-500">Classes</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditForm(dept)}>
                      <Edit className="h-3.5 w-3.5 mr-1" /> Edit / Assign HOD
                    </Button>
                    <Button variant="outline" size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(dept)}
                      disabled={dept.studentCount > 0 || dept.facultyCount > 0}
                      title={dept.studentCount > 0 ? 'Cannot delete: has students' : 'Delete department'}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingDept ? `Edit ${editingDept.name}` : 'Create New Department'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowCreateForm(false); setEditingDept(null); }}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Department Code *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value.toUpperCase())}
                  placeholder="e.g., CSE, ECE, MECH"
                  disabled={!!editingDept}
                />
                {editingDept && <p className="text-xs text-gray-400 mt-1">Code cannot be changed after creation.</p>}
              </div>

              <div>
                <Label>Full Name</Label>
                <Input
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="e.g., Computer Science and Engineering"
                />
              </div>

              <div>
                <Label>Assign HOD</Label>
                {loadingCandidates ? (
                  <div className="flex items-center gap-2 p-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading faculty...
                  </div>
                ) : hodCandidates.length > 0 ? (
                  <>
                    <Select value={formHodId} onValueChange={setFormHodId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select HOD (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {hodCandidates.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name} ({u.role} - {u.department || 'No Dept'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400 mt-1">
                      The selected user will be promoted to HOD role for this department.
                    </p>
                  </>
                ) : (
                  <div className="text-sm text-gray-500 p-2 bg-gray-50 rounded border">
                    No faculty found.{' '}
                    <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => loadHodCandidates()}>
                      Load all faculty
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setShowCreateForm(false); setEditingDept(null); }} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving || !formName.trim()}>
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                    : editingDept ? 'Update Department' : 'Create Department'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Departments;
