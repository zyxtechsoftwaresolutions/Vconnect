import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Calendar, Clock, Users, BookOpen, GraduationCap, Settings2,
  Wand2, Eye, UserCheck, Building2, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, Department } from '../types/user';
import { supabase, supabaseAdmin } from '../lib/supabase';
import {
  ClassTimetable, DEFAULT_RULES,
} from '../types/timetable';
import { buildFacultyTimetable, detectCrossClassConflicts } from '../services/timetableSchedulerService';
import { databaseService } from '../services/databaseService';
import { supabaseService } from '../services/supabaseService';
import TimetableGrid from '../components/timetable/TimetableGrid';
import SchedulerPanel from '../components/timetable/SchedulerPanel';

const db = supabaseAdmin || supabase;

const TIMETABLE_STORAGE_KEY = 'generated_timetables';

function loadSavedTimetablesFallback(): ClassTimetable[] {
  try {
    const stored = localStorage.getItem(TIMETABLE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

const Timetable: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const isStudentOrCR = user?.role === UserRole.STUDENT || user?.role === UserRole.CR;
  const canScheduleCheck = user?.role === UserRole.ADMIN || user?.role === UserRole.PRINCIPAL ||
    user?.role === UserRole.HOD || user?.role === UserRole.COORDINATOR;
  const [activeTab, setActiveTab] = useState(canScheduleCheck ? 'scheduler' : 'class');

  const [allTimetables, setAllTimetables] = useState<ClassTimetable[]>([]);
  const [selectedClassView, setSelectedClassView] = useState('');
  const [selectedFacultyView, setSelectedFacultyView] = useState('');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState(user?.department || '');

  const [availableFaculty, setAvailableFaculty] = useState<{ id: string; name: string; department: string }[]>([]);
  const [availableClasses, setAvailableClasses] = useState<{ id: string; name: string; department?: string }[]>([]);
  const [departmentList, setDepartmentList] = useState<string[]>(Object.values(Department));
  const [studentClassId, setStudentClassId] = useState<string | null>(null);

  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.PRINCIPAL;
  const canSchedule = isAdmin || user?.role === UserRole.HOD || user?.role === UserRole.COORDINATOR;
  const userDepartment = user?.department || '';

  useEffect(() => {
    loadData();
    loadDepts();
  }, [user]);

  const loadDepts = async () => {
    try {
      const { data } = await db.from('departments').select('name').order('name');
      if (data && data.length > 0) {
        const dbDepts = data.map((d: any) => d.name);
        const merged = [...new Set([...dbDepts, ...Object.values(Department)])].sort();
        setDepartmentList(merged);
      }
    } catch { /* keep enum fallback */ }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      let faculty: { id: string; name: string; department: string }[] = [];
      let classes: { id: string; name: string; department?: string }[] = [];

      try {
        const [facultyResult, classResult] = await Promise.allSettled([
          db.from('users').select('id, name, department, role')
            .in('role', ['FACULTY', 'HOD', 'COORDINATOR']).order('name'),
          db.from('classes').select('id, name, department').order('name'),
        ]);

        if (facultyResult.status === 'fulfilled' && facultyResult.value.data) {
          faculty = facultyResult.value.data.map((f: any) => ({
            id: f.id, name: f.name || 'Unknown', department: f.department || '',
          }));
        }
        if (classResult.status === 'fulfilled' && classResult.value.data) {
          classes = classResult.value.data.map((c: any) => ({
            id: c.id, name: c.name || 'Unknown', department: c.department || '',
          }));
        }
      } catch (dbErr) {
        console.warn('Database fetch failed:', dbErr);
      }

      setAvailableFaculty(faculty);
      setAvailableClasses(classes);

      if ((user?.role === UserRole.STUDENT || user?.role === UserRole.CR) && user?.email) {
        try {
          const student = await supabaseService.getStudentByEmail(user.email);
          const studentClassName = (student as any)?.class;
          if (studentClassName && classes.length > 0) {
            const myClass = classes.find((c: any) => c.name === studentClassName);
            if (myClass) {
              setStudentClassId(myClass.id);
              setSelectedClassView(myClass.id);
            }
          }
        } catch (_) {}
      }

      try {
        const dbTimetables = await databaseService.getAllClassTimetables();
        setAllTimetables(dbTimetables.length > 0 ? dbTimetables : loadSavedTimetablesFallback());
      } catch (_) {
        setAllTimetables(loadSavedTimetablesFallback());
      }
    } catch (err) {
      console.error('Error loading timetable data:', err);
      setAvailableFaculty([]);
      setAvailableClasses([]);
      setAllTimetables(loadSavedTimetablesFallback());
    } finally {
      setLoading(false);
    }
  };

  const handleTimetableGenerated = (timetable: ClassTimetable) => {
    setAllTimetables(prev => {
      const updated = prev.filter(t => t.classId !== timetable.classId);
      updated.push(timetable);
      databaseService.saveClassTimetables(updated).catch(err => {
        console.error('Failed to save timetables to database:', err);
        try {
          localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(updated));
        } catch (_) {}
      });
      return updated;
    });
  };

  const filteredClasses = useMemo(() => {
    if (isStudentOrCR) {
      if (studentClassId) {
        return availableClasses.filter(c => c.id === studentClassId);
      }
      return [];
    }
    if (isAdmin) {
      return selectedDepartmentFilter
        ? availableClasses.filter(c => (c as any).department === selectedDepartmentFilter)
        : availableClasses;
    }
    return availableClasses.filter(c => (c as any).department === userDepartment);
  }, [availableClasses, selectedDepartmentFilter, isAdmin, userDepartment, isStudentOrCR, studentClassId]);

  const filteredFaculty = useMemo(() => {
    if (isAdmin) {
      return selectedDepartmentFilter
        ? availableFaculty.filter(f => f.department === selectedDepartmentFilter)
        : availableFaculty;
    }
    return availableFaculty.filter(f => f.department === userDepartment);
  }, [availableFaculty, selectedDepartmentFilter, isAdmin, userDepartment]);

  const selectedClassTimetable = useMemo(() => {
    return allTimetables.find(t => t.classId === selectedClassView) ?? null;
  }, [allTimetables, selectedClassView]);

  const selectedFacultyGrid = useMemo(() => {
    if (!selectedFacultyView) return null;
    return buildFacultyTimetable(selectedFacultyView, allTimetables, DEFAULT_RULES);
  }, [selectedFacultyView, allTimetables]);

  const crossConflicts = useMemo(() => {
    return detectCrossClassConflicts(allTimetables);
  }, [allTimetables]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading timetable system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Calendar className="h-8 w-8 text-blue-600" />
                Timetable Scheduler
              </h1>
              <div className="text-gray-500 mt-1 flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4" />
                <span>{userDepartment || 'All Departments'}</span>
                <span>&middot;</span>
                <UserCheck className="h-4 w-4" />
                <span>{user?.name}</span>
                <Badge variant="outline" className="ml-1">{user?.role}</Badge>
              </div>
            </div>
            {!isStudentOrCR && crossConflicts.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-700">{crossConflicts.length} cross-class conflict(s)</span>
              </div>
            )}
          </div>
        </div>

        {/* Department Filter for Admin */}
        {isAdmin && (
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium whitespace-nowrap">Department:</Label>
              <Select value={selectedDepartmentFilter} onValueChange={setSelectedDepartmentFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Departments</SelectItem>
                  {departmentList.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Tabs — Scheduler and Faculty Timetable hidden for Student/CR; they only see their class timetable */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white shadow-md border p-1 h-auto flex-wrap">
            {!isStudentOrCR && (
              <TabsTrigger value="scheduler" className="flex items-center gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white px-4 py-2.5 font-semibold">
                <Wand2 className="h-4 w-4" /> Scheduler
              </TabsTrigger>
            )}
            <TabsTrigger value="class" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white px-4 py-2.5">
              <Eye className="h-4 w-4" /> Class Timetable
            </TabsTrigger>
            {!isStudentOrCR && (
              <TabsTrigger value="faculty" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white px-4 py-2.5">
                <Users className="h-4 w-4" /> Faculty Timetable
              </TabsTrigger>
            )}
          </TabsList>

          {/* Scheduler Tab — hidden for Student/CR */}
          {!isStudentOrCR && (
          <TabsContent value="scheduler">
            {canSchedule ? (
              <SchedulerPanel
                department={selectedDepartmentFilter === 'ALL' ? userDepartment : (selectedDepartmentFilter || userDepartment)}
                existingTimetables={allTimetables}
                onTimetableGenerated={handleTimetableGenerated}
                availableFaculty={availableFaculty}
                availableClasses={isAdmin ? availableClasses : filteredClasses}
              />
            ) : (
              <EmptyState
                icon={<Wand2 className="h-12 w-12 text-gray-300" />}
                title="Scheduling Access Required"
                description="Only Principal, HOD, and Coordinators can generate timetables. Contact your HOD or Principal to create or modify timetables."
              />
            )}
          </TabsContent>
          )}

          {/* Class Timetable Tab */}
          <TabsContent value="class" className="space-y-4">
            <Card className="shadow-md">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {!isStudentOrCR && (
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Select Class</Label>
                    <Select value={selectedClassView} onValueChange={setSelectedClassView}>
                      <SelectTrigger className="mt-1 w-full sm:w-64">
                        <SelectValue placeholder="Choose a class..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredClasses.map(cls => (
                          <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  )}
                  {isStudentOrCR && (
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Your class</Label>
                    <p className="mt-1 text-gray-700 font-medium">
                      {filteredClasses[0]?.name ?? (selectedClassTimetable?.className ?? '—')}
                    </p>
                  </div>
                  )}
                  {!isStudentOrCR && allTimetables.length > 0 && (
                    <div className="text-sm text-gray-500">
                      {allTimetables.length} timetable(s) available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedClassTimetable ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                    {selectedClassTimetable.className} — Weekly Schedule
                  </h2>
                  <Badge variant="outline">{selectedClassTimetable.department}</Badge>
                </div>
                <div className="overflow-x-auto">
                  <TimetableGrid grid={selectedClassTimetable.grid} showFacultyName showRoom />
                </div>
              </div>
            ) : selectedClassView ? (
              <EmptyState
                icon={<Calendar className="h-12 w-12 text-gray-300" />}
                title="No Timetable Generated"
                description={isStudentOrCR
                  ? "Your class timetable is not available yet. Contact your HOD or coordinator."
                  : "This class doesn't have a timetable yet. Go to the Scheduler tab to configure and generate one."}
                action={!isStudentOrCR && canSchedule ? (
                  <Button onClick={() => setActiveTab('scheduler')} className="bg-blue-600 hover:bg-blue-700">
                    <Wand2 className="h-4 w-4 mr-2" /> Open Scheduler
                  </Button>
                ) : undefined}
              />
            ) : !isStudentOrCR ? (
              <EmptyState
                icon={<Eye className="h-12 w-12 text-gray-300" />}
                title="Select a Class"
                description="Choose a class from the dropdown above to view its timetable."
              />
            ) : (
              <EmptyState
                icon={<Eye className="h-12 w-12 text-gray-300" />}
                title="Your Class Timetable"
                description="Your class is not linked yet. Contact your department if this is incorrect."
              />
            )}
          </TabsContent>

          {/* Faculty Timetable Tab — hidden for Student/CR */}
          {!isStudentOrCR && (
          <TabsContent value="faculty" className="space-y-4">
            <Card className="shadow-md">
              <CardContent className="p-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium">Select Faculty</Label>
                  <Select value={selectedFacultyView} onValueChange={setSelectedFacultyView}>
                    <SelectTrigger className="mt-1 w-full sm:w-64">
                      <SelectValue placeholder="Choose a faculty member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFaculty.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.name} ({f.department})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {selectedFacultyGrid ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-blue-600" />
                    {availableFaculty.find(f => f.id === selectedFacultyView)?.name} — Teaching Schedule
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <TimetableGrid
                    grid={selectedFacultyGrid}
                    showFacultyName={false}
                    showClassName
                    showRoom
                  />
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<Users className="h-12 w-12 text-gray-300" />}
                title="Select a Faculty Member"
                description="Choose a faculty member to view their teaching schedule across all classes."
              />
            )}
          </TabsContent>
          )}
        </Tabs>

        {/* Info Bar */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
            <InfoStat icon={<Calendar className="h-4 w-4" />} label="Working Days" value="Mon – Sat" />
            <InfoStat icon={<Clock className="h-4 w-4" />} label="Periods/Day" value="7" />
            <InfoStat icon={<Clock className="h-4 w-4" />} label="Duration" value="50 min" />
            <InfoStat icon={<BookOpen className="h-4 w-4" />} label="Max/Week" value="42" />
            <InfoStat icon={<Settings2 className="h-4 w-4" />} label="Consec. Theory" value="Max 2" />
            <InfoStat icon={<BookOpen className="h-4 w-4" />} label="Lab Session" value="3 periods" />
          </div>
        </div>
      </div>
    </div>
  );
};

function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description: string; action?: React.ReactNode;
}) {
  return (
    <Card className="shadow-md">
      <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
        {icon}
        <h3 className="mt-4 text-lg font-semibold text-gray-700">{title}</h3>
        <p className="mt-1 text-sm text-gray-500 max-w-md">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  );
}

function InfoStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-center gap-1 text-gray-400">{icon}</div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-bold text-gray-800">{value}</div>
    </div>
  );
}

export default Timetable;
