
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { UserPlus, Search, Edit, Trash2, Eye, Users, User, BookOpen, CheckSquare, Square, Loader2 } from 'lucide-react';
import { UserRole, Department } from '../types/user';
import StudentForm from '../components/forms/StudentForm';
import { StudentData, updateStudent as updateStudentService } from '../services/studentService';
import { supabaseService } from '../services/supabaseService';
import { supabase, supabaseAdmin } from '../lib/supabase';
import StudentProfileModal from '../components/modals/StudentProfileModal';
import NoDueRequest from '../components/due/NoDueRequest';
import { TableLoader } from '../components/ui/loader';
import { useToast } from '../hooks/use-toast';

const db = supabaseAdmin || supabase;

// Global student data store for cross-component synchronization
let globalStudentUpdateCallbacks: Array<(students: StudentData[]) => void> = [];

export const subscribeToStudentUpdates = (callback: (students: StudentData[]) => void) => {
  globalStudentUpdateCallbacks.push(callback);
  return () => {
    globalStudentUpdateCallbacks = globalStudentUpdateCallbacks.filter(cb => cb !== callback);
  };
};

export const notifyStudentUpdates = (students: StudentData[]) => {
  globalStudentUpdateCallbacks.forEach(callback => callback(students));
};

interface ClassOption {
  id: string;
  name: string;
  department: string;
}

