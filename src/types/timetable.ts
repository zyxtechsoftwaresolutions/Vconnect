export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export type Day = (typeof DAYS)[number];

export const TIME_SLOTS = [
  { period: 1, start: '9:10 AM', end: '10:00 AM', label: '1st Period' },
  { period: 2, start: '10:00 AM', end: '10:50 AM', label: '2nd Period' },
  { period: 3, start: '10:50 AM', end: '11:40 AM', label: '3rd Period' },
  { period: 4, start: '11:40 AM', end: '12:30 PM', label: '4th Period' },
  { period: 5, start: '1:30 PM', end: '2:20 PM', label: '5th Period' },
  { period: 6, start: '2:20 PM', end: '3:10 PM', label: '6th Period' },
  { period: 7, start: '3:10 PM', end: '4:00 PM', label: '7th Period' },
] as const;

export const LUNCH_BREAK = { start: '12:30 PM', end: '1:30 PM' };
export const LUNCH_AFTER_PERIOD = 4;
export const MORNING_PERIODS = [1, 2, 3, 4];
export const AFTERNOON_PERIODS = [5, 6, 7];
export const PERIODS_PER_DAY = 7;

export type TimePreference = 'any' | 'morning' | 'afternoon';
export type SubjectType = 'theory' | 'lab';
export type SlotType = 'theory' | 'lab' | 'activity' | 'free';

export interface SubjectConfig {
  id: string;
  name: string;
  shortName: string;
  type: SubjectType;
  periodsPerWeek: number;
  assignedFacultyId: string;
  assignedFacultyName: string;
  room: string;
  color: string;
}

export interface FacultyConfig {
  id: string;
  name: string;
  department: string;
  timePreference: TimePreference;
}

export interface ExtraActivity {
  id: string;
  name: string;
  shortName: string;
  periodsPerWeek: number;
  isConsecutive: boolean;
  consecutiveCount: number;
  enabled: boolean;
  color: string;
}

export interface SchedulerRules {
  maxPeriodsPerDay: number;
  workingDays: Day[];
  maxWeeklyPeriods: number;
  minSubjectPeriodsPerWeek: number;
  maxSubjectPeriodsPerWeek: number;
  maxConsecutiveTheory: number;
  gapAfterConsecutiveTheory: number;
  labPeriodsPerSession: number;
  labSessionsPerWeek: number;
  periodDurationMinutes: number;
  lunchAfterPeriod: number;
}

export interface TimetableSlot {
  day: Day;
  period: number;
  type: SlotType;
  subjectId?: string;
  subjectName?: string;
  shortName?: string;
  facultyId?: string;
  facultyName?: string;
  room?: string;
  activityId?: string;
  activityName?: string;
  color?: string;
  isLabContinuation?: boolean;
  className?: string;
}

export interface ClassTimetable {
  classId: string;
  className: string;
  department: string;
  grid: Record<Day, (TimetableSlot | null)[]>;
}

export interface ConflictItem {
  type: 'faculty_clash' | 'room_clash' | 'constraint_violation' | 'period_overflow';
  message: string;
  day?: Day;
  period?: number;
  severity: 'error' | 'warning';
}

export const DEFAULT_RULES: SchedulerRules = {
  maxPeriodsPerDay: 7,
  workingDays: [...DAYS],
  maxWeeklyPeriods: 42,
  minSubjectPeriodsPerWeek: 4,
  maxSubjectPeriodsPerWeek: 6,
  maxConsecutiveTheory: 2,
  gapAfterConsecutiveTheory: 1,
  labPeriodsPerSession: 3,
  labSessionsPerWeek: 1,
  periodDurationMinutes: 50,
  lunchAfterPeriod: 4,
};

export const DEFAULT_EXTRA_ACTIVITIES: ExtraActivity[] = [
  { id: 'library', name: 'Library', shortName: 'LIB', periodsPerWeek: 1, isConsecutive: false, consecutiveCount: 1, enabled: true, color: 'bg-amber-500' },
  { id: 'sports', name: 'Sports', shortName: 'SPT', periodsPerWeek: 2, isConsecutive: true, consecutiveCount: 2, enabled: true, color: 'bg-emerald-500' },
  { id: 'crt', name: 'CRT', shortName: 'CRT', periodsPerWeek: 1, isConsecutive: false, consecutiveCount: 1, enabled: true, color: 'bg-cyan-500' },
  { id: 'aptitude', name: 'Aptitude', shortName: 'APT', periodsPerWeek: 1, isConsecutive: false, consecutiveCount: 1, enabled: true, color: 'bg-violet-500' },
  { id: 'nss', name: 'NSS', shortName: 'NSS', periodsPerWeek: 1, isConsecutive: false, consecutiveCount: 1, enabled: true, color: 'bg-rose-500' },
  { id: 'yoga', name: 'Yoga', shortName: 'YGA', periodsPerWeek: 1, isConsecutive: false, consecutiveCount: 1, enabled: true, color: 'bg-lime-600' },
];

export const SUBJECT_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-red-500', 'bg-teal-500',
  'bg-cyan-600', 'bg-yellow-600', 'bg-fuchsia-500', 'bg-sky-600',
];

export const SUBJECT_GRADIENT_COLORS = [
  'bg-gradient-to-br from-blue-500 to-blue-600',
  'bg-gradient-to-br from-green-500 to-green-600',
  'bg-gradient-to-br from-purple-500 to-purple-600',
  'bg-gradient-to-br from-orange-500 to-orange-600',
  'bg-gradient-to-br from-pink-500 to-pink-600',
  'bg-gradient-to-br from-indigo-500 to-indigo-600',
  'bg-gradient-to-br from-red-500 to-red-600',
  'bg-gradient-to-br from-teal-500 to-teal-600',
  'bg-gradient-to-br from-cyan-500 to-cyan-600',
  'bg-gradient-to-br from-amber-500 to-amber-600',
  'bg-gradient-to-br from-fuchsia-500 to-fuchsia-600',
  'bg-gradient-to-br from-sky-500 to-sky-600',
];
