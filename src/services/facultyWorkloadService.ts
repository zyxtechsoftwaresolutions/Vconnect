import { supabase, supabaseAdmin } from '../lib/supabase';

const db = supabaseAdmin || supabase;

export interface FacultyWorkloadMetrics {
  facultyId: string;
  facultyName: string;
  department: string;
  teachingHoursPerWeek: number;
  theoryPeriods: number;
  labSessions: number;
  labHoursPerWeek: number;
  menteeCount: number;
  meetingsThisWeek: number;
  meetingsThisMonth: number;
  totalWeeklyScore: number;
  maxRecommendedScore: number;
  burnoutLevel: 'normal' | 'elevated' | 'high' | 'critical';
  overloadReasons: string[];
}

export interface WorkloadThresholds {
  maxTeachingHours: number;
  maxLabSessions: number;
  maxMentees: number;
  maxMeetingsPerWeek: number;
}

const DEFAULT_THRESHOLDS: WorkloadThresholds = {
  maxTeachingHours: 20,
  maxLabSessions: 4,
  maxMentees: 25,
  maxMeetingsPerWeek: 5,
};

const PERIOD_DURATION_HOURS = 50 / 60; // 50 minutes
const LAB_PERIODS_PER_SESSION = 3;

function getWeekBounds(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday.toISOString(), end: sunday.toISOString() };
}

function getMonthBounds(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function computeBurnoutLevel(score: number, maxScore: number): FacultyWorkloadMetrics['burnoutLevel'] {
  const ratio = score / maxScore;
  if (ratio <= 0.6) return 'normal';
  if (ratio <= 0.8) return 'elevated';
  if (ratio <= 1.0) return 'high';
  return 'critical';
}

export async function getFacultyWorkloads(
  departmentFilter?: string,
  thresholds: WorkloadThresholds = DEFAULT_THRESHOLDS
): Promise<FacultyWorkloadMetrics[]> {
  let facultyQuery = db
    .from('users')
    .select('id, name, department, role')
    .in('role', ['FACULTY', 'HOD', 'COORDINATOR']);

  if (departmentFilter) {
    facultyQuery = facultyQuery.eq('department', departmentFilter);
  }

  const { data: facultyUsers, error: fuError } = await facultyQuery;
  if (fuError || !facultyUsers || facultyUsers.length === 0) return [];

  const facultyIds = facultyUsers.map((f: any) => f.id);

  // 1. Faculty assignments (timetable slots)
  const { data: assignments } = await db
    .from('faculty_assignments')
    .select('faculty_id, day, period, subject, class_name')
    .in('faculty_id', facultyIds)
    .eq('is_active', true);

  // 2. Mentee counts per faculty (students.mentor_id)
  const menteeCountMap: Record<string, number> = {};
  for (const fId of facultyIds) {
    const { count } = await db
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('mentor_id', fId);
    menteeCountMap[fId] = count || 0;
  }

  // 3. Meetings this week & month
  const weekBounds = getWeekBounds();
  const monthBounds = getMonthBounds();

  const { data: weekMeetings } = await db
    .from('meetings')
    .select('id, scheduled_by, attendees, date_time')
    .gte('date_time', weekBounds.start)
    .lte('date_time', weekBounds.end)
    .neq('status', 'CANCELLED');

  const { data: monthMeetings } = await db
    .from('meetings')
    .select('id, scheduled_by, attendees, date_time')
    .gte('date_time', monthBounds.start)
    .lte('date_time', monthBounds.end)
    .neq('status', 'CANCELLED');

  const countMeetingsForFaculty = (meetings: any[] | null, facultyId: string): number => {
    if (!meetings) return 0;
    return meetings.filter((m: any) => {
      if (m.scheduled_by === facultyId) return true;
      const att = m.attendees;
      if (Array.isArray(att) && att.includes(facultyId)) return true;
      return false;
    }).length;
  };

  // Build assignment maps
  const assignmentMap: Record<string, any[]> = {};
  for (const fId of facultyIds) {
    assignmentMap[fId] = [];
  }
  if (assignments) {
    for (const a of assignments) {
      if (assignmentMap[a.faculty_id]) {
        assignmentMap[a.faculty_id].push(a);
      }
    }
  }

  const results: FacultyWorkloadMetrics[] = [];

  for (const faculty of facultyUsers) {
    const slots = assignmentMap[faculty.id] || [];

    // Detect lab slots: subjects containing "lab" (case-insensitive) or consecutive period blocks
    let theoryPeriods = 0;
    let labPeriods = 0;
    for (const slot of slots) {
      const subjectLower = (slot.subject || '').toLowerCase();
      if (subjectLower.includes('lab') || subjectLower.includes('practical')) {
        labPeriods++;
      } else {
        theoryPeriods++;
      }
    }

    const labSessions = Math.ceil(labPeriods / LAB_PERIODS_PER_SESSION);
    const totalPeriods = theoryPeriods + labPeriods;
    const teachingHours = parseFloat((totalPeriods * PERIOD_DURATION_HOURS).toFixed(1));
    const labHours = parseFloat((labPeriods * PERIOD_DURATION_HOURS).toFixed(1));

    const menteeCount = menteeCountMap[faculty.id] || 0;
    const meetingsWeek = countMeetingsForFaculty(weekMeetings, faculty.id);
    const meetingsMonth = countMeetingsForFaculty(monthMeetings, faculty.id);

    // Weighted scoring (each dimension contributes proportionally to its threshold)
    const teachingScore = (teachingHours / thresholds.maxTeachingHours) * 30;
    const labScore = (labSessions / thresholds.maxLabSessions) * 25;
    const menteeScore = (menteeCount / thresholds.maxMentees) * 25;
    const meetingScore = (meetingsWeek / thresholds.maxMeetingsPerWeek) * 20;
    const totalScore = parseFloat((teachingScore + labScore + menteeScore + meetingScore).toFixed(1));
    const maxScore = 100;

    const overloadReasons: string[] = [];
    if (teachingHours > thresholds.maxTeachingHours)
      overloadReasons.push(`Teaching ${teachingHours}h/wk (max ${thresholds.maxTeachingHours}h)`);
    if (labSessions > thresholds.maxLabSessions)
      overloadReasons.push(`${labSessions} lab sessions/wk (max ${thresholds.maxLabSessions})`);
    if (menteeCount > thresholds.maxMentees)
      overloadReasons.push(`${menteeCount} mentees (max ${thresholds.maxMentees})`);
    if (meetingsWeek > thresholds.maxMeetingsPerWeek)
      overloadReasons.push(`${meetingsWeek} meetings/wk (max ${thresholds.maxMeetingsPerWeek})`);

    results.push({
      facultyId: faculty.id,
      facultyName: faculty.name,
      department: faculty.department || '',
      teachingHoursPerWeek: teachingHours,
      theoryPeriods,
      labSessions,
      labHoursPerWeek: labHours,
      menteeCount,
      meetingsThisWeek: meetingsWeek,
      meetingsThisMonth: meetingsMonth,
      totalWeeklyScore: totalScore,
      maxRecommendedScore: maxScore,
      burnoutLevel: computeBurnoutLevel(totalScore, maxScore),
      overloadReasons,
    });
  }

  results.sort((a, b) => b.totalWeeklyScore - a.totalWeeklyScore);
  return results;
}

export { DEFAULT_THRESHOLDS };
