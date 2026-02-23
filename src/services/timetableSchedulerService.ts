import {
  DAYS, Day, PERIODS_PER_DAY,
  MORNING_PERIODS, AFTERNOON_PERIODS,
  FacultyConfig, ExtraActivity, SchedulerRules,
  TimetableSlot, ClassTimetable, ConflictItem, SlotType, TimePreference, SubjectConfig,
} from '../types/timetable';

interface FacultySlotInfo {
  type: SlotType;
  classId: string;
}

type FacultyOccupancy = Map<string, Map<string, FacultySlotInfo>>;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function slotKey(day: Day, period: number): string {
  return `${day}-${period}`;
}

function crossesLunch(p1: number, p2: number, lunchAfter: number): boolean {
  const lo = Math.min(p1, p2);
  const hi = Math.max(p1, p2);
  return lo <= lunchAfter && hi > lunchAfter;
}

function getPeriodsForPreference(pref: TimePreference): number[] {
  switch (pref) {
    case 'morning': return [...MORNING_PERIODS];
    case 'afternoon': return [...AFTERNOON_PERIODS];
    default: return Array.from({ length: PERIODS_PER_DAY }, (_, i) => i + 1);
  }
}

function countConsecutiveTheoryForFaculty(
  facultyId: string,
  day: Day,
  period: number,
  occupancy: FacultyOccupancy,
  lunchAfter: number,
  maxPeriods: number
): number {
  const fMap = occupancy.get(facultyId);
  if (!fMap) return 0;

  let count = 1;

  let p = period - 1;
  while (p >= 1 && !crossesLunch(p, p + 1, lunchAfter)) {
    const info = fMap.get(slotKey(day, p));
    if (info && info.type === 'theory') { count++; p--; } else break;
  }

  p = period + 1;
  while (p <= maxPeriods && !crossesLunch(p - 1, p, lunchAfter)) {
    const info = fMap.get(slotKey(day, p));
    if (info && info.type === 'theory') { count++; p++; } else break;
  }

  return count;
}

function isFacultyOccupied(occupancy: FacultyOccupancy, facultyId: string, day: Day, period: number): boolean {
  return occupancy.get(facultyId)?.has(slotKey(day, period)) ?? false;
}

function markFacultyOccupied(
  occupancy: FacultyOccupancy,
  facultyId: string,
  day: Day,
  period: number,
  type: SlotType,
  classId: string
) {
  if (!occupancy.has(facultyId)) occupancy.set(facultyId, new Map());
  occupancy.get(facultyId)!.set(slotKey(day, period), { type, classId });
}

function createEmptyGrid(rules: SchedulerRules): Record<Day, (TimetableSlot | null)[]> {
  const grid: Record<string, (TimetableSlot | null)[]> = {};
  for (const day of rules.workingDays) {
    grid[day] = Array(rules.maxPeriodsPerDay).fill(null);
  }
  return grid as Record<Day, (TimetableSlot | null)[]>;
}

function buildFacultyOccupancyFromExisting(
  existingTimetables: ClassTimetable[]
): FacultyOccupancy {
  const occupancy: FacultyOccupancy = new Map();
  for (const tt of existingTimetables) {
    for (const day of DAYS) {
      const periods = tt.grid[day];
      if (!periods) continue;
      for (let i = 0; i < periods.length; i++) {
        const slot = periods[i];
        if (slot?.facultyId) {
          markFacultyOccupied(occupancy, slot.facultyId, day, i + 1, slot.type, tt.classId);
        }
      }
    }
  }
  return occupancy;
}

function getValidLabPositions(rules: SchedulerRules): number[][] {
  const positions: number[][] = [];
  const n = rules.labPeriodsPerSession;
  for (let start = 1; start <= rules.maxPeriodsPerDay - n + 1; start++) {
    const block = Array.from({ length: n }, (_, i) => start + i);
    const crossesBoundary = block.some((p, idx) =>
      idx < block.length - 1 && crossesLunch(block[idx], block[idx + 1], rules.lunchAfterPeriod)
    );
    if (!crossesBoundary) positions.push(block);
  }
  return positions;
}

function getValidConsecutivePositions(count: number, rules: SchedulerRules): number[][] {
  const positions: number[][] = [];
  for (let start = 1; start <= rules.maxPeriodsPerDay - count + 1; start++) {
    const block = Array.from({ length: count }, (_, i) => start + i);
    const crosses = block.some((p, idx) =>
      idx < block.length - 1 && crossesLunch(block[idx], block[idx + 1], rules.lunchAfterPeriod)
    );
    if (!crosses) positions.push(block);
  }
  return positions;
}

