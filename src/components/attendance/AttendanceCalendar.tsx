
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Calendar, ChevronLeft, ChevronRight, Check, X, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

interface AttendanceDay {
  date: number;
  status: 'present' | 'absent' | 'late' | 'holiday' | null;
  percentage?: number;
}

const AttendanceCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState<AttendanceDay[]>([]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  useEffect(() => {
    const fetchAttendance = async () => {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('attendance_records')
        .select('date,status')
        .gte('date', start.toISOString())
        .lte('date', end.toISOString());

      if (error) {
        console.warn('Attendance fetch failed:', error.message);
        setAttendanceData([]);
        return;
      }

      const base = Array.from({ length: daysInMonth }, (_, i) => ({
        date: i + 1,
        status: null as AttendanceDay['status'],
        percentage: undefined
      }));

      const mapped = base.map(day => {
        const match = data?.find((r: any) => {
          const d = new Date(r.date);
          return d.getDate() === day.date;
        });
        if (!match) return day;
        const status = (match.status || '').toLowerCase() as AttendanceDay['status'];
        return { ...day, status: status === 'present' || status === 'absent' || status === 'late' ? status : null };
      });

      setAttendanceData(mapped);
    };

    fetchAttendance();
  }, [currentDate, daysInMonth]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const getStatusColor = (status: AttendanceDay['status']) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'late':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'holiday':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-white text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: AttendanceDay['status']) => {
    switch (status) {
      case 'present':
        return <Check className="h-3 w-3" />;
      case 'absent':
        return <X className="h-3 w-3" />;
      case 'late':
        return <Clock className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Attendance Calendar</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-4">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-gray-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: firstDayOfMonth }, (_, i) => (
            <div key={`empty-${i}`} className="h-10" />
          ))}
          
          {/* Calendar days */}
          {attendanceData.map((day) => (
            <div
              key={day.date}
              className={cn(
                "h-10 border rounded-lg flex items-center justify-center text-sm font-medium cursor-pointer hover:shadow-md transition-shadow",
                getStatusColor(day.status)
              )}
            >
              <div className="flex items-center space-x-1">
                <span>{day.date}</span>
                {getStatusIcon(day.status)}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Present</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Absent</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Late</span>
            </div>
          </div>
          <div className="text-gray-600">
            Overall: 87.5% attendance
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceCalendar;
