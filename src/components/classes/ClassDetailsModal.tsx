
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { X, Users, Calendar, BookOpen, GraduationCap, Clock, Loader2 } from 'lucide-react';
import { supabase, supabaseAdmin } from '../../lib/supabase';

const db = supabaseAdmin || supabase;

interface ClassDetailsModalProps {
  classData: any;
  onClose: () => void;
  onEdit: () => void;
}

const ClassDetailsModal: React.FC<ClassDetailsModalProps> = ({ classData, onClose, onEdit }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [subjectCount, setSubjectCount] = useState(0);
  const [weeklyPeriods, setWeeklyPeriods] = useState(0);

  useEffect(() => {
    loadClassData();
  }, [classData]);

  const loadClassData = async () => {
    setLoading(true);
    try {
      // Load students for this class directly from the students table
      const { data: studentData, error: studentError } = await db
        .from('students')
        .select('id, name, register_id, attendance_percentage, attendance')
        .eq('class', classData.name);

      if (!studentError && studentData) {
        setStudents(studentData.map((s: any) => ({
          id: s.id,
          name: s.name,
          registerId: s.register_id,
          attendance: parseFloat(s.attendance_percentage) || 0
        })));
      } else {
        setStudents([]);
      }

      // Load timetable for this class
      if (classData.id) {
        const { data: timetableData, error } = await supabase
          .from('timetables')
          .select('*')
          .eq('class_id', classData.id)
          .order('day_of_week')
          .order('period_number');

        if (!error && timetableData) {
          const timetableMap: any = {};
          const uniqueSubjects = new Set<string>();
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

          timetableData.forEach((entry: any) => {
            const dayName = dayNames[entry.day_of_week];
            if (!timetableMap[dayName]) {
              timetableMap[dayName] = [];
            }
            while (timetableMap[dayName].length < entry.period_number) {
              timetableMap[dayName].push('');
            }
            timetableMap[dayName][entry.period_number - 1] = entry.subject;
            if (entry.subject) uniqueSubjects.add(entry.subject);
          });

          setTimetable(timetableMap);
          setSubjectCount(uniqueSubjects.size);
          setWeeklyPeriods(timetableData.length);
        }
      }
    } catch (error) {
      console.error('Error loading class data:', error);
    } finally {
      setLoading(false);
    }
  };

  const avgAttendance = students.length > 0
    ? (students.reduce((sum, s) => sum + s.attendance, 0) / students.length).toFixed(1)
    : '0.0';

  const getAttendanceColor = (pct: number) => {
    if (pct >= 85) return 'text-green-600';
    if (pct >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5" />
              <span>Class Details - {classData.name}</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading class data...</span>
            </div>
          ) : (
            <>
              {/* Class Information + Real Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Class Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Class Name:</span>
                      <span className="font-medium">{classData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Department:</span>
                      <Badge className="bg-blue-100 text-blue-800">{classData.department}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Semester:</span>
                      <Badge variant="outline">Semester {classData.semester}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Academic Year:</span>
                      <span className="font-medium">{classData.academicYear}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Coordinator:</span>
                      <span className="font-medium">{classData.coordinatorName || classData.coordinator || 'Not Assigned'}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Live Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Students:</span>
                      <span className="font-semibold flex items-center">
                        <Users className="h-4 w-4 mr-1 text-blue-600" />
                        {students.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Attendance:</span>
                      <span className={`font-semibold ${getAttendanceColor(parseFloat(avgAttendance))}`}>
                        {avgAttendance}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subjects (from timetable):</span>
                      <span className="font-medium">{subjectCount > 0 ? subjectCount : 'No timetable set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Weekly Periods:</span>
                      <span className="font-medium">{weeklyPeriods > 0 ? weeklyPeriods : 'No timetable set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Class Representatives:</span>
                      <span className="font-medium">{classData.crCount || 0}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Students List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Students ({students.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {students.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No students assigned to this class yet.</p>
                      <p className="text-sm mt-1">Assign students from Student Management or use the Sync button.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 text-sm text-gray-600">#</th>
                            <th className="text-left p-3 text-sm text-gray-600">Register ID</th>
                            <th className="text-left p-3 text-sm text-gray-600">Student Name</th>
                            <th className="text-left p-3 text-sm text-gray-600">Attendance %</th>
                            <th className="text-left p-3 text-sm text-gray-600">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((student, idx) => (
                            <tr key={student.id} className="border-b hover:bg-gray-50">
                              <td className="p-3 text-sm text-gray-400">{idx + 1}</td>
                              <td className="p-3 font-medium text-blue-600">{student.registerId}</td>
                              <td className="p-3 font-medium">{student.name}</td>
                              <td className="p-3">
                                <span className={`font-medium ${getAttendanceColor(student.attendance)}`}>
                                  {student.attendance}%
                                </span>
                              </td>
                              <td className="p-3">
                                <Badge variant={student.attendance >= 85 ? 'default' : student.attendance >= 75 ? 'secondary' : 'destructive'}>
                                  {student.attendance >= 85 ? 'Good' : student.attendance >= 75 ? 'Average' : 'Low'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Weekly Timetable Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Weekly Timetable</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="border p-2 bg-gray-50">Day</th>
                          <th className="border p-2 bg-gray-50">9:10-10:00</th>
                          <th className="border p-2 bg-gray-50">10:00-10:50</th>
                          <th className="border p-2 bg-gray-50">10:50-11:40</th>
                          <th className="border p-2 bg-gray-50">11:40-12:30</th>
                          <th className="border p-2 bg-gray-50">1:30-2:20</th>
                          <th className="border p-2 bg-gray-50">2:20-3:10</th>
                          <th className="border p-2 bg-gray-50">3:10-4:00</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(timetable).length > 0 ? Object.entries(timetable).map(([day, subjects]: [string, any]) => (
                          <tr key={day}>
                            <td className="border p-2 font-medium bg-gray-50">{day}</td>
                            {Array.isArray(subjects) ? subjects.map((subject, index) => (
                              <td key={index} className="border p-2 text-center text-sm">
                                {subject ? (
                                  <Badge variant="outline" className="text-xs">
                                    {subject}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                            )) : null}
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={8} className="border p-4 text-center text-gray-500">
                              No timetable data available. Set up the timetable to see it here.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button onClick={onEdit} className="flex-1">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Edit Class
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    window.open(`/timetable?class=${classData.name}`, '_blank');
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  View Full Timetable
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={students.length === 0}
                  onClick={() => {
                    import('../../utils/exportUtils').then(({ exportToExcel }) => {
                      const attendanceData = students.map(student => ({
                        'Register ID': student.registerId,
                        'Student Name': student.name,
                        'Attendance %': student.attendance,
                        'Status': student.attendance >= 85 ? 'Good' : student.attendance >= 75 ? 'Average' : 'Low',
                        'Class': classData.name
                      }));
                      exportToExcel(attendanceData, `attendance-report-${classData.name}`);
                    });
                  }}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Attendance Report
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassDetailsModal;
