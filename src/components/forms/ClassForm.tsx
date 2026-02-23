
import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { X, Loader2 } from 'lucide-react';
import { Department } from '../../types/user';
import { supabase, supabaseAdmin } from '../../lib/supabase';

const db = supabaseAdmin || supabase;

interface FacultyOption {
  id: string;
  name: string;
  department: string;
  role: string;
}

interface ClassFormProps {
  onSubmit: (classData: any) => void;
  onClose: () => void;
  editClass?: any;
  userDepartment?: Department;
}

const ClassForm: React.FC<ClassFormProps> = ({ onSubmit, onClose, editClass, userDepartment }) => {
  const [facultyList, setFacultyList] = useState<FacultyOption[]>([]);
  const [loadingFaculty, setLoadingFaculty] = useState(true);
  const [departmentList, setDepartmentList] = useState<string[]>(Object.values(Department));

  const [formData, setFormData] = useState({
    name: editClass?.name || '',
    semester: editClass?.semester || 1,
    academicYear: editClass?.academicYear || '2025-26',
    coordinatorId: editClass?.coordinatorId || '',
    coordinatorName: editClass?.coordinatorName || '',
    department: editClass?.department || userDepartment || Department.CSE
  });

  useEffect(() => {
    loadFaculty();
  }, [formData.department]);

  useEffect(() => {
    const loadDepts = async () => {
      try {
        const { data } = await db.from('departments').select('name').order('name');
        if (data && data.length > 0) {
          const dbDepts = data.map((d: any) => d.name);
          const merged = [...new Set([...dbDepts, ...Object.values(Department)])].sort();
          setDepartmentList(merged);
        }
      } catch { /* keep fallback */ }
    };
    loadDepts();
  }, []);

  const loadFaculty = async () => {
    setLoadingFaculty(true);
    try {
      const dept = formData.department || userDepartment;
      let query = db
        .from('users')
        .select('id, name, department, role')
        .in('role', ['FACULTY', 'HOD', 'COORDINATOR'])
        .order('name');

      if (dept) {
        query = query.eq('department', dept);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading faculty:', error);
        setFacultyList([]);
        return;
      }

      setFacultyList((data || []).map((f: any) => ({
        id: f.id,
        name: f.name || 'Unknown',
        department: f.department || '',
        role: f.role || ''
      })));
    } catch (err) {
      console.error('Failed to load faculty:', err);
      setFacultyList([]);
    } finally {
      setLoadingFaculty(false);
    }
  };

  const handleCoordinatorSelect = (facultyId: string) => {
    const faculty = facultyList.find(f => f.id === facultyId);
    setFormData({
      ...formData,
      coordinatorId: facultyId,
      coordinatorName: faculty?.name || ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      id: editClass?.id || undefined,
      totalStudents: editClass?.totalStudents || 0,
      crCount: editClass?.crCount || 0,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{editClass ? 'Edit Class' : 'Create New Class'}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Class Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., CSE-A"
                required
              />
            </div>

            <div>
              <Label htmlFor="semester">Semester</Label>
              <Select value={formData.semester.toString()} onValueChange={(value) => setFormData({ ...formData, semester: parseInt(value) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8].map((sem) => (
                    <SelectItem key={sem} value={sem.toString()}>
                      Semester {sem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="academicYear">Academic Year</Label>
              <Select value={formData.academicYear} onValueChange={(value) => setFormData({ ...formData, academicYear: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024-25">2024-25</SelectItem>
                  <SelectItem value="2025-26">2025-26</SelectItem>
                  <SelectItem value="2026-27">2026-27</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              {userDepartment ? (
                <div className="p-2 bg-gray-50 rounded border">
                  <span className="font-medium text-blue-600">{userDepartment}</span>
                </div>
              ) : (
                <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value as Department })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentList.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label htmlFor="coordinator">Coordinator</Label>
              {loadingFaculty ? (
                <div className="flex items-center gap-2 p-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading faculty...
                </div>
              ) : facultyList.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-amber-600 p-2 bg-amber-50 rounded border border-amber-200">
                    No faculty found for {formData.department}. You can create the class without a coordinator.
                  </p>
                </div>
              ) : (
                <Select value={formData.coordinatorId} onValueChange={handleCoordinatorSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Coordinator (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {facultyList.map((faculty) => (
                      <SelectItem key={faculty.id} value={faculty.id}>
                        {faculty.name} ({faculty.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {editClass ? 'Update Class' : 'Create Class'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassForm;
