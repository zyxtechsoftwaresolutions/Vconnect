
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Users, GraduationCap, Calendar, CheckCircle, Clock, AlertTriangle, XCircle, IndianRupee } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/user';
import { databaseService } from '../../services/databaseService';
import { supabase, supabaseAdmin } from '../../lib/supabase';

const db = supabaseAdmin || supabase;

interface StatCard {
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const DashboardStats: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const dbStats = await databaseService.getDashboardStats(user.role, user.department);
      const statCards: StatCard[] = [];

      if (user.role === UserRole.ADMIN || user.role === UserRole.PRINCIPAL || user.role === UserRole.HOD) {
        if (dbStats.totalUsers !== undefined) {
          statCards.push({
            title: 'Total Users',
            value: dbStats.totalUsers.toString(),
            change: '',
            changeType: 'increase',
            icon: Users,
            color: 'text-orange-600'
          });
        }
        if (dbStats.totalStudents !== undefined) {
          statCards.push({
            title: 'Total Students',
            value: dbStats.totalStudents.toString(),
            change: '',
            changeType: 'increase',
            icon: GraduationCap,
            color: 'text-blue-600'
          });
        }
        if (dbStats.totalClasses !== undefined) {
          statCards.push({
            title: 'Total Classes',
            value: dbStats.totalClasses.toString(),
            change: '',
            changeType: 'increase',
            icon: Calendar,
            color: 'text-green-600'
          });
        }
      } else if (user.role === UserRole.STUDENT || user.role === UserRole.CR) {
        const { data: studentData } = await db
          .from('students')
          .select('id, attendance_percentage')
          .eq('email', user.email)
          .single();

        const pct = studentData?.attendance_percentage ?? 0;
        statCards.push({
          title: 'My Attendance',
          value: `${Number(pct).toFixed(1)}%`,
          change: '',
          changeType: pct >= 75 ? 'increase' : 'decrease',
          icon: CheckCircle,
          color: pct >= 75 ? 'text-green-600' : 'text-red-600'
        });

        if (studentData?.id) {
          const { data: attendanceRecords } = await db
            .from('attendance_records')
            .select('status')
            .eq('student_id', studentData.id);

          const records = attendanceRecords || [];
          const total = records.length;
          const attended = records.filter((r: any) => r.status === 'PRESENT' || r.status === 'LATE').length;
          const missed = records.filter((r: any) => r.status === 'ABSENT').length;

          statCards.push({
            title: 'Classes Attended',
            value: `${attended} / ${total}`,
            change: '',
            changeType: 'increase',
            icon: Calendar,
            color: 'text-blue-600'
          });

          statCards.push({
            title: 'Classes Missed',
            value: missed.toString(),
            change: '',
            changeType: missed > 0 ? 'decrease' : 'increase',
            icon: XCircle,
            color: missed > 0 ? 'text-red-600' : 'text-green-600'
          });

          const { data: feeRecords } = await db
            .from('student_fee_records')
            .select('amount_due, amount_paid, status')
            .eq('student_id', studentData.id);

          if (feeRecords && feeRecords.length > 0) {
            const pending = feeRecords
              .filter((r: any) => r.status === 'PENDING' || r.status === 'PARTIAL' || r.status === 'OVERDUE')
              .reduce((sum: number, r: any) => sum + ((parseFloat(r.amount_due) || 0) - (parseFloat(r.amount_paid) || 0)), 0);

            statCards.push({
              title: 'Fee Due',
              value: pending > 0 ? `₹${pending.toLocaleString('en-IN')}` : 'Paid',
              change: '',
              changeType: pending > 0 ? 'decrease' : 'increase',
              icon: IndianRupee,
              color: pending > 0 ? 'text-red-600' : 'text-green-600'
            });
          } else {
            statCards.push({
              title: 'Fee Due',
              value: 'No records',
              change: '',
              changeType: 'increase',
              icon: IndianRupee,
              color: 'text-gray-500'
            });
          }
        }
      } else if (user.role === UserRole.ACCOUNTANT) {
        // Get fee statistics
        const { data: feeRecords } = await supabase
          .from('student_fee_records')
          .select('amount_due, amount_paid, status');
        
        if (feeRecords) {
          const totalCollected = feeRecords
            .filter(r => r.status === 'PAID')
            .reduce((sum, r) => sum + (parseFloat(r.amount_paid) || 0), 0);
          const totalPending = feeRecords
            .filter(r => r.status === 'PENDING' || r.status === 'PARTIAL')
            .reduce((sum, r) => sum + (parseFloat(r.amount_due) || 0), 0);
          const totalOverdue = feeRecords
            .filter(r => r.status === 'OVERDUE')
            .reduce((sum, r) => sum + (parseFloat(r.amount_due) || 0), 0);

          statCards.push({
            title: 'Total Fees Collected',
            value: `₹${(totalCollected / 1000000).toFixed(1)}M`,
            change: '',
            changeType: 'increase',
            icon: CheckCircle,
            color: 'text-green-600'
          });
          statCards.push({
            title: 'Pending Fees',
            value: `₹${(totalPending / 1000000).toFixed(2)}M`,
            change: '',
            changeType: 'decrease',
            icon: Clock,
            color: 'text-yellow-600'
          });
          statCards.push({
            title: 'Overdue Amount',
            value: `₹${(totalOverdue / 1000).toFixed(0)}K`,
            change: '',
            changeType: 'increase',
            icon: AlertTriangle,
            color: 'text-red-600'
          });
        }
      }

      setStats(statCards);
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-20" />
            <CardContent className="h-24" />
          </Card>
        ))}
      </div>
    );
  }

  if (stats.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            {stat.change && (
              <p className={`text-xs ${stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                {stat.change} from last month
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardStats;
