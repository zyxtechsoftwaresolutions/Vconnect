
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { CalendarDays, Search, UserCheck, UserX, Clock, Plus, Edit, Loader2 } from 'lucide-react';
import Loader from '../components/ui/loader';
import AttendanceMarkingForm from '../components/attendance/AttendanceMarkingForm';
import { useAuth } from '../contexts/AuthContext';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useToast } from '../hooks/use-toast';

const db = supabaseAdmin || supabase;

interface RawRecord {
  id: string;
  student_id: string;
  class_id: string;
  subject: string;
  period: number;
  status: string;
  date: string;
  studentName: string;
  registerId: string;
  className: string;
}

interface GroupedStudent {
  student_id: string;
  studentName: string;
  registerId: string;
  className: string;
  periods: { [period: number]: { id: string; status: string; subject: string } };
  presentCount: number;
  absentCount: number;
  lateCount: number;
}

// Cache by date so returning to the page doesn't trigger a full reload
let attendanceCache: { date: string; records: RawRecord[] } = { date: '', records: [] };

const Attendance: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [showMarkingForm, setShowMarkingForm] = useState(false);
  const [rawRecords, setRawRecords] = useState<RawRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);

  const canMarkAttendance = user?.role === 'ADMIN' || user?.role === 'PRINCIPAL' ||
    user?.role === 'HOD' || user?.role === 'COORDINATOR' || user?.role === 'CR' || user?.role === 'FACULTY';

  useEffect(() => { loadClasses(); }, [user]);
  useEffect(() => { loadAttendanceRecords(); }, [selectedDate, user, classes]);

  const loadClasses = async () => {
    try {
      const { data, error } = await db.from('classes').select('id, name').order('name');
      if (!error && data) setClasses(data.map((c: any) => ({ id: c.id, name: c.name })));
    } catch (err) {
      console.error('Error loading classes:', err);
    }
  };

  const loadAttendanceRecords = async (showLoader = true) => {
    const isCached = attendanceCache.date === selectedDate && attendanceCache.records.length > 0;
    if (isCached) {
      setRawRecords(attendanceCache.records);
      setLoading(false);
    } else if (showLoader) {
      setLoading(true);
    }
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`*, students!inner(id, name, register_id, class), classes(id, name)`)
        .eq('date', selectedDate)
        .order('period', { ascending: true });

      if (error) {
        console.error('Error loading attendance:', error);
        setRawRecords([]);
        attendanceCache = { date: selectedDate, records: [] };
        return;
      }

      const mapped = (data || []).map((r: any) => ({
        id: r.id,
        student_id: r.student_id,
        class_id: r.class_id,
        subject: r.subject,
        period: r.period,
        status: r.status,
        date: r.date,
        studentName: r.students?.name || 'Unknown',
        registerId: r.students?.register_id || 'N/A',
        className: r.classes?.name || r.students?.class || 'N/A',
      }));
      attendanceCache = { date: selectedDate, records: mapped };
      setRawRecords(mapped);
    } catch (error) {
      console.error('Error:', error);
      setRawRecords([]);
      attendanceCache = { date: selectedDate, records: [] };
    } finally {
      setLoading(false);
    }
  };

  // Derived: unique subjects from real data
  const subjects = useMemo(() =>
    [...new Set(rawRecords.map(r => r.subject).filter(Boolean))],
    [rawRecords]
  );

  // Is a specific period or subject selected?
  const isDetailedView = selectedPeriod !== 'all' || selectedSubject !== 'all';

  // Filter raw records
  const filteredRecords = useMemo(() => {
    return rawRecords.filter(r => {
      if (selectedClass !== 'all' && r.className !== selectedClass) return false;
      if (selectedSubject !== 'all' && r.subject !== selectedSubject) return false;
      if (selectedPeriod !== 'all' && r.period !== parseInt(selectedPeriod)) return false;
      const term = searchTerm.toLowerCase();
      if (term && !r.studentName.toLowerCase().includes(term) && !r.registerId.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [rawRecords, selectedClass, selectedSubject, selectedPeriod, searchTerm]);

  // Grouped view: one row per student with period dots
  const groupedStudents = useMemo((): GroupedStudent[] => {
    const map = new Map<string, GroupedStudent>();

    // Apply class and search filters, but NOT period/subject for grouped view
    const baseFiltered = rawRecords.filter(r => {
      if (selectedClass !== 'all' && r.className !== selectedClass) return false;
      const term = searchTerm.toLowerCase();
      if (term && !r.studentName.toLowerCase().includes(term) && !r.registerId.toLowerCase().includes(term)) return false;
      return true;
    });

    for (const r of baseFiltered) {
      let student = map.get(r.student_id);
      if (!student) {
        student = {
          student_id: r.student_id,
          studentName: r.studentName,
          registerId: r.registerId,
          className: r.className,
          periods: {},
          presentCount: 0, absentCount: 0, lateCount: 0,
        };
        map.set(r.student_id, student);
      }
      // Store the latest status per period
      student.periods[r.period] = { id: r.id, status: r.status, subject: r.subject };
    }

    // Count statuses per student
    for (const student of map.values()) {
      for (const p of Object.values(student.periods)) {
        if (p.status === 'PRESENT') student.presentCount++;
        else if (p.status === 'ABSENT') student.absentCount++;
        else if (p.status === 'LATE') student.lateCount++;
      }
    }

    return [...map.values()].sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [rawRecords, selectedClass, searchTerm]);

  // Stats: unique students
  const stats = useMemo(() => {
    const studentMap = new Map<string, { present: number; absent: number; late: number; total: number }>();

    for (const r of rawRecords) {
      if (selectedClass !== 'all' && r.className !== selectedClass) continue;
      let s = studentMap.get(r.student_id);
      if (!s) { s = { present: 0, absent: 0, late: 0, total: 0 }; studentMap.set(r.student_id, s); }
      s.total++;
      if (r.status === 'PRESENT') s.present++;
      else if (r.status === 'ABSENT') s.absent++;
      else if (r.status === 'LATE') s.late++;
    }

    let studentsPresent = 0, studentsAbsent = 0, studentsLate = 0;
    for (const s of studentMap.values()) {
      // A student is "present" if majority of their periods are present
      if (s.present >= s.absent && s.present >= s.late) studentsPresent++;
      else if (s.absent > s.present) studentsAbsent++;
      else studentsLate++;
    }

    const total = studentMap.size;
    const pct = total > 0 ? ((studentsPresent / total) * 100).toFixed(1) : '0';

    return { studentsPresent, studentsAbsent, studentsLate, total: total, percentage: pct };
  }, [rawRecords, selectedClass]);

  // Batch save: single insert + single recalculate per student
  const handleSaveAttendance = async (attendanceData: any) => {
    try {
      const classObj = classes.find(c => c.name === attendanceData.class);
      if (!classObj) {
        toast({ title: 'Error', description: `Class "${attendanceData.class}" not found.`, variant: 'destructive' });
        return;
      }

      // Build all records at once
      const records = attendanceData.allEntries.map((entry: any) => ({
        student_id: entry.studentId,
        class_id: classObj.id,
        date: attendanceData.date,
        period: parseInt(entry.period),
        subject: attendanceData.subject,
        status: entry.status,
        marked_by: user?.id || '',
      }));

      // Single batch insert (Supabase handles up to 1000 rows)
      const batchSize = 500;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { error } = await db.from('attendance_records').insert(batch);
        if (error) {
          console.error('Batch insert error:', error);
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
          return;
        }
      }

      // Recalculate once per unique student
      const uniqueStudentIds = [...new Set(records.map((r: any) => r.student_id))] as string[];

      // Batch fetch all records for these students in one query
      const { data: allStudentRecords } = await db
        .from('attendance_records')
        .select('student_id, status')
        .in('student_id', uniqueStudentIds);

      if (allStudentRecords) {
        // Group by student
        const studentStats = new Map<string, { total: number; present: number; late: number }>();
        for (const r of allStudentRecords) {
          let s = studentStats.get(r.student_id);
          if (!s) { s = { total: 0, present: 0, late: 0 }; studentStats.set(r.student_id, s); }
          s.total++;
          if (r.status === 'PRESENT') s.present++;
          else if (r.status === 'LATE') s.late++;
        }

        // Update all students in parallel (much faster than sequential)
        const updatePromises = Array.from(studentStats.entries()).map(([studentId, s]) => {
          const pct = s.total > 0 ? ((s.present + s.late * 0.5) / s.total) * 100 : 0;
          return db.from('students').update({
            attendance_percentage: parseFloat(pct.toFixed(2)),
            attendance: `${pct.toFixed(1)}%`,
          }).eq('id', studentId);
        });
        await Promise.all(updatePromises);
      }

      attendanceCache = { date: '', records: [] };
      await loadAttendanceRecords();
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleEditStatus = async (recordId: string, newStatus: string) => {
    try {
      const { error } = await db.from('attendance_records').update({ status: newStatus }).eq('id', recordId);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }

      const record = rawRecords.find(r => r.id === recordId);
      if (record?.student_id) {
        const { data: allRecs } = await db
          .from('attendance_records')
          .select('status')
          .eq('student_id', record.student_id);
        if (allRecs) {
          const total = allRecs.length;
          const present = allRecs.filter((r: any) => r.status === 'PRESENT').length;
          const late = allRecs.filter((r: any) => r.status === 'LATE').length;
          const pct = total > 0 ? ((present + late * 0.5) / total) * 100 : 0;
          await db.from('students').update({
            attendance_percentage: parseFloat(pct.toFixed(2)),
            attendance: `${pct.toFixed(1)}%`,
          }).eq('id', record.student_id);
        }
      }

      toast({ title: 'Updated', description: `Status changed to ${newStatus}.` });
      attendanceCache = { date: '', records: [] };
      await loadAttendanceRecords();
    } catch (err: any) {
      console.error('Error:', err);
    }
  };

  const dotColor = (status: string) => {
    if (status === 'PRESENT') return 'bg-green-500';
    if (status === 'ABSENT') return 'bg-red-500';
    if (status === 'LATE') return 'bg-orange-400';
    return 'bg-gray-300';
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-gray-600">Track and manage student attendance</p>
        </div>
        {canMarkAttendance && (
          <Button className="flex items-center space-x-2" onClick={() => setShowMarkingForm(true)}>
            <Plus className="h-4 w-4" />
            <span>Mark Attendance</span>
          </Button>
        )}
      </div>

      {/* Stats - unique students */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">{stats.percentage}%</p>
            <p className="text-xs text-gray-500">Attendance Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-600">{stats.studentsPresent}</p>
            <p className="text-xs text-gray-500">Students Present</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-orange-500">{stats.studentsLate}</p>
            <p className="text-xs text-gray-500">Students Late</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-red-600">{stats.studentsAbsent}</p>
            <p className="text-xs text-gray-500">Students Absent</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            <Badge variant="outline" className="ml-2">{stats.total} students</Badge>
          </CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger><SelectValue placeholder="All Classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map(cls => (<SelectItem key={cls.id} value={cls.name}>{cls.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger><SelectValue placeholder="All Periods" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Periods</SelectItem>
                {[1,2,3,4,5,6,7].map(p => (<SelectItem key={p} value={p.toString()}>Period {p}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger><SelectValue placeholder="All Subjects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader size="sm" text="Loading..." />
          ) : isDetailedView ? (
            /* DETAILED VIEW - individual period/subject rows */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 text-xs font-semibold text-gray-600">Register ID</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-600">Student</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-600">Class</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-600">Subject</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-600">Period</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-600">Status</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-600">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map(r => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm font-medium text-blue-600">{r.registerId}</td>
                      <td className="p-3 text-sm font-medium">{r.studentName}</td>
                      <td className="p-3"><Badge variant="outline" className="text-xs">{r.className}</Badge></td>
                      <td className="p-3 text-sm">{r.subject}</td>
                      <td className="p-3 text-sm">{r.period}</td>
                      <td className="p-3">
                        <Badge className={`text-xs ${
                          r.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                          r.status === 'ABSENT' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>{r.status}</Badge>
                      </td>
                      <td className="p-3">
                        <Select onValueChange={(v) => handleEditStatus(r.id, v)}>
                          <SelectTrigger className="w-24 h-7 text-xs">
                            <Edit className="h-3 w-3 mr-1" /><span>Edit</span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PRESENT">Present</SelectItem>
                            <SelectItem value="ABSENT">Absent</SelectItem>
                            <SelectItem value="LATE">Late</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                  {filteredRecords.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-gray-500">No records for this filter.</td></tr>
                  )}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-2 text-right">{filteredRecords.length} record(s)</p>
            </div>
          ) : (
            /* GROUPED VIEW - one row per student with period dots */
            <div className="overflow-x-auto">
              <div className="mb-3 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span> Present</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block"></span> Late</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Absent</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block"></span> No data</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 text-xs font-semibold text-gray-600 w-8">#</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-600">Register ID</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-600">Student</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-600">Class</th>
                    {[1, 2, 3, 4, 5, 6, 7].map(p => (
                      <th key={p} className="text-center p-3 text-xs font-semibold text-gray-600 w-10 min-w-10">P{p}</th>
                    ))}
                    <th className="text-center p-3 text-xs font-semibold text-gray-600 w-24">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedStudents.map((student, idx) => (
                    <tr key={student.student_id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-xs text-gray-400">{idx + 1}</td>
                      <td className="p-3 text-sm font-medium text-blue-600">{student.registerId}</td>
                      <td className="p-3 text-sm font-medium">{student.studentName}</td>
                      <td className="p-3"><Badge variant="outline" className="text-xs">{student.className}</Badge></td>
                      {[1, 2, 3, 4, 5, 6, 7].map(p => {
                        const periodData = student.periods[p];
                        const color = periodData ? dotColor(periodData.status) : 'bg-gray-200';
                        const title = periodData
                          ? `P${p}: ${periodData.status} (${periodData.subject})`
                          : `P${p}: No data`;
                        return (
                          <td key={p} className="p-3 text-center align-middle">
                            <span className={`w-3 h-3 rounded-full ${color} inline-block cursor-help`} title={title} />
                          </td>
                        );
                      })}
                      <td className="p-3 text-center">
                        <span className="text-xs">
                          <span className="text-green-600 font-medium">{student.presentCount}P</span>
                          {student.lateCount > 0 && <span className="text-orange-500 font-medium ml-1">{student.lateCount}L</span>}
                          {student.absentCount > 0 && <span className="text-red-600 font-medium ml-1">{student.absentCount}A</span>}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {groupedStudents.length === 0 && (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-gray-500">
                        No attendance records for {selectedDate}.
                        {canMarkAttendance && (
                          <>
                            <br />
                            <Button variant="link" className="mt-2" onClick={() => setShowMarkingForm(true)}>
                              Mark attendance now
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-2 text-right">
                {groupedStudents.length} student(s) • Select a specific period or subject to see detailed view
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {showMarkingForm && (
        <AttendanceMarkingForm
          onClose={() => setShowMarkingForm(false)}
          onSave={handleSaveAttendance}
          userRole={user?.role || ''}
          userId={user?.id || ''}
        />
      )}
    </div>
  );
};

export default Attendance;
