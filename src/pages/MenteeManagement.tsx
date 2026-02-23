import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Users, Search, UserPlus, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/user';
import MenteeAssignment from '../components/mentees/MenteeAssignment';
import { databaseService } from '../services/databaseService';

const MenteeManagement: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  const [facultyWithMentees, setFacultyWithMentees] = useState<any[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);

  useEffect(() => {
    loadMenteeData();
  }, [user]);

  const loadMenteeData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const userDept = user.department;
      const [facultyList, studentsList] = await Promise.all([
        databaseService.getFacultyUsers(userDept),
        userDept ? databaseService.getStudentsByDepartment(userDept) : databaseService.getAllStudents(),
      ]);

      const students = Array.isArray(studentsList) ? studentsList : [];
      const withMentees = facultyList.map((f) => {
        const mentees = students.filter((s: any) => s.mentorId === f.id || s.mentor_id === f.id);
        return {
          id: f.id,
          name: f.name,
          department: f.department,
          employeeId: f.id.slice(0, 8),
          maxMentees: 30,
          mentees: mentees.map((m: any) => ({
            id: m.id,
            name: m.name,
            registerId: m.registerId ?? m.register_id,
            class: m.class ?? m.classId ?? '',
            attendance: m.attendancePercentage ?? m.attendance_percentage ?? 0,
          })),
        };
      });
      const unassigned = students.filter((s: any) => !s.mentorId && !s.mentor_id);

      setFacultyWithMentees(withMentees);
      setUnassignedStudents(unassigned);
    } catch (error) {
      console.error('Error loading mentee data:', error);
      setFacultyWithMentees([]);
      setUnassignedStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredFaculty = facultyWithMentees.filter(faculty =>
    faculty.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faculty.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportMenteeData = (faculty?: any) => {
    import('../utils/exportUtils').then(({ exportToExcel }) => {
      let dataToExport;
      if (faculty) {
        // Export individual faculty's mentees
        dataToExport = faculty.mentees.map((mentee: any) => ({
          'Faculty Name': faculty.name,
          'Employee ID': faculty.employeeId,
          'Student Name': mentee.name,
          'Register ID': mentee.registerId,
          'Class': mentee.class,
          'Attendance %': mentee.attendance
        }));
      } else {
        // Export all mentees
        dataToExport = facultyWithMentees.flatMap(faculty =>
          faculty.mentees.map(mentee => ({
            'Faculty Name': faculty.name,
            'Employee ID': faculty.employeeId,
            'Student Name': mentee.name,
            'Register ID': mentee.registerId,
            'Class': mentee.class,
            'Attendance %': mentee.attendance
          }))
        );
      }
      exportToExcel(dataToExport, faculty ? `mentees-${faculty.employeeId}` : 'all-mentees');
    });
  };

  const canManageMentees = () => {
    return user?.role === UserRole.ADMIN || user?.role === UserRole.PRINCIPAL || user?.role === UserRole.HOD;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p>Loading mentee data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mentee Management</h1>
          <p className="text-gray-600">Assign and manage student mentees to faculty</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={() => exportMenteeData()}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export All</span>
          </Button>
          {canManageMentees() && (
            <Button 
              onClick={() => setShowAssignmentModal(true)}
              className="flex items-center space-x-2"
            >
              <UserPlus className="h-4 w-4" />
              <span>Assign Mentees</span>
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{facultyWithMentees.length}</p>
                <p className="text-sm text-gray-600">Total Faculty</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {facultyWithMentees.reduce((total, faculty) => total + (faculty.mentees?.length || 0), 0)}
                </p>
                <p className="text-sm text-gray-600">Total Mentees</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-600">{unassignedStudents.length}</p>
                <p className="text-sm text-gray-600">Unassigned Students</p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {facultyWithMentees.filter(f => (f.mentees?.length || 0) < (f.maxMentees || 30)).length}
                </p>
                <p className="text-sm text-gray-600">Available Faculty</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search faculty by name or employee ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Faculty with Mentees — dropdown */}
      {facultyWithMentees.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-base font-semibold text-gray-900">Faculty with Mentees</h2>
            <Select
              value={selectedFacultyId ?? ''}
              onValueChange={(v) => setSelectedFacultyId(v || null)}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a faculty to view mentees..." />
              </SelectTrigger>
              <SelectContent>
                {filteredFaculty.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name} ({f.department}) — {f.mentees?.length ?? 0} mentees
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedFacultyId && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedFacultyId(null)}
              >
                Clear
              </Button>
            )}
          </div>
          {selectedFacultyId && (() => {
            const faculty = filteredFaculty.find((f) => f.id === selectedFacultyId);
            if (!faculty) return null;
            return (
              <Card className="overflow-hidden">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                        <span className="truncate">{faculty.name}</span>
                        <Badge variant="outline" className="text-xs shrink-0">{faculty.department}</Badge>
                      </CardTitle>
                      <p className="text-xs text-gray-500 mt-0.5">Emp: {faculty.employeeId}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {faculty.mentees?.length || 0}/{faculty.maxMentees || 30} mentees
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => exportMenteeData(faculty)}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {faculty.mentees && faculty.mentees.length > 0 ? (
                  <CardContent className="py-2 px-4 pb-3 pt-0">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                      {faculty.mentees.map((mentee: any) => (
                        <div
                          key={mentee.id}
                          className="p-2 border rounded bg-gray-50/80 text-sm"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{mentee.name}</p>
                              <p className="text-xs text-gray-500 truncate">{mentee.registerId}</p>
                              {mentee.class && (
                                <p className="text-xs text-gray-400 truncate">{mentee.class}</p>
                              )}
                            </div>
                            <Badge
                              variant={mentee.attendance >= 75 ? 'default' : 'destructive'}
                              className="text-[10px] px-1.5 py-0 shrink-0"
                            >
                              {mentee.attendance}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                ) : (
                  <CardContent className="py-4 text-center text-sm text-gray-500">
                    No mentees assigned yet.
                  </CardContent>
                )}
              </Card>
            );
          })()}
        </div>
      ) : (
        <div className="text-center py-8">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">No faculty with mentees found</p>
          <p className="text-sm text-gray-500 mt-2">Start by assigning mentees to faculty members</p>
        </div>
      )}

      {/* Unassigned Students */}
      {unassignedStudents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Unassigned Students</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {unassignedStudents.map((student) => (
              <Card key={student.id}>
                <CardContent className="p-2.5">
                  <div className="flex items-center justify-between gap-1 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{student.name}</p>
                      <p className="text-xs text-gray-500 truncate">{student.registerId}</p>
                      {student.class && <p className="text-xs text-gray-400 truncate">{student.class}</p>}
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">Unassigned</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Mentee Assignment Modal */}
      {showAssignmentModal && (
        <MenteeAssignment
          onClose={() => setShowAssignmentModal(false)}
          onAssigned={loadMenteeData}
        />
      )}
    </div>
  );
};

export default MenteeManagement;