export function generateClassTimetable(
  config: {
    classId: string;
    className: string;
    department: string;
    subjects: SubjectConfig[];
    activities: ExtraActivity[];
    rules: SchedulerRules;
    facultyConfigs: FacultyConfig[];
  },
  existingTimetables: ClassTimetable[]
): { timetable: ClassTimetable; conflicts: ConflictItem[] } {
  const { classId, className, department, subjects, activities, rules, facultyConfigs } = config;
  const grid = createEmptyGrid(rules);
  const conflicts: ConflictItem[] = [];
  const occupancy = buildFacultyOccupancyFromExisting(
    existingTimetables.filter(t => t.classId !== classId)
  );

  const facultyPrefMap = new Map<string, TimePreference>();
  for (const fc of facultyConfigs) {
    facultyPrefMap.set(fc.id, fc.timePreference);
  }

  const labSubjects = subjects.filter(s => s.type === 'lab');
  const theorySubjects = subjects.filter(s => s.type === 'theory');
  const enabledActivities = activities.filter(a => a.enabled);

  // Phase 1: Place labs
  const validLabPositions = getValidLabPositions(rules);
  for (const lab of shuffle(labSubjects)) {
    let placed = false;
    const pref = facultyPrefMap.get(lab.assignedFacultyId) ?? 'any';
    const preferredPositions = filterPositionsByPreference(validLabPositions, pref, rules);

    for (const day of shuffle([...rules.workingDays])) {
      for (const block of shuffle(preferredPositions.length > 0 ? preferredPositions : validLabPositions)) {
        const allFree = block.every(p => grid[day][p - 1] === null);
        const facultyFree = block.every(p => !isFacultyOccupied(occupancy, lab.assignedFacultyId, day, p));

        if (allFree && facultyFree) {
          block.forEach((p, idx) => {
            const slot: TimetableSlot = {
              day, period: p, type: 'lab',
              subjectId: lab.id, subjectName: lab.name, shortName: lab.shortName,
              facultyId: lab.assignedFacultyId, facultyName: lab.assignedFacultyName,
              room: lab.room, color: lab.color,
              isLabContinuation: idx > 0,
            };
            grid[day][p - 1] = slot;
            markFacultyOccupied(occupancy, lab.assignedFacultyId, day, p, 'lab', classId);
          });
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
    if (!placed) {
      conflicts.push({
        type: 'constraint_violation', severity: 'error',
        message: `Could not schedule lab "${lab.name}" — no valid 3-period block available.`,
      });
    }
  }

  // Phase 2: Place consecutive activities
  const consecutiveActs = enabledActivities.filter(a => a.isConsecutive);
  for (const act of consecutiveActs) {
    let placed = false;
    const positions = getValidConsecutivePositions(act.consecutiveCount, rules);
    for (const day of shuffle([...rules.workingDays])) {
      for (const block of shuffle(positions)) {
        if (block.every(p => grid[day][p - 1] === null)) {
          block.forEach((p, idx) => {
            grid[day][p - 1] = {
              day, period: p, type: 'activity',
              activityId: act.id, activityName: act.name, shortName: act.shortName,
              color: act.color, isLabContinuation: idx > 0,
            };
          });
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
    if (!placed) {
      conflicts.push({
        type: 'constraint_violation', severity: 'warning',
        message: `Could not schedule activity "${act.name}" — no consecutive block available.`,
      });
    }
  }

  // Phase 3: Place single activities
  const singleActs = enabledActivities.filter(a => !a.isConsecutive);
  for (const act of singleActs) {
    let remaining = act.periodsPerWeek;
    for (const day of shuffle([...rules.workingDays])) {
      if (remaining <= 0) break;
      for (const p of shuffle(Array.from({ length: rules.maxPeriodsPerDay }, (_, i) => i + 1))) {
        if (remaining <= 0) break;
        if (grid[day][p - 1] === null) {
          grid[day][p - 1] = {
            day, period: p, type: 'activity',
            activityId: act.id, activityName: act.name, shortName: act.shortName,
            color: act.color,
          };
          remaining--;
          break;
        }
      }
    }
    if (remaining > 0) {
      conflicts.push({
        type: 'constraint_violation', severity: 'warning',
        message: `Could only place ${act.periodsPerWeek - remaining}/${act.periodsPerWeek} periods for "${act.name}".`,
      });
    }
  }

  // Phase 4: Place theory subjects
  const sortedTheory = [...theorySubjects].sort((a, b) => b.periodsPerWeek - a.periodsPerWeek);
  for (const subject of sortedTheory) {
    let placed = 0;
    const target = subject.periodsPerWeek;
    const pref = facultyPrefMap.get(subject.assignedFacultyId) ?? 'any';
    const allowedPeriods = getPeriodsForPreference(pref);

    const daysWithSubject = new Set<Day>();

    for (let round = 0; round < Math.ceil(target / rules.workingDays.length) + 1 && placed < target; round++) {
      for (const day of shuffle([...rules.workingDays])) {
        if (placed >= target) break;
        if (round === 0 && daysWithSubject.has(day)) continue;

        for (const p of shuffle(allowedPeriods)) {
          if (grid[day][p - 1] !== null) continue;
          if (isFacultyOccupied(occupancy, subject.assignedFacultyId, day, p)) continue;

          const wouldExceed = countConsecutiveTheoryForFaculty(
            subject.assignedFacultyId, day, p, occupancy,
            rules.lunchAfterPeriod, rules.maxPeriodsPerDay
          ) >= rules.maxConsecutiveTheory;
          if (wouldExceed) continue;

          grid[day][p - 1] = {
            day, period: p, type: 'theory',
            subjectId: subject.id, subjectName: subject.name, shortName: subject.shortName,
            facultyId: subject.assignedFacultyId, facultyName: subject.assignedFacultyName,
            room: subject.room, color: subject.color,
          };
          markFacultyOccupied(occupancy, subject.assignedFacultyId, day, p, 'theory', classId);
          daysWithSubject.add(day);
          placed++;
          break;
        }
      }
    }

    if (placed < rules.minSubjectPeriodsPerWeek) {
      conflicts.push({
        type: 'constraint_violation', severity: 'error',
        message: `"${subject.name}" got only ${placed} periods (minimum ${rules.minSubjectPeriodsPerWeek} required).`,
      });
    } else if (placed < target) {
      conflicts.push({
        type: 'constraint_violation', severity: 'warning',
        message: `"${subject.name}" got ${placed}/${target} requested periods.`,
      });
    }
  }

  // Validate total periods
  let totalUsed = 0;
  for (const day of rules.workingDays) {
    totalUsed += grid[day].filter(s => s !== null).length;
  }
  if (totalUsed > rules.maxWeeklyPeriods) {
    conflicts.push({
      type: 'period_overflow', severity: 'error',
      message: `Total weekly periods (${totalUsed}) exceeds maximum (${rules.maxWeeklyPeriods}).`,
    });
  }

  return {
    timetable: { classId, className, department, grid },
    conflicts,
  };
}

function filterPositionsByPreference(
  positions: number[][],
  pref: TimePreference,
  rules: SchedulerRules
): number[][] {
  if (pref === 'any') return positions;
  return positions.filter(block => {
    if (pref === 'morning') return block.every(p => p <= rules.lunchAfterPeriod);
    if (pref === 'afternoon') return block.every(p => p > rules.lunchAfterPeriod);
    return true;
  });
}

export function buildFacultyTimetable(
  facultyId: string,
  allTimetables: ClassTimetable[],
  rules: SchedulerRules
): Record<Day, (TimetableSlot | null)[]> {
  const grid = createEmptyGrid(rules);
  for (const tt of allTimetables) {
    for (const day of DAYS) {
      const periods = tt.grid[day];
      if (!periods) continue;
      for (let i = 0; i < periods.length; i++) {
        const slot = periods[i];
        if (slot?.facultyId === facultyId) {
          grid[day][i] = { ...slot, className: tt.className };
        }
      }
    }
  }
  return grid;
}

export function detectCrossClassConflicts(timetables: ClassTimetable[]): ConflictItem[] {
  const conflicts: ConflictItem[] = [];
  const facultySlots = new Map<string, { day: Day; period: number; className: string }[]>();

  for (const tt of timetables) {
    for (const day of DAYS) {
      const periods = tt.grid[day];
      if (!periods) continue;
      for (let i = 0; i < periods.length; i++) {
        const slot = periods[i];
        if (!slot?.facultyId) continue;
        if (!facultySlots.has(slot.facultyId)) facultySlots.set(slot.facultyId, []);
        facultySlots.get(slot.facultyId)!.push({ day, period: i + 1, className: tt.className });
      }
    }
  }

  for (const [facultyId, slots] of facultySlots) {
    const byDayPeriod = new Map<string, string[]>();
    for (const s of slots) {
      const key = `${s.day}-${s.period}`;
      if (!byDayPeriod.has(key)) byDayPeriod.set(key, []);
      byDayPeriod.get(key)!.push(s.className);
    }
    for (const [key, classes] of byDayPeriod) {
      if (classes.length > 1) {
        const [day, period] = key.split('-');
        conflicts.push({
          type: 'faculty_clash', severity: 'error',
          day: day as Day, period: Number(period),
          message: `Faculty conflict: same faculty assigned to ${classes.join(', ')} at ${day} Period ${period}.`,
        });
      }
    }
  }

  return conflicts;
}