const Students: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentData | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [availableClasses, setAvailableClasses] = useState<ClassOption[]>([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigningStudentId, setAssigningStudentId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [bulkAssignClass, setBulkAssignClass] = useState('');
  const [bulkAssigning, setBulkAssigning] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToStudentUpdates((updatedStudents) => {
      setStudents(updatedStudents);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    loadStudents();
    loadClasses();
  }, [user]);

  const loadStudents = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let allStudents: StudentData[] = [];
      if (user.role === 'ADMIN' || user.role === 'PRINCIPAL') {
        allStudents = await supabaseService.getAllStudents();
      } else if (user.department) {
        allStudents = await supabaseService.getStudentsByDepartment(user.department as any);
      }

      setStudents(allStudents || []);
    } catch (error) {
      console.error('Error loading students:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    if (!user) return;
    try {
      let query = db.from('classes').select('id, name, department').order('name');
      if (user.role !== 'ADMIN' && user.role !== 'PRINCIPAL' && user.department) {
        query = query.eq('department', user.department);
      }
      const { data, error } = await query;
      if (!error && data) {
        setAvailableClasses(data.map((c: any) => ({ id: c.id, name: c.name, department: c.department })));
      }
    } catch (err) {
      console.error('Error loading classes:', err);
    }
  };

  const handleAddStudent = (studentData: StudentData) => {
    supabaseService.addStudent(studentData).then((created) => {
      if (created) {
        const updatedStudents = [...students, created];
        setStudents(updatedStudents);
        notifyStudentUpdates(updatedStudents);
      }
      setShowStudentForm(false);
    });
  };

  const handleEditStudent = (studentData: StudentData) => {
    supabaseService.updateStudent(studentData.id, studentData).then((updated) => {
      if (updated) {
        const updatedStudents = students.map(s => s.id === studentData.id ? updated as any : s);
        setStudents(updatedStudents);
        notifyStudentUpdates(updatedStudents);
      }
      setShowStudentForm(false);
      setEditingStudent(null);
    });
  };

  const handleDeleteStudent = (studentId: string) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      supabaseService.deleteStudent(studentId).then((success) => {
        if (success) {
          const updatedStudents = students.filter(s => s.id !== studentId);
          setStudents(updatedStudents);
          notifyStudentUpdates(updatedStudents);
        }
      });
    }
  };

  const handleAssignClass = async (studentId: string, className: string) => {
    setAssigningStudentId(studentId);
    try {
      const { error } = await db
        .from('students')
        .update({ class: className, updated_at: new Date().toISOString() })
        .eq('id', studentId);

      if (error) {
        toast({ title: 'Error', description: `Failed to assign class: ${error.message}`, variant: 'destructive' });
        return;
      }

      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, class: className } : s));

      const student = students.find(s => s.id === studentId);
      toast({
        title: 'Class Assigned',
        description: `${student?.name || 'Student'} assigned to ${className}.`,
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setAssigningStudentId(null);
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleBulkAssignClass = async () => {
    if (!bulkAssignClass || selectedStudentIds.size === 0) return;
    setBulkAssigning(true);
    try {
      const ids = Array.from(selectedStudentIds);
      const { error } = await db
        .from('students')
        .update({ class: bulkAssignClass, updated_at: new Date().toISOString() })
        .in('id', ids);

      if (error) {
        toast({ title: 'Error', description: `Failed: ${error.message}`, variant: 'destructive' });
        return;
      }

      setStudents(prev => prev.map(s => selectedStudentIds.has(s.id) ? { ...s, class: bulkAssignClass } : s));
      toast({
        title: 'Class Assigned',
        description: `${ids.length} student(s) assigned to ${bulkAssignClass}.`,
      });
      setSelectedStudentIds(new Set());
      setBulkAssignClass('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setBulkAssigning(false);
    }
  };

  const handleViewFullProfile = (student: StudentData) => {
    setSelectedStudentForProfile(student);
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = async (updatedStudent: StudentData) => {
    try {
      const result = await updateStudentService(updatedStudent.id, updatedStudent);
      if (result) {
        const updatedStudents = students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
        setStudents(updatedStudents);
        notifyStudentUpdates(updatedStudents);
      }
    } catch (error) {
      console.error('Error updating student:', error);
    }
  };

  const getAttendanceColor = (attendance: string) => {
    const percentage = parseFloat(attendance?.replace('%', '') || '0');
    if (percentage >= 90) return 'bg-green-100 text-green-800';
    if (percentage >= 80) return 'bg-yellow-100 text-yellow-800';
    if (percentage >= 70) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getDepartmentDisplayName = () => {
    if (user?.role === 'ADMIN' || user?.role === 'PRINCIPAL') return 'All Departments';
    return user?.department || 'Department';
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch =
      (student.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (student.registerId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (student.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (student.class?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesClass = classFilter === 'all'
      || (classFilter === '__unassigned__' ? (!student.class || student.class === '') : student.class === classFilter);

    return matchesSearch && matchesClass;
  });

  const canManage = user?.role === 'HOD' || user?.role === 'ADMIN' || user?.role === 'PRINCIPAL';

  if (!user) {
    return (
      <div className="container mx-auto p-3 sm:p-4 lg:p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Please log in to view students</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Students - {getDepartmentDisplayName()}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2">
            Manage student information, assign classes, and track attendance
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowStudentForm(true)} className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Add Student
          </Button>
        )}
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by name, register ID, email, or class..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {availableClasses.length > 0 && (
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-full md:w-56">
              <BookOpen className="h-4 w-4 mr-2 text-gray-400" />
              <SelectValue placeholder="Filter by class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              <SelectItem value="__unassigned__">Unassigned</SelectItem>
              {availableClasses.map((cls) => (
                <SelectItem key={cls.id} value={cls.name}>
                  {cls.name} ({cls.department})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Students Grid */}
      {loading ? (
        <Card>
          <CardContent className="py-12">
            <TableLoader />
          </CardContent>
        </Card>
      ) : filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm
                ? `No students found matching "${searchTerm}"`
                : classFilter !== 'all'
                ? `No students assigned to class "${classFilter}".`
                : `No students found for ${getDepartmentDisplayName()}.`
              }
            </p>
            {canManage && !searchTerm && classFilter === 'all' && (
              <Button onClick={() => setShowStudentForm(true)} className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Add First Student
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              {canManage && (
                <Button variant="outline" size="sm" onClick={toggleSelectAll} className="flex items-center gap-2">
                  {selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0
                    ? <CheckSquare className="h-4 w-4 text-blue-600" />
                    : <Square className="h-4 w-4" />
                  }
                  {selectedStudentIds.size > 0 ? `${selectedStudentIds.size} selected` : 'Select All'}
                </Button>
              )}
              <p className="text-sm text-gray-500">
                Showing {filteredStudents.length} of {students.length} students
                {classFilter !== 'all' && classFilter !== '__unassigned__' && ` in ${classFilter}`}
                {classFilter === '__unassigned__' && ' (unassigned)'}
              </p>
            </div>

            {canManage && selectedStudentIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg w-full sm:w-auto">
                <span className="text-xs sm:text-sm font-medium text-blue-800">{selectedStudentIds.size} selected →</span>
                <Select value={bulkAssignClass} onValueChange={setBulkAssignClass}>
                  <SelectTrigger className="w-28 sm:w-40 h-8 text-xs sm:text-sm">
                    <SelectValue placeholder="Choose class" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.name}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleBulkAssignClass}
                  disabled={!bulkAssignClass || bulkAssigning}
                  className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm"
                >
                  {bulkAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Assign'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setSelectedStudentIds(new Set()); setBulkAssignClass(''); }} className="text-xs sm:text-sm">
                  Clear
                </Button>
              </div>
            )}
          </div>
          <div className="grid gap-4">
            {filteredStudents.map((student) => (
              <Card key={student.id} className={`hover:shadow-md transition-shadow ${selectedStudentIds.has(student.id) ? 'ring-2 ring-blue-400 bg-blue-50/30' : ''}`}>
                <CardContent className="p-3 sm:p-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      {canManage && (
                        <button onClick={() => toggleStudentSelection(student.id)} className="flex-shrink-0">
                          {selectedStudentIds.has(student.id)
                            ? <CheckSquare className="h-5 w-5 text-blue-600" />
                            : <Square className="h-5 w-5 text-gray-300 hover:text-gray-500" />
                          }
                        </button>
                      )}
                      <div className="h-11 w-11 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm">
                        {student.name?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{student.name}</h3>
                        <p className="text-sm text-gray-500">{student.registerId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getAttendanceColor(student.attendance)}>
                        {student.attendance || 'N/A'}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => handleViewFullProfile(student)} className="text-blue-600">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canManage && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => { setEditingStudent(student); setShowStudentForm(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteStudent(student.id)} className="text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Email</p>
                      <p className="text-gray-900 truncate">{student.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Department</p>
                      <p className="text-gray-900">{student.department}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Phone</p>
                      <p className="text-gray-900">{student.phoneNumber}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Regulation</p>
                      <p className="text-gray-900">{student.regulation}</p>
                    </div>
                    {/* Class assignment */}
                    <div>
                      <p className="text-gray-500">Class</p>
                      {canManage && availableClasses.length > 0 ? (
                        <Select
                          value={student.class || ''}
                          onValueChange={(value) => handleAssignClass(student.id, value)}
                          disabled={assigningStudentId === student.id}
                        >
                          <SelectTrigger className="h-7 text-xs mt-0.5">
                            <SelectValue placeholder="Assign class" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableClasses
                              .filter(cls => cls.department === student.department || user?.role === 'ADMIN' || user?.role === 'PRINCIPAL')
                              .map((cls) => (
                                <SelectItem key={cls.id} value={cls.name}>{cls.name}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="text-blue-600 mt-0.5">{student.class || 'Unassigned'}</Badge>
                      )}
                    </div>
                  </div>
                  {/* No Due request widget */}
                  <NoDueRequest studentId={student.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {showStudentForm && (
        <StudentForm
          onSubmit={editingStudent ? handleEditStudent : handleAddStudent}
          onClose={() => {
            setShowStudentForm(false);
            setEditingStudent(null);
          }}
          editStudent={editingStudent}
          userDepartment={user.department}
        />
      )}

      <StudentProfileModal
        student={selectedStudentForProfile}
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedStudentForProfile(null);
        }}
        onSave={handleSaveProfile}
      />
    </div>
  );
};

export default Students;
