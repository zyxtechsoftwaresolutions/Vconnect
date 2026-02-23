/**
 * Exam seating algorithm: no two same class on same bench or side-by-side.
 * Benches are consecutive seats in a row (e.g. 2 seats per bench).
 */

export type Seat = { row: number; col: number; benchIndex: number };

export function getBenchIndex(col: number, seatsPerBench: number): number {
  return Math.floor(col / seatsPerBench);
}

/**
 * Fill a room with a single class in row-by-row order (no gaps).
 * Use when assigning one class per room.
 */
export function fillRoomWithOneClass(
  rows: number,
  cols: number,
  students: { id: string; name: string; registerId: string; class: string }[],
  seatsPerBench: number
): { student_id: string; row_num: number; col_num: number; bench_index: number }[] {
  const out: { student_id: string; row_num: number; col_num: number; bench_index: number }[] = [];
  let idx = 0;
  for (let r = 0; r < rows && idx < students.length; r++) {
    for (let c = 0; c < cols && idx < students.length; c++) {
      const st = students[idx++];
      out.push({
        student_id: st.id,
        row_num: r,
        col_num: c,
        bench_index: getBenchIndex(c, seatsPerBench),
      });
    }
  }
  return out;
}

export function getAdjacentSeats(
  row: number,
  col: number,
  rows: number,
  cols: number,
  seatsPerBench: number
): Seat[] {
  const bench = getBenchIndex(col, seatsPerBench);
  const out: Seat[] = [];
  const add = (r: number, c: number) => {
    if (r >= 0 && r < rows && c >= 0 && c < cols) out.push({ row: r, col: c, benchIndex: getBenchIndex(c, seatsPerBench) });
  };
  add(row, col - 1);
  add(row, col + 1);
  add(row - 1, col);
  add(row + 1, col);
  return out;
}

export function generateSeatingForRoom(
  room: { id: string; name: string; rows: number; cols: number },
  studentsByClass: Array<{ class: string; students: { id: string; name: string; registerId: string; class: string }[] }>,
  seatsPerBench: number
): { student_id: string; row_num: number; col_num: number; bench_index: number }[] {
  const { rows, cols } = room;
  const totalSeats = rows * cols;
  const allStudents: { id: string; name: string; registerId: string; class: string }[] = [];
  studentsByClass.forEach((g) => g.students.forEach((s) => allStudents.push(s)));
  if (allStudents.length === 0) return [];
  const classOrder = studentsByClass.map((g) => g.class);
  const classIndex: Record<string, number> = {};
  classOrder.forEach((c, i) => (classIndex[c] = i));
  const grid: (typeof allStudents[0] | null)[][] = Array(rows)
    .fill(null)
    .map(() => Array(cols).fill(null));
  const benchUsedByClass: Record<number, Set<string>> = {};

  const getBenchKey = (r: number, c: number) => r * Math.ceil(cols / seatsPerBench) + getBenchIndex(c, seatsPerBench);

  const canPlace = (r: number, c: number, studentClass: string): boolean => {
    if (grid[r][c] !== null) return false;
    const benchKey = getBenchKey(r, c);
    if (benchUsedByClass[benchKey]?.has(studentClass)) return false;
    const adj = getAdjacentSeats(r, c, rows, cols, seatsPerBench);
    for (const a of adj) {
      const st = grid[a.row][a.col];
      if (st && st.class === studentClass) return false;
    }
    return true;
  };

  const place = (r: number, c: number, student: typeof allStudents[0]) => {
    grid[r][c] = student;
    const benchKey = getBenchKey(r, c);
    if (!benchUsedByClass[benchKey]) benchUsedByClass[benchKey] = new Set();
    benchUsedByClass[benchKey].add(student.class);
  };

  let studentIdx = 0;
  const remaining = [...allStudents];
  while (remaining.length > 0) {
    let placed = false;
    for (let i = 0; i < remaining.length; i++) {
      const student = remaining[i];
      for (let r = 0; r < rows && !placed; r++) {
        for (let c = 0; c < cols && !placed; c++) {
          if (canPlace(r, c, student.class)) {
            place(r, c, student);
            remaining.splice(i, 1);
            placed = true;
            break;
          }
        }
      }
      if (placed) break;
    }
    if (!placed) break;
  }

  const result: { student_id: string; row_num: number; col_num: number; bench_index: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const st = grid[r][c];
      if (st)
        result.push({
          student_id: st.id,
          row_num: r,
          col_num: c,
          bench_index: getBenchIndex(c, seatsPerBench),
        });
    }
  }
  return result;
}
