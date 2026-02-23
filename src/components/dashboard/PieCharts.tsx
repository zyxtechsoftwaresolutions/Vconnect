import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { UserRole, Department } from '../../types/user';
import {
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const db = supabaseAdmin || supabase;

interface PieChartsProps {
  userRole: UserRole;
  userDepartment?: Department;
  isStudent?: boolean;
}

type ChartData = Array<{ name: string; value: number; color: string }>;

const PieCharts: React.FC<PieChartsProps> = ({ userRole, userDepartment, isStudent = false }) => {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState<ChartData>([]);
  const [feeData, setFeeData] = useState<ChartData>([]);
  const [subjectData, setSubjectData] = useState<ChartData>([]);
  const [loading, setLoading] = useState(true);

  const personalRoles = [UserRole.STUDENT, UserRole.CR, UserRole.FACULTY, UserRole.COORDINATOR, UserRole.HOD];
  const isPersonal = isStudent || personalRoles.includes(userRole);

  useEffect(() => {
    loadAnalyticsData();
  }, [userRole, userDepartment, isStudent, user]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      if (isStudent || userRole === UserRole.CR) {
        await loadStudentData();
      } else if (userRole === UserRole.FACULTY || userRole === UserRole.COORDINATOR || userRole === UserRole.HOD) {
        await loadStaffData();
      } else {
        await loadAdminData();
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentData = async () => {
    if (!user?.email) return;

    const { data: studentData } = await db
      .from('students')
      .select('id, attendance_percentage')
      .eq('email', user.email)
      .single();

    if (!studentData?.id) return;

    // 1. Attendance pie from real records
    const { data: records } = await db
      .from('attendance_records')
      .select('status, subject')
      .eq('student_id', studentData.id);

    const recs = records || [];
    const present = recs.filter((r: any) => r.status === 'PRESENT').length;
    const absent = recs.filter((r: any) => r.status === 'ABSENT').length;
    const late = recs.filter((r: any) => r.status === 'LATE').length;
    const total = recs.length;

    if (total > 0) {
      setAttendanceData([
        { name: 'Present', value: present, color: '#10b981' },
        { name: 'Absent', value: absent, color: '#ef4444' },
        { name: 'Late', value: late, color: '#f59e0b' },
      ]);
    }

    // 2. Fee pie for this student
    const { data: feeRecords } = await db
      .from('student_fee_records')
      .select('status')
      .eq('student_id', studentData.id);

    const fees = feeRecords || [];
    if (fees.length > 0) {
      const paid = fees.filter((r: any) => r.status === 'PAID').length;
      const pending = fees.filter((r: any) => r.status === 'PENDING' || r.status === 'PARTIAL').length;
      const overdue = fees.filter((r: any) => r.status === 'OVERDUE').length;
      setFeeData([
        { name: 'Paid', value: paid, color: '#10b981' },
        { name: 'Pending', value: pending, color: '#f59e0b' },
        { name: 'Overdue', value: overdue, color: '#ef4444' },
      ].filter(d => d.value > 0));
    } else {
      setFeeData([{ name: 'No Fee Data', value: 1, color: '#d1d5db' }]);
    }

    // 3. Subject-wise attendance
    if (total > 0) {
      const subjectMap = new Map<string, { present: number; total: number }>();
      for (const r of recs) {
        const subj = (r as any).subject || 'General';
        let s = subjectMap.get(subj);
        if (!s) { s = { present: 0, total: 0 }; subjectMap.set(subj, s); }
        s.total++;
        if ((r as any).status === 'PRESENT' || (r as any).status === 'LATE') s.present++;
      }

      const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];
      const subjData: ChartData = [];
      let i = 0;
      for (const [name, val] of subjectMap) {
        subjData.push({ name, value: val.present, color: colors[i % colors.length] });
        i++;
      }
      setSubjectData(subjData);
    }
  };

  const loadStaffData = async () => {
    if (!user) return;

    // For faculty/coordinator/HOD: department-wide data
    const dept = userDepartment || user.department;

    // 1. Department attendance
    const { data: deptStudents } = await db
      .from('students')
      .select('id')
      .eq('department', dept);

    const studentIds = (deptStudents || []).map((s: any) => s.id);

    if (studentIds.length > 0) {
      const { data: records } = await db
        .from('attendance_records')
        .select('status, subject')
        .in('student_id', studentIds)
        .limit(5000);

      const recs = records || [];
      const present = recs.filter((r: any) => r.status === 'PRESENT').length;
      const absent = recs.filter((r: any) => r.status === 'ABSENT').length;
      const late = recs.filter((r: any) => r.status === 'LATE').length;

      if (recs.length > 0) {
        setAttendanceData([
          { name: 'Present', value: present, color: '#10b981' },
          { name: 'Absent', value: absent, color: '#ef4444' },
          { name: 'Late', value: late, color: '#f59e0b' },
        ]);

        // Subject breakdown
        const subjectMap = new Map<string, number>();
        for (const r of recs) {
          const subj = (r as any).subject || 'General';
          subjectMap.set(subj, (subjectMap.get(subj) || 0) + 1);
        }
        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];
        const subjData: ChartData = [];
        let i = 0;
        for (const [name, val] of subjectMap) {
          subjData.push({ name, value: val, color: colors[i % colors.length] });
          i++;
        }
        setSubjectData(subjData);
      }

      // 2. Department fee data
      const { data: feeRecords } = await db
        .from('student_fee_records')
        .select('status')
        .in('student_id', studentIds);

      const fees = feeRecords || [];
      if (fees.length > 0) {
        const paid = fees.filter((r: any) => r.status === 'PAID').length;
        const pending = fees.filter((r: any) => r.status === 'PENDING' || r.status === 'PARTIAL').length;
        const overdue = fees.filter((r: any) => r.status === 'OVERDUE').length;
        setFeeData([
          { name: 'Paid', value: paid, color: '#10b981' },
          { name: 'Pending', value: pending, color: '#f59e0b' },
          { name: 'Overdue', value: overdue, color: '#ef4444' },
        ].filter(d => d.value > 0));
      } else {
        setFeeData([{ name: 'No Fee Data', value: 1, color: '#d1d5db' }]);
      }
    }
  };

  const loadAdminData = async () => {
    // Admin/Principal: all data
    const { data: records } = await db
      .from('attendance_records')
      .select('status, subject')
      .limit(5000);

    const recs = records || [];
    if (recs.length > 0) {
      const present = recs.filter((r: any) => r.status === 'PRESENT').length;
      const absent = recs.filter((r: any) => r.status === 'ABSENT').length;
      const late = recs.filter((r: any) => r.status === 'LATE').length;
      setAttendanceData([
        { name: 'Present', value: present, color: '#10b981' },
        { name: 'Absent', value: absent, color: '#ef4444' },
        { name: 'Late', value: late, color: '#f59e0b' },
      ]);

      const subjectMap = new Map<string, number>();
      for (const r of recs) {
        const subj = (r as any).subject || 'General';
        subjectMap.set(subj, (subjectMap.get(subj) || 0) + 1);
      }
      const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];
      const subjData: ChartData = [];
      let i = 0;
      for (const [name, val] of subjectMap) {
        subjData.push({ name, value: val, color: colors[i % colors.length] });
        i++;
      }
      setSubjectData(subjData);
    }

    const { data: feeRecords } = await db
      .from('student_fee_records')
      .select('status');

    const fees = feeRecords || [];
    if (fees.length > 0) {
      const paid = fees.filter((r: any) => r.status === 'PAID').length;
      const pending = fees.filter((r: any) => r.status === 'PENDING' || r.status === 'PARTIAL').length;
      const overdue = fees.filter((r: any) => r.status === 'OVERDUE').length;
      setFeeData([
        { name: 'Paid', value: paid, color: '#10b981' },
        { name: 'Pending', value: pending, color: '#f59e0b' },
        { name: 'Overdue', value: overdue, color: '#ef4444' },
      ].filter(d => d.value > 0));
    }
  };

  const getTitle = () => {
    if (isStudent || userRole === UserRole.CR) return 'Personal Analysis';
    if (userRole === UserRole.FACULTY) return 'Personal Analysis';
    if (userRole === UserRole.HOD || userRole === UserRole.COORDINATOR) return `${userDepartment || ''} Department Analysis`;
    return 'Overall Analysis';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{getTitle()}</h2>
        <p className="text-sm sm:text-base text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (attendanceData.length === 0 && feeData.length === 0 && subjectData.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{getTitle()}</h2>
          <p className="text-sm sm:text-base text-gray-500">No analytics data available yet. Data will appear once attendance is marked and fees are recorded.</p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm text-gray-600">{payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  const renderPie = (data: ChartData, delay: number) => (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={35} outerRadius={75}
          paddingAngle={3} dataKey="value" animationDuration={1200} animationBegin={delay}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{getTitle()}</h2>
        <p className="text-sm sm:text-base text-gray-600">Real-time analytics and performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Attendance Pie */}
        {attendanceData.length > 0 && (
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Users className="h-5 w-5 text-blue-600" />
                <span>Attendance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">{renderPie(attendanceData, 0)}</div>
              <div className="mt-3 space-y-1.5">
                {attendanceData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center">
                      {d.name === 'Present' && <CheckCircle className="h-3.5 w-3.5 mr-1.5" style={{ color: d.color }} />}
                      {d.name === 'Absent' && <XCircle className="h-3.5 w-3.5 mr-1.5" style={{ color: d.color }} />}
                      {d.name === 'Late' && <Clock className="h-3.5 w-3.5 mr-1.5" style={{ color: d.color }} />}
                      {d.name}
                    </span>
                    <span className="font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 2. Fee Status Pie */}
        {feeData.length > 0 && (
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span>Fee Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">{renderPie(feeData, 400)}</div>
              <div className="mt-3 space-y-1.5">
                {feeData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center">
                      {d.name === 'Paid' && <CheckCircle className="h-3.5 w-3.5 mr-1.5" style={{ color: d.color }} />}
                      {d.name === 'Pending' && <Clock className="h-3.5 w-3.5 mr-1.5" style={{ color: d.color }} />}
                      {d.name === 'Overdue' && <AlertTriangle className="h-3.5 w-3.5 mr-1.5" style={{ color: d.color }} />}
                      {d.name === 'No Fee Data' && <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-400" />}
                      {d.name}
                    </span>
                    <span className="font-medium">{d.name === 'No Fee Data' ? '-' : d.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3. Subject-wise Attendance Pie */}
        {subjectData.length > 0 && (
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <BookOpen className="h-5 w-5 text-purple-600" />
                <span>Subject Breakdown</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">{renderPie(subjectData, 800)}</div>
              <div className="mt-3 space-y-1.5">
                {subjectData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center">
                      <span className="w-2.5 h-2.5 rounded-full mr-1.5 inline-block" style={{ backgroundColor: d.color }}></span>
                      <span className="truncate max-w-[140px]">{d.name}</span>
                    </span>
                    <span className="font-medium">{d.value} classes</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PieCharts;
