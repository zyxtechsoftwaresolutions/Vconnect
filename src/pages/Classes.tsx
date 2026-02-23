
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Plus, Search, Edit, Trash2, Eye, Users, Loader2, UserPlus } from 'lucide-react';
import Loader from '../components/ui/loader';
import { useAuth } from '../contexts/AuthContext';
import { Department } from '../types/user';
import ClassForm from '../components/forms/ClassForm';
import ClassDetailsModal from '../components/classes/ClassDetailsModal';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useToast } from '../hooks/use-toast';

const db = supabaseAdmin || supabase;

interface ClassData {
  id: string;
  name: string;
  department: Department;
  semester: number;
  academicYear: string;
  coordinatorId: string;
  coordinatorName: string;
  coordinator: string;
  totalStudents: number;
  crCount: number;
  studentIds: string[];
}

const Classes: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showClassForm, setShowClassForm] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);
  const [viewingClass, setViewingClass] = useState<ClassData | null>(null);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClasses();
  }, [user?.department]);

  const loadClasses = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = db.from('classes').select('*').order('name');

      if (user.role !== 'ADMIN' && user.role !== 'PRINCIPAL') {
        if (user.department) {
          query = query.eq('department', user.department);
        }
      }

      const { data: allClasses, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error loading classes:', fetchError);
        setClasses([]);
        return;
      }

      // Collect all coordinator IDs to batch-fetch names
      const coordIds = (allClasses || [])
        .map((cls: any) => cls.coordinator_id)
        .filter((id: any) => id);

      let coordMap: Record<string, string> = {};
      if (coordIds.length > 0) {
        const { data: coordUsers } = await db
          .from('users')
          .select('id, name')
          .in('id', coordIds);
        if (coordUsers) {
          coordUsers.forEach((u: any) => { coordMap[u.id] = u.name; });
        }
      }

      const transformedClasses: ClassData[] = [];

      for (const cls of (allClasses || [])) {
        const { count: studentCount } = await db
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('class', cls.name);

        // Count CRs: check students table role, and also cross-check with users table
        let crCountVal = 0;
        const { count: crFromStudents } = await db
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('class', cls.name)
          .eq('role', 'CR');
        crCountVal = crFromStudents || 0;

        if (crCountVal === 0) {
          // Fallback: check users table for CRs whose student record is in this class
          const { data: classStudents } = await db
            .from('students')
            .select('user_id')
            .eq('class', cls.name);
          if (classStudents && classStudents.length > 0) {
            const userIds = classStudents.map((s: any) => s.user_id).filter(Boolean);
            if (userIds.length > 0) {
              const { count: crFromUsers } = await db
                .from('users')
                .select('*', { count: 'exact', head: true })
                .in('id', userIds)
                .eq('role', 'CR');
              crCountVal = crFromUsers || 0;
            }
          }
        }

        const coordName = cls.coordinator_id ? (coordMap[cls.coordinator_id] || 'Unknown') : 'Not Assigned';

        transformedClasses.push({
          id: cls.id,
          name: cls.name,
          department: cls.department,
          semester: cls.semester || 1,
          academicYear: cls.academic_year || '2025-26',
          coordinatorId: cls.coordinator_id || '',
          coordinatorName: coordName,
          coordinator: coordName,
          totalStudents: studentCount || 0,
          crCount: crCountVal,
          studentIds: cls.student_ids || []
        });
      }

      setClasses(transformedClasses);
    } catch (error) {
      console.error('Error loading classes:', error);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = classes.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.coordinatorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddClass = async (classData: any) => {
    try {
      const department = classData.department || user?.department || Department.CSE;

      // Check for duplicate class name in same department
      const { data: existing } = await db
        .from('classes')
        .select('id')
        .eq('name', classData.name)
        .eq('department', department)
        .maybeSingle();

      if (existing) {
        toast({
          title: 'Class Already Exists',
          description: `A class named "${classData.name}" already exists in ${department}.`,
          variant: 'destructive',
        });
        return;
      }

      // Auto-assign students whose class field already matches
      const { data: matchingStudents } = await db
        .from('students')
        .select('id')
        .eq('class', classData.name)
        .eq('department', department);

      const studentIds = (matchingStudents || []).map((s: any) => s.id);

      // Build insert payload - coordinator_id must be a valid UUID or null
      const insertData: any = {
        name: classData.name,
        department: department,
        semester: classData.semester || 1,
        academic_year: classData.academicYear || '2025-26',
        student_ids: studentIds,
        cr_ids: [],
        is_active: true
      };

      // Only set coordinator_id if it looks like a valid UUID
      if (classData.coordinatorId && classData.coordinatorId.length > 10) {
        insertData.coordinator_id = classData.coordinatorId;
      }

      const { data: created, error: createError } = await db
        .from('classes')
        .insert([insertData])
        .select()
        .single();

      if (createError) {
        console.error('Error creating class:', createError);
        toast({
          title: 'Error Creating Class',
          description: createError.message,
          variant: 'destructive',
        });
        return;
      }

      const autoAssignMsg = studentIds.length > 0
        ? ` ${studentIds.length} student(s) auto-assigned.`
        : '';

      toast({
        title: 'Class Created',
        description: `Class "${classData.name}" created successfully.${autoAssignMsg}`,
      });

      await loadClasses();
    } catch (error: any) {
      console.error('Error creating class:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create class',
        variant: 'destructive',
      });
    }
  };

  const handleEditClass = async (classData: any) => {
    try {
      const updateData: any = {
        name: classData.name,
        semester: classData.semester,
        academic_year: classData.academicYear,
      };

      if (classData.coordinatorId && classData.coordinatorId.length > 10) {
        updateData.coordinator_id = classData.coordinatorId;
      }

      const { error: updateError } = await db
        .from('classes')
        .update(updateData)
        .eq('id', classData.id);

      if (updateError) {
        console.error('Error updating class:', updateError);
        toast({ title: 'Error', description: updateError.message, variant: 'destructive' });
        return;
      }

      toast({ title: 'Class Updated', description: `Class "${classData.name}" updated successfully.` });
      setEditingClass(null);
      setShowClassForm(false);
      await loadClasses();
    } catch (error: any) {
      console.error('Error updating class:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteClass = async (classId: string) => {
    const cls = classes.find(c => c.id === classId);
    if (!window.confirm(`Are you sure you want to delete class "${cls?.name || classId}"? This will NOT delete students, only the class record.`)) return;

    try {
      const { error: deleteError } = await db
        .from('classes')
        .delete()
        .eq('id', classId);

      if (deleteError) {
        console.error('Error deleting class:', deleteError);
        toast({ title: 'Error', description: deleteError.message, variant: 'destructive' });
        return;
      }

      toast({ title: 'Class Deleted', description: 'Class has been deleted.' });
      await loadClasses();
    } catch (error: any) {
      console.error('Error deleting class:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleSyncStudents = async (classData: ClassData) => {
    try {
      const { data: matchingStudents } = await db
        .from('students')
        .select('id')
        .eq('class', classData.name)
        .eq('department', classData.department);

      const studentIds = (matchingStudents || []).map((s: any) => s.id);

      await db
        .from('classes')
        .update({ student_ids: studentIds })
        .eq('id', classData.id);

      toast({
        title: 'Students Synced',
        description: `Found and assigned ${studentIds.length} student(s) to ${classData.name}.`,
      });
      await loadClasses();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (!user) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {user.role === 'ADMIN' || user.role === 'PRINCIPAL' ? 'All' : user.department} Class Management
          </h1>
          <p className="text-gray-600">Create and manage classes, assign students</p>
        </div>
        <Button
          className="flex items-center space-x-2"
          onClick={() => setShowClassForm(true)}
        >
          <Plus className="h-4 w-4" />
          <span>Create New Class</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Classes ({filteredClasses.length})</CardTitle>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader text="Loading classes..." />
          ) : filteredClasses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClasses.map((classData) => (
                <Card key={classData.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{classData.name}</span>
                      <Badge variant="outline">Sem {classData.semester}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Department</span>
                        <Badge className="bg-blue-100 text-blue-800">{classData.department}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Coordinator</span>
                        <span className="font-medium">{classData.coordinatorName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Academic Year</span>
                        <span className="font-medium">{classData.academicYear}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold text-blue-600">{classData.totalStudents} Students</span>
                        </div>
                        <span className="text-sm text-gray-500">{classData.crCount} CRs</span>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setViewingClass(classData)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          title="Sync students from database"
                          onClick={() => handleSyncStudents(classData)}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingClass(classData);
                            setShowClassForm(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteClass(classData.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'No classes match your search criteria.' : 'No classes have been created yet.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowClassForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Class
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {showClassForm && (
        <ClassForm
          onSubmit={editingClass ? handleEditClass : handleAddClass}
          onClose={() => {
            setShowClassForm(false);
            setEditingClass(null);
          }}
          editClass={editingClass}
          userDepartment={user.department}
        />
      )}

      {viewingClass && (
        <ClassDetailsModal
          classData={viewingClass}
          onClose={() => setViewingClass(null)}
          onEdit={() => {
            setEditingClass(viewingClass);
            setViewingClass(null);
            setShowClassForm(true);
          }}
        />
      )}
    </div>
  );
};

export default Classes;
