import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  AlertTriangle,
  Activity,
  BookOpen,
  FlaskConical,
  Users,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Shield,
  Flame,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/user';
import {
  getFacultyWorkloads,
  FacultyWorkloadMetrics,
  DEFAULT_THRESHOLDS,
} from '../../services/facultyWorkloadService';
import { supabase, supabaseAdmin } from '../../lib/supabase';

const db = supabaseAdmin || supabase;

const BURNOUT_CONFIG = {
  normal:   { label: 'Normal',   color: 'bg-green-100 text-green-800 border-green-200',   barColor: 'bg-green-500',  icon: Shield },
  elevated: { label: 'Elevated', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', barColor: 'bg-yellow-500', icon: Activity },
  high:     { label: 'High',     color: 'bg-orange-100 text-orange-800 border-orange-200', barColor: 'bg-orange-500', icon: AlertTriangle },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-800 border-red-200',         barColor: 'bg-red-500',    icon: Flame },
};

const FacultyBurnoutDetection: React.FC = () => {
  const { user } = useAuth();
  const [workloads, setWorkloads] = useState<FacultyWorkloadMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [departments, setDepartments] = useState<string[]>([]);

  const canView =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.PRINCIPAL ||
    user?.role === UserRole.HOD;

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    if (canView) loadWorkloads();
  }, [canView, departmentFilter]);

  const loadDepartments = async () => {
    try {
      const { data } = await db.from('departments').select('name');
      if (data && data.length > 0) {
        setDepartments(data.map((d: any) => d.name));
      } else {
        const { data: users } = await db
          .from('users')
          .select('department')
          .in('role', ['FACULTY', 'HOD', 'COORDINATOR']);
        if (users) {
          const unique = [...new Set(users.map((u: any) => u.department).filter(Boolean))] as string[];
          setDepartments(unique.sort());
        }
      }
    } catch {
      // ignore
    }
  };

  const loadWorkloads = async () => {
    setLoading(true);
    try {
      const deptArg =
        user?.role === UserRole.HOD
          ? (user.department || undefined)
          : departmentFilter === 'all'
            ? undefined
            : departmentFilter;

      const data = await getFacultyWorkloads(deptArg, DEFAULT_THRESHOLDS);
      setWorkloads(data);
    } catch (err) {
      console.error('Error loading faculty workloads:', err);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const counts = { normal: 0, elevated: 0, high: 0, critical: 0 };
    for (const w of workloads) counts[w.burnoutLevel]++;
    return counts;
  }, [workloads]);

  const imbalanceDetected = summary.high > 0 || summary.critical > 0;

  if (!canView) return null;

  return (
    <Card className={imbalanceDetected ? 'border-red-300 shadow-red-100 shadow-md' : ''}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Activity className="h-5 w-5 text-indigo-600" />
            Faculty Load &amp; Burnout Detection
          </CardTitle>

          <div className="flex items-center gap-2">
            {user?.role !== UserRole.HOD && (
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[140px] sm:w-[160px] h-8 text-xs">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button variant="ghost" size="sm" onClick={loadWorkloads} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Alert banner */}
        {imbalanceDetected && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-red-800 text-sm">
                Faculty workload imbalance detected
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                {summary.critical} critical and {summary.high} high-load faculty members require attention.
              </p>
            </div>
          </div>
        )}

        {/* Summary badges */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(BURNOUT_CONFIG) as (keyof typeof BURNOUT_CONFIG)[]).map((level) => {
            const cfg = BURNOUT_CONFIG[level];
            return (
              <Badge key={level} variant="outline" className={`${cfg.color} text-xs px-2 py-1`}>
                {React.createElement(cfg.icon, { className: 'h-3 w-3 mr-1 inline' })}
                {cfg.label}: {summary[level]}
              </Badge>
            );
          })}
        </div>

        {/* Faculty list */}
        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            Analyzing faculty workloads...
          </div>
        ) : workloads.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            No faculty data available. Assign timetable slots and mentees to see workload analysis.
          </p>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {workloads.map((w) => {
              const cfg = BURNOUT_CONFIG[w.burnoutLevel];
              const isExpanded = expandedId === w.facultyId;
              const barPercent = Math.min((w.totalWeeklyScore / w.maxRecommendedScore) * 100, 100);

              return (
                <div
                  key={w.facultyId}
                  className={`border rounded-lg transition-colors ${
                    w.burnoutLevel === 'critical'
                      ? 'border-red-300 bg-red-50/50'
                      : w.burnoutLevel === 'high'
                        ? 'border-orange-200 bg-orange-50/30'
                        : 'border-gray-200'
                  }`}
                >
                  {/* Summary row */}
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : w.facultyId)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {w.facultyName?.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{w.facultyName}</p>
                        <p className="text-xs text-gray-500">{w.department}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Mini workload bar */}
                      <div className="hidden sm:flex items-center gap-2 w-32">
                        <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${cfg.barColor}`}
                            style={{ width: `${barPercent}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-8 text-right">{Math.round(barPercent)}%</span>
                      </div>

                      <Badge variant="outline" className={`${cfg.color} text-[10px] px-1.5 py-0.5`}>
                        {cfg.label}
                      </Badge>

                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                        <MetricTile
                          icon={BookOpen}
                          label="Teaching"
                          value={`${w.teachingHoursPerWeek}h/wk`}
                          sub={`${w.theoryPeriods} theory periods`}
                          warn={w.teachingHoursPerWeek > DEFAULT_THRESHOLDS.maxTeachingHours}
                        />
                        <MetricTile
                          icon={FlaskConical}
                          label="Lab Sessions"
                          value={`${w.labSessions}/wk`}
                          sub={`${w.labHoursPerWeek}h lab hours`}
                          warn={w.labSessions > DEFAULT_THRESHOLDS.maxLabSessions}
                        />
                        <MetricTile
                          icon={Users}
                          label="Mentees"
                          value={`${w.menteeCount}`}
                          sub={`max ${DEFAULT_THRESHOLDS.maxMentees} recommended`}
                          warn={w.menteeCount > DEFAULT_THRESHOLDS.maxMentees}
                        />
                        <MetricTile
                          icon={CalendarClock}
                          label="Meetings"
                          value={`${w.meetingsThisWeek}/wk`}
                          sub={`${w.meetingsThisMonth} this month`}
                          warn={w.meetingsThisWeek > DEFAULT_THRESHOLDS.maxMeetingsPerWeek}
                        />
                      </div>

                      {/* Full workload bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Workload Score</span>
                          <span>{w.totalWeeklyScore} / {w.maxRecommendedScore}</span>
                        </div>
                        <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${cfg.barColor}`}
                            style={{ width: `${barPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Overload reasons */}
                      {w.overloadReasons.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {w.overloadReasons.map((reason, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface MetricTileProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  warn: boolean;
}

const MetricTile: React.FC<MetricTileProps> = ({ icon: Icon, label, value, sub, warn }) => (
  <div
    className={`rounded-lg p-2.5 text-center border ${
      warn ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'
    }`}
  >
    <Icon className={`h-4 w-4 mx-auto mb-1 ${warn ? 'text-red-600' : 'text-gray-500'}`} />
    <p className={`text-base font-bold ${warn ? 'text-red-700' : 'text-gray-900'}`}>{value}</p>
    <p className="text-[10px] text-gray-500 leading-tight">{label}</p>
    <p className="text-[9px] text-gray-400 mt-0.5">{sub}</p>
  </div>
);

export default FacultyBurnoutDetection;
