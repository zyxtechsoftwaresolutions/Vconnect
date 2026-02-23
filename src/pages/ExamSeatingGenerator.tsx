import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  LayoutGrid,
  Plus,
  Wand2,
  Building2,
  Users,
  Calendar,
  Save,
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Department } from '../types/user';
import { databaseService } from '../services/databaseService';
import { generateSeatingForRoom } from '../utils/examSeatingAlgorithm';
import { useToast } from '../hooks/use-toast';

const DEPT_OPTIONS = Object.values(Department);
const ALL_DEPTS_VALUE = '__all__'; // Radix Select forbids value=""

const ExamSeatingGenerator: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [occupiedRoomIds, setOccupiedRoomIds] = useState<Set<string>>(new Set());
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [roomRowsCols, setRoomRowsCols] = useState<Record<string, { rows: number; cols: number }>>({});
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [studentDepts, setStudentDepts] = useState<string[]>([]);
  const [studentsPerBench, setStudentsPerBench] = useState<1 | 2 | 3>(2);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<Record<string, { student_id: string; row_num: number; col_num: number; bench_index: number; name?: string; registerId?: string; class?: string }[]>>({});
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [editingRoom, setEditingRoom] = useState<{ id: string; name: string; department: string; rows: number; cols: number } | null>(null);
  const [roomForm, setRoomForm] = useState({ name: '', department: user?.department || 'CSE', rows: 5, cols: 6 });

  const loadSessions = async () => {
    const list = await databaseService.getExamSessions();
    setSessions(list);
    if (list.length > 0 && !sessionId) setSessionId(list[0].id);
  };

  const loadRooms = async () => {
    const list = await databaseService.getExamRooms();
    setRooms(list);
    const rrc: Record<string, { rows: number; cols: number }> = {};
    list.forEach((r: any) => (rrc[r.id] = { rows: r.rows || 5, cols: r.cols || 6 }));
    setRoomRowsCols(rrc);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadSessions();
      await loadRooms();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setOccupiedRoomIds(new Set());
      return;
    }
    databaseService.getOccupiedRoomIdsForSession(sessionId).then(setOccupiedRoomIds);
  }, [sessionId]);

  const filteredRooms = departmentFilter
    ? rooms.filter((r: any) => r.department === departmentFilter)
    : rooms;

  const toggleRoomSelection = (id: string) => {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedRoomsList = rooms.filter((r: any) => selectedRoomIds.has(r.id));

  const loadStudents = async () => {
    if (studentDepts.length === 0) {
      setStudents([]);
      return;
    }
    const all: any[] = [];
    for (const dept of studentDepts) {
      const list = await databaseService.getStudentsByDepartment(dept as any);
      list.forEach((s: any) => all.push({
        id: s.id,
        name: s.name,
        registerId: s.registerId ?? s.register_id,
        class: s.class ?? '',
        department: s.department,
      }));
    }
    setStudents(all);
  };

  useEffect(() => {
    loadStudents();
  }, [studentDepts.join(',')]);

  const studentsByClass = React.useMemo(() => {
    const map = new Map<string, typeof students>();
    students.forEach((s) => {
      const c = s.class || 'Unknown';
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(s);
    });
    return Array.from(map.entries()).map(([cls, students]) => ({ class: cls, students }));
  }, [students]);

  const totalSeats = selectedRoomsList.reduce(
    (sum, r) => sum + (roomRowsCols[r.id]?.rows ?? r.rows ?? 5) * (roomRowsCols[r.id]?.cols ?? r.cols ?? 6),
    0
  );

  const handleGenerate = async () => {
    if (!sessionId) {
      toast({ title: 'Select session', variant: 'destructive' });
      return;
    }
    if (selectedRoomsList.length === 0) {
      toast({ title: 'Select at least one room', variant: 'destructive' });
      return;
    }
    if (students.length === 0) {
      toast({ title: 'Add at least one department to load students', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    setResult({});
    try {
      // Interleave students by class (round-robin) so each room gets a mix of sections.
      // Then the algorithm can enforce: no two same section on same bench or adjacent.
      const interleaved: typeof students = [];
      const maxLen = Math.max(0, ...studentsByClass.map((g) => g.students.length));
      for (let j = 0; j < maxLen; j++) {
        for (const g of studentsByClass) {
          if (j < g.students.length) interleaved.push(g.students[j]);
        }
      }
      const allocationsByRoom: Record<string, any[]> = {};
      let offset = 0;
      for (const room of selectedRoomsList) {
        const rows = roomRowsCols[room.id]?.rows ?? room.rows ?? 5;
        const cols = roomRowsCols[room.id]?.cols ?? room.cols ?? 6;
        const capacity = rows * cols;
        const chunk = interleaved.slice(offset, offset + capacity);
        offset += capacity;
        const classSet = new Set(chunk.map((s) => s.class));
        const byClassChunk = Array.from(classSet).map((c) => ({ class: c, students: chunk.filter((s) => s.class === c) }));
        const roomConfig = { ...room, rows, cols };
        const alloc = generateSeatingForRoom(roomConfig, byClassChunk, studentsPerBench);
        allocationsByRoom[room.id] = alloc.map((a) => {
          const st = students.find((s) => s.id === a.student_id);
          return { ...a, name: st?.name, registerId: st?.registerId, class: st?.class };
        });
      }
      setResult(allocationsByRoom);
      toast({ title: 'Seating generated', description: 'No same section on same bench or adjacent.' });
    } catch (e) {
      toast({ title: 'Generation failed', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!sessionId || Object.keys(result).length === 0) return;
    setSaving(true);
    try {
      for (const roomId of Object.keys(result)) {
        const alloc = result[roomId].map(({ student_id, row_num, col_num, bench_index }) => ({
          student_id,
          row_num,
          col_num,
          bench_index,
        }));
        await databaseService.saveExamSeatingAllocations(sessionId, roomId, alloc);
      }
      toast({ title: 'Saved', description: 'Seating allotment saved for this session.' });
      setOccupiedRoomIds(await databaseService.getOccupiedRoomIdsForSession(sessionId));
    } catch (e) {
      toast({ title: 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRoom = async () => {
    if (!roomForm.name.trim()) {
      toast({ title: 'Enter room name', variant: 'destructive' });
      return;
    }
    if (editingRoom) {
      const ok = await databaseService.updateExamRoom(editingRoom.id, {
        name: roomForm.name.trim(),
        department: roomForm.department,
        rows: roomForm.rows,
        cols: roomForm.cols,
      });
      if (ok) {
        await loadRooms();
        setShowRoomDialog(false);
        setEditingRoom(null);
        setRoomForm({ name: '', department: user?.department || 'CSE', rows: 5, cols: 6 });
        toast({ title: 'Room updated' });
      } else {
        toast({ title: 'Failed to update room', variant: 'destructive' });
      }
    } else {
      const created = await databaseService.createExamRoom({
        name: roomForm.name.trim(),
        department: roomForm.department,
        rows: roomForm.rows,
        cols: roomForm.cols,
      });
      if (created) {
        await loadRooms();
        setShowRoomDialog(false);
        setRoomForm({ name: '', department: user?.department || 'CSE', rows: 5, cols: 6 });
        toast({ title: 'Room added' });
      } else {
        toast({ title: 'Failed to add room', variant: 'destructive' });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Exam Seating Generator</h1>
        <p className="text-gray-600">Generate final exam seating with no same class/subject side-by-side</p>
      </div>

      {/* Session */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Exam Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-64">
              <Label>Session</Label>
              <Select value={sessionId || undefined} onValueChange={(v) => setSessionId(v || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.exam_date ? `(${s.exam_date})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                const name = window.prompt('Session name (e.g. Final Dec 2024 - Slot 1)');
                if (!name?.trim()) return;
                const created = await databaseService.createExamSession({ name: name.trim() });
                if (created) {
                  await loadSessions();
                  setSessionId(created.id);
                  toast({ title: 'Session created' });
                }
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Session
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rooms: available = normal, occupied = red glass */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Select Rooms
          </CardTitle>
          <p className="text-sm text-gray-500">Available rooms in normal style; occupied (already used in this session) in red.</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="w-48">
              <Label>Department</Label>
              <Select value={departmentFilter || ALL_DEPTS_VALUE} onValueChange={(v) => setDepartmentFilter(v === ALL_DEPTS_VALUE ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_DEPTS_VALUE}>All</SelectItem>
                  {DEPT_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="mt-6" onClick={() => { setEditingRoom(null); setRoomForm({ name: '', department: departmentFilter || user?.department || 'CSE', rows: 5, cols: 6 }); setShowRoomDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredRooms.map((room: any) => {
              const occupied = occupiedRoomIds.has(room.id);
              const selected = selectedRoomIds.has(room.id);
              const rows = roomRowsCols[room.id]?.rows ?? room.rows ?? 5;
              const cols = roomRowsCols[room.id]?.cols ?? room.cols ?? 6;
              return (
                <div
                  key={room.id}
                  onClick={() => !occupied && toggleRoomSelection(room.id)}
                  className={`
                    border rounded-lg p-3 cursor-pointer transition
                    ${occupied ? 'bg-red-500/20 border-red-400/50 backdrop-blur' : selected ? 'bg-blue-100 border-blue-500' : 'bg-gray-50 hover:bg-gray-100'}
                  `}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{room.name}</span>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => { setEditingRoom({ id: room.id, name: room.name, department: room.department, rows: room.rows ?? 5, cols: room.cols ?? 6 }); setRoomForm({ name: room.name, department: room.department, rows: room.rows ?? 5, cols: room.cols ?? 6 }); setShowRoomDialog(true); }}
                        title="Edit room"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                        onClick={async () => { if (!window.confirm(`Delete room "${room.name}"?`)) return; const ok = await databaseService.deleteExamRoom(room.id); if (ok) { await loadRooms(); setSelectedRoomIds((prev) => { const n = new Set(prev); n.delete(room.id); return n; }); toast({ title: 'Room deleted' }); } else toast({ title: 'Failed to delete room', variant: 'destructive' }); }}
                        title="Delete room"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">{room.department}</p>
                  <p className="text-sm mt-1">Rows × Cols: {rows} × {cols}</p>
                  {selected && !occupied && (
                    <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={rows}
                        onChange={(e) => setRoomRowsCols((prev) => ({ ...prev, [room.id]: { ...prev[room.id], rows: Math.max(1, parseInt(e.target.value, 10) || 1) } }))}
                        className="w-14 h-8 text-sm"
                      />
                      <span className="self-center">×</span>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={cols}
                        onChange={(e) => setRoomRowsCols((prev) => ({ ...prev, [room.id]: { ...prev[room.id], cols: Math.max(1, parseInt(e.target.value, 10) || 1) } }))}
                        className="w-14 h-8 text-sm"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Students: departments + preference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Students & Preference
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Departments (students to include)</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {DEPT_OPTIONS.slice(0, 12).map((d) => (
                <label key={d} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={studentDepts.includes(d)}
                    onChange={() => setStudentDepts((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))}
                  />
                  <span className="text-sm">{d}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>Students per bench</Label>
            <p className="text-xs text-gray-500 mb-2">Min 1, max 3. Two is preferred to avoid same class side-by-side.</p>
            <div className="flex gap-4">
              {([1, 2, 3] as const).map((n) => (
                <label key={n} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="perBench"
                    checked={studentsPerBench === n}
                    onChange={() => setStudentsPerBench(n)}
                  />
                  <span>{n} per bench{n === 2 ? ' (preferred)' : ''}</span>
                </label>
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Loaded: <strong>{students.length}</strong> students · Total seats: <strong>{totalSeats}</strong>
            {students.length > totalSeats && (
              <span className="text-amber-600 ml-2">
                <AlertCircle className="inline h-4 w-4 mr-1" />
                More students than seats; some will be left out.
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Generate & Save */}
      <div className="flex gap-4">
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
          Generate Seating
        </Button>
        {Object.keys(result).length > 0 && (
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save to Session
          </Button>
        )}
      </div>

      {/* Result grids */}
      {Object.keys(result).length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Seating Arrangement</h2>
          {selectedRoomsList.map((room: any) => {
            const alloc = result[room.id] || [];
            const rows = roomRowsCols[room.id]?.rows ?? room.rows ?? 5;
            const cols = roomRowsCols[room.id]?.cols ?? room.cols ?? 6;
            const grid: (typeof alloc[0] | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));
            alloc.forEach((a) => { grid[a.row_num][a.col_num] = a; });
            return (
              <Card key={room.id}>
                <CardHeader>
                  <CardTitle>{room.name} ({room.department})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="border-collapse w-full text-sm">
                      <tbody>
                        {grid.map((row, r) => (
                          <tr key={r}>
                            {row.map((cell, c) => (
                              <td
                                key={c}
                                className="border border-gray-300 p-1 min-w-[100px] bg-gray-50"
                              >
                                {cell ? (
                                  <>
                                    <div className="font-medium">{cell.registerId ?? cell.name}</div>
                                    <div className="text-xs text-gray-600">{cell['class'] ?? ''}</div>
                                  </>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit room dialog */}
      <Dialog open={showRoomDialog} onOpenChange={(open) => { setShowRoomDialog(open); if (!open) setEditingRoom(null); setRoomForm({ name: '', department: user?.department || 'CSE', rows: 5, cols: 6 }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRoom ? 'Edit Exam Room' : 'Add Exam Room'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={roomForm.name}
                onChange={(e) => setRoomForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Main Hall"
              />
            </div>
            <div>
              <Label>Department</Label>
              <Select value={roomForm.department || 'CSE'} onValueChange={(v) => setRoomForm((p) => ({ ...p, department: v || 'CSE' }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPT_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rows</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={roomForm.rows}
                  onChange={(e) => setRoomForm((p) => ({ ...p, rows: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                />
              </div>
              <div>
                <Label>Columns</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={roomForm.cols}
                  onChange={(e) => setRoomForm((p) => ({ ...p, cols: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoomDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveRoom}>{editingRoom ? 'Save changes' : 'Add Room'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExamSeatingGenerator;
