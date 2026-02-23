
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Search, UserCheck, UserX, Clock, Save, CalendarDays, Loader2, CheckCheck } from 'lucide-react';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { useToast } from '../../hooks/use-toast';

const db = supabaseAdmin || supabase;

interface Student {
  id: string;
  name: string;
  registerId: string;
  class: string;
  department: string;
}

interface AttendanceMarkingFormProps {
  onClose: () => void;
  onSave: (attendanceData: any) => void;
  userRole?: string;
  userId?: string;
}

const AttendanceMarkingForm: React.FC<AttendanceMarkingFormProps> = ({ onClose, onSave, userRole, userId }) => {
  const { toast } = useToast();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [wholeDay, setWholeDay] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [attendance, setAttendance] = useState<{[key: string]: 'PRESENT' | 'ABSENT' | 'LATE'}>({});
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<Array<{id: string, name: string, department: string}>>([]);
  const [subjects, setSubjects] = useState<string[]>([]);

  const periods = ['1', '2', '3', '4', '5', '6', '7'];

  useEffect(() => { loadClasses(); }, []);

  useEffect(() => {
    if (selectedClass) {
      loadStudentsForClass(selectedClass);
      loadSubjectsForClass(selectedClass);
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    try {
      if (userRole === 'CR' && userId) {
        // CR can only mark attendance for their own class
        const { data: studentRec } = await db
          .from('students')
          .select('class')
          .eq('user_id', userId)
          .maybeSingle();

        if (studentRec?.class) {
          const { data, error } = await db
            .from('classes')
            .select('id, name, department')
            .eq('name', studentRec.class);
          if (!error && data) {
            setClasses(data.map((c: any) => ({ id: c.id, name: c.name, department: c.department })));
            if (data.length === 1) setSelectedClass(data[0].name);
          }
        }
        return;
      }

      if (userRole === 'COORDINATOR' && userId) {
        // Coordinator can mark attendance for classes they coordinate
        const { data, error } = await db
          .from('classes')
          .select('id, name, department')
          .eq('coordinator_id', userId)
          .order('name');
        if (!error && data && data.length > 0) {
          setClasses(data.map((c: any) => ({ id: c.id, name: c.name, department: c.department })));
          if (data.length === 1) setSelectedClass(data[0].name);
          return;
        }
        // Fallback: if coordinator is not assigned to any class, show all classes in their department
      }

      // HOD, ADMIN, PRINCIPAL, FACULTY, or fallback: show all classes
      const { data, error } = await db.from('classes').select('id, name, department').order('name');
      if (!error && data) {
        setClasses(data.map((c: any) => ({ id: c.id, name: c.name, department: c.department })));
      }
    } catch (err) {
      console.error('Error loading classes:', err);
    }
  };

  const loadStudentsForClass = async (className: string) => {
    setLoading(true);
    setAttendance({});
    try {
      const { data, error } = await db
        .from('students')
        .select('id, name, register_id, class, department')
        .eq('class', className)
        .order('name');

      if (!error && data) {
        setStudents(data.map((s: any) => ({
          id: s.id, name: s.name, registerId: s.register_id,
          class: s.class, department: s.department
        })));
      } else {
        setStudents([]);
      }
    } catch (err) {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSubjectsForClass = async (className: string) => {
    try {
      const classObj = classes.find(c => c.name === className);
      if (!classObj) return;
      const { data, error } = await db
        .from('timetables')
        .select('subject')
        .eq('class_id', classObj.id);

      if (!error && data) {
        const unique = [...new Set(data.map((t: any) => t.subject).filter(Boolean))];
        setSubjects(unique.length > 0 ? unique : ['General']);
      } else {
        setSubjects(['General']);
      }
    } catch {
      setSubjects(['General']);
    }
  };

  const filteredStudents = students.filter(student =>
    (student.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (student.registerId?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const handleAttendanceChange = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE') => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const markAllPresent = () => {
    const updated: {[key: string]: 'PRESENT'} = {};
    filteredStudents.forEach(s => { updated[s.id] = 'PRESENT'; });
    setAttendance(prev => ({ ...prev, ...updated }));
  };

  const markAllAbsent = () => {
    const updated: {[key: string]: 'ABSENT'} = {};
    filteredStudents.forEach(s => { updated[s.id] = 'ABSENT'; });
    setAttendance(prev => ({ ...prev, ...updated }));
  };

  const handleSave = async () => {
    if (!selectedClass || !selectedSubject) {
      toast({ title: 'Missing Fields', description: 'Select class and subject.', variant: 'destructive' });
      return;
    }
    if (!wholeDay && !selectedPeriod) {
      toast({ title: 'Missing Fields', description: 'Select a period or enable whole-day.', variant: 'destructive' });
      return;
    }
    const markedCount = Object.keys(attendance).length;
    if (markedCount === 0) {
      toast({ title: 'No Attendance', description: 'Mark at least one student.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Build ALL records for all periods at once
      const periodsToMark = wholeDay ? periods : [selectedPeriod];
      const allEntries: any[] = [];

      for (const period of periodsToMark) {
        for (const [studentId, status] of Object.entries(attendance)) {
          allEntries.push({ studentId, status, period });
        }
      }

      // Single call to parent with all data bundled
      await onSave({
        class: selectedClass,
        subject: selectedSubject,
        date: selectedDate,
        periods: periodsToMark,
        allEntries,
      });

      toast({
        title: 'Attendance Saved',
        description: `${markedCount} students × ${periodsToMark.length} period(s) on ${selectedDate}.`,
      });
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendance).filter(s => s === 'PRESENT').length;
  const absentCount = Object.values(attendance).filter(s => s === 'ABSENT').length;
  const lateCount = Object.values(attendance).filter(s => s === 'LATE').length;
  const unmarkedCount = filteredStudents.length - presentCount - absentCount - lateCount;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5" />
              <span>Mark Attendance</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" /> Date
              </label>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
              {selectedDate !== new Date().toISOString().split('T')[0] && (
                <p className="text-xs text-amber-600">Marking for a previous date</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Class *</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.name}>{cls.name} ({cls.department})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Subject *</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Period</label>
              {wholeDay ? (
                <div className="h-9 flex items-center px-3 border rounded-md bg-blue-50 text-blue-700 text-sm font-medium">
                  All Periods (1-7)
                </div>
              ) : (
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger><SelectValue placeholder="Select Period" /></SelectTrigger>
                  <SelectContent>
                    {periods.map(p => (<SelectItem key={p} value={p}>Period {p}</SelectItem>))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
            <input type="checkbox" id="wholeDay" checked={wholeDay}
              onChange={(e) => { setWholeDay(e.target.checked); if (e.target.checked) setSelectedPeriod(''); }}
              className="h-4 w-4 rounded border-gray-300" />
            <label htmlFor="wholeDay" className="text-sm font-medium cursor-pointer flex items-center gap-2">
              <CheckCheck className="h-4 w-4 text-blue-600" />
              Mark whole day (all 7 periods at once)
            </label>
          </div>

          {selectedClass && (
            <>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading students...</span>
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserX className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No students in {selectedClass}.</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center space-x-2 flex-1">
                      <Search className="h-4 w-4 text-gray-400" />
                      <Input placeholder="Search..." value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" />
                      <span className="text-sm text-gray-500">{filteredStudents.length} students</span>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={markAllPresent} variant="outline" size="sm" className="text-green-700 border-green-300">
                        <UserCheck className="h-3.5 w-3.5 mr-1" /> All Present
                      </Button>
                      <Button onClick={markAllAbsent} variant="outline" size="sm" className="text-red-700 border-red-300">
                        <UserX className="h-3.5 w-3.5 mr-1" /> All Absent
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                    {filteredStudents.map((student, idx) => (
                      <div key={student.id} className={`flex items-center justify-between p-2.5 border rounded-lg hover:bg-gray-50 ${
                        attendance[student.id] === 'PRESENT' ? 'border-green-200 bg-green-50/30' :
                        attendance[student.id] === 'ABSENT' ? 'border-red-200 bg-red-50/30' :
                        attendance[student.id] === 'LATE' ? 'border-yellow-200 bg-yellow-50/30' : ''
                      }`}>
                        <div className="flex items-center space-x-3">
                          <span className="text-xs text-gray-400 w-6">{idx + 1}</span>
                          <div>
                            <p className="font-medium text-sm">{student.name}</p>
                            <p className="text-xs text-gray-500">{student.registerId}</p>
                          </div>
                        </div>
                        <div className="flex space-x-1.5">
                          <Button variant={attendance[student.id] === 'PRESENT' ? 'default' : 'outline'} size="sm"
                            onClick={() => handleAttendanceChange(student.id, 'PRESENT')}
                            className={`h-7 text-xs ${attendance[student.id] === 'PRESENT' ? 'bg-green-600 hover:bg-green-700' : ''}`}>
                            P
                          </Button>
                          <Button variant={attendance[student.id] === 'LATE' ? 'default' : 'outline'} size="sm"
                            onClick={() => handleAttendanceChange(student.id, 'LATE')}
                            className={`h-7 text-xs ${attendance[student.id] === 'LATE' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`}>
                            L
                          </Button>
                          <Button variant={attendance[student.id] === 'ABSENT' ? 'default' : 'outline'} size="sm"
                            onClick={() => handleAttendanceChange(student.id, 'ABSENT')}
                            className={`h-7 text-xs ${attendance[student.id] === 'ABSENT' ? 'bg-red-600 hover:bg-red-700' : ''}`}>
                            A
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-green-100 text-green-800">Present: {presentCount}</Badge>
                      <Badge className="bg-yellow-100 text-yellow-800">Late: {lateCount}</Badge>
                      <Badge className="bg-red-100 text-red-800">Absent: {absentCount}</Badge>
                      {unmarkedCount > 0 && <Badge className="bg-gray-100 text-gray-600">Unmarked: {unmarkedCount}</Badge>}
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                      <Button onClick={handleSave}
                        disabled={saving || !selectedClass || !selectedSubject || (!wholeDay && !selectedPeriod)}>
                        {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                          : <><Save className="h-4 w-4 mr-2" /> Save Attendance</>}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceMarkingForm;
