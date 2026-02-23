import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Clock, Users, MapPin } from 'lucide-react';
import {
  DAYS, Day, TIME_SLOTS, LUNCH_BREAK, TimetableSlot,
} from '../../types/timetable';

interface TimetableGridProps {
  grid: Record<Day, (TimetableSlot | null)[]>;
  title?: string;
  showFacultyName?: boolean;
  showClassName?: boolean;
  showRoom?: boolean;
  compact?: boolean;
}

const DAY_COLORS: Record<Day, string> = {
  Monday: 'bg-blue-50 border-blue-200',
  Tuesday: 'bg-green-50 border-green-200',
  Wednesday: 'bg-purple-50 border-purple-200',
  Thursday: 'bg-orange-50 border-orange-200',
  Friday: 'bg-pink-50 border-pink-200',
  Saturday: 'bg-indigo-50 border-indigo-200',
};

const DAY_SHORTS: Record<Day, string> = {
  Monday: 'MON', Tuesday: 'TUE', Wednesday: 'WED',
  Thursday: 'THU', Friday: 'FRI', Saturday: 'SAT',
};

const TimetableGrid: React.FC<TimetableGridProps> = ({
  grid,
  showFacultyName = true,
  showClassName = false,
  showRoom = true,
  compact = false,
}) => {
  const renderSlot = (slot: TimetableSlot | null) => {
    if (!slot) {
      return (
        <div className="h-full flex items-center justify-center text-gray-300 text-xs italic">
          Free
        </div>
      );
    }

    const isActivity = slot.type === 'activity';
    const isLab = slot.type === 'lab';
    const displayName = slot.shortName || slot.subjectName || slot.activityName || '';
    const fullName = slot.subjectName || slot.activityName || '';
    const colorClass = slot.color || 'bg-gray-500';

    return (
      <div
        className={`h-full rounded-lg text-white shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${colorClass} ${
          slot.isLabContinuation ? 'rounded-t-none border-t-2 border-white/30' : ''
        }`}
        title={fullName}
      >
        <div className={`p-2 h-full flex flex-col justify-between ${compact ? 'p-1.5' : 'p-2.5'}`}>
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              {isLab && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-white/20 text-white border-white/30">
                  Lab
                </Badge>
              )}
              {isActivity && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-white/20 text-white border-white/30">
                  Activity
                </Badge>
              )}
            </div>
            <div className={`font-bold leading-tight ${compact ? 'text-[10px]' : 'text-xs'}`}>
              {displayName}
            </div>
          </div>
          <div className="space-y-0.5 mt-1">
            {showFacultyName && slot.facultyName && (
              <div className="text-[10px] opacity-90 flex items-center gap-1 truncate">
                <Users className="h-2.5 w-2.5 flex-shrink-0" />
                <span className="truncate">{slot.facultyName}</span>
              </div>
            )}
            {showClassName && slot.className && (
              <div className="text-[10px] opacity-90 flex items-center gap-1 truncate">
                <Users className="h-2.5 w-2.5 flex-shrink-0" />
                <span className="truncate">{slot.className}</span>
              </div>
            )}
            {showRoom && slot.room && (
              <div className="text-[10px] opacity-90 flex items-center gap-1 truncate">
                <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                <span className="truncate">{slot.room}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="shadow-xl border-0 overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700">
                <th className="p-3 text-left text-white font-semibold min-w-[110px] sticky left-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Time</span>
                  </div>
                </th>
                {DAYS.map(day => (
                  <th key={day} className={`p-3 text-center font-semibold border-l border-white/20 min-w-[130px]`}>
                    <div className={`rounded-lg py-1.5 px-2 ${DAY_COLORS[day]}`}>
                      <div className="text-lg font-bold text-gray-800">{DAY_SHORTS[day]}</div>
                      <div className="text-[10px] text-gray-600 font-medium">{day}</div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {TIME_SLOTS.map((ts, idx) => (
                <React.Fragment key={ts.period}>
                  {ts.period === 5 && (
                    <tr>
                      <td
                        colSpan={DAYS.length + 1}
                        className="bg-gradient-to-r from-amber-100 via-orange-100 to-amber-100 border-y-2 border-amber-300"
                      >
                        <div className="flex items-center justify-center gap-2 py-2 text-amber-800 font-semibold">
                          <span className="text-lg">🍽</span>
                          <span className="text-sm">LUNCH BREAK</span>
                          <span className="text-xs text-amber-600">({LUNCH_BREAK.start} – {LUNCH_BREAK.end})</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  <tr className="hover:bg-gray-50/50 transition-colors border-b border-gray-100">
                    <td className="p-2 border-r border-gray-200 sticky left-0 bg-white z-10">
                      <div className="text-center space-y-0.5">
                        <div className="font-bold text-gray-800 text-xs">
                          {ts.start.replace(' AM', '').replace(' PM', '')} – {ts.end.replace(' AM', '').replace(' PM', '')}
                        </div>
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                          {ts.label}
                        </Badge>
                      </div>
                    </td>
                    {DAYS.map(day => {
                      const slot = grid[day]?.[ts.period - 1] ?? null;
                      return (
                        <td
                          key={day}
                          className={`p-1.5 border-l border-gray-100 ${DAY_COLORS[day]} bg-opacity-30`}
                        >
                          <div className={compact ? 'h-[70px]' : 'h-[85px]'}>
                            {renderSlot(slot)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimetableGrid;
