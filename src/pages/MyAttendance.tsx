
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/user';
import { supabaseService } from '../services/supabaseService';
import { StudentData } from '../services/studentService';
import { databaseService } from '../services/databaseService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { UserCheck, Loader2 } from 'lucide-react';

const todayStr = () => new Date().toISOString().split('T')[0];

const TodayAttendance: React.FC<{ studentId: string }> = ({ studentId }) => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const list = await databaseService.getAttendanceByStudent(studentId, todayStr(), todayStr());
      if (!cancelled) setRecords(list || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [studentId]);
  const byPeriod: Record<number, { status: string; subject?: string }> = {};
  for (let p = 1; p <= 7; p++) byPeriod[p] = { status: 'No data', subject: '' };
  records.forEach((r: any) => { byPeriod[r.period] = { status: r.status, subject: r.subject }; });
  if (loading) return <div className="flex items-center gap-2 text-sm text-gray-500 py-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading today...</div>;
  return (
    <div className="flex flex-wrap gap-4">
      {[1, 2, 3, 4, 5, 6, 7].map(p => {
        const { status, subject } = byPeriod[p];
        const isPresent = status === 'PRESENT';
        const isLate = status === 'LATE';
        const isAbsent = status === 'ABSENT';
        return (
          <div key={p} className="flex flex-col items-center gap-1 min-w-[4rem]">
            <span className="text-xs font-medium text-gray-500">P{p}</span>
            <Badge className={`text-xs ${isPresent ? 'bg-green-100 text-green-800' : isLate ? 'bg-orange-100 text-orange-800' : isAbsent ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
              {status === 'No data' ? '-' : status}
            </Badge>
            {subject && <span className="text-xs text-gray-400 truncate max-w-[4rem]">{subject}</span>}
          </div>
        );
      })}
    </div>
  );
};

const MyAttendance: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStudent, setCurrentStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [attendanceFrom, setAttendanceFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [attendanceTo, setAttendanceTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  useEffect(() => {
    const loadStudent = async () => {
      if (!user || (user.role !== UserRole.STUDENT && user.role !== UserRole.CR)) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const studentData = await supabaseService.getStudentByEmail(user.email);
        setCurrentStudent(studentData || null);
      } catch (error) {
        console.error('Error loading student:', error);
        setCurrentStudent(null);
      } finally {
        setLoading(false);
      }
    };
    loadStudent();
  }, [user]);

  useEffect(() => {
    const load = async () => {
      if (!currentStudent?.id) return;
      setAttendanceLoading(true);
      try {
        const records = await databaseService.getAttendanceByStudent(currentStudent.id, attendanceFrom, attendanceTo);
        setAttendanceRecords(records || []);
      } finally {
        setAttendanceLoading(false);
      }
    };
    load();
  }, [currentStudent?.id, attendanceFrom, attendanceTo]);

  if (!user || (user.role !== UserRole.STUDENT && user.role !== UserRole.CR)) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentStudent) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Student profile not found. Please contact support.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
        <p className="text-gray-600 text-sm mt-1">View your today&apos;s attendance and detailed records by date range.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5" />
            <span>Today&apos;s attendance</span>
          </CardTitle>
          <p className="text-sm text-gray-500 font-normal">Period-wise status for today</p>
        </CardHeader>
        <CardContent>
          <TodayAttendance studentId={currentStudent.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5" />
            <span>Detailed attendance</span>
          </CardTitle>
          <p className="text-sm text-gray-500 font-normal">Filter by from-to date</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs">From</Label>
              <Input type="date" value={attendanceFrom} onChange={(e) => setAttendanceFrom(e.target.value)} className="w-36 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">To</Label>
              <Input type="date" value={attendanceTo} onChange={(e) => setAttendanceTo(e.target.value)} className="w-36 text-sm" />
            </div>
          </div>
          {attendanceLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-4"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
          ) : attendanceRecords.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">No attendance records in this date range.</p>
          ) : (
            <div className="overflow-x-auto border rounded-lg max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 sticky top-0">
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Period</th>
                    <th className="text-left p-3">Subject</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((r: any) => (
                    <tr key={r.id} className="border-b">
                      <td className="p-3">{r.date}</td>
                      <td className="p-3">P{r.period}</td>
                      <td className="p-3">{r.subject || '-'}</td>
                      <td className="p-3">
                        <Badge className={r.status === 'PRESENT' ? 'bg-green-100 text-green-800' : r.status === 'LATE' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}>{r.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyAttendance;
