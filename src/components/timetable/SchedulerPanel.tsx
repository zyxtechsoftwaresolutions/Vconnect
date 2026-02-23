import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import {
  BookOpen, Plus, Trash2, Settings2, Wand2, AlertTriangle,
  CheckCircle2, GraduationCap, Dumbbell,
  ChevronDown, ChevronUp, RotateCcw, Loader2, Info, Pencil,
} from 'lucide-react';
import {
  SubjectConfig, FacultyConfig, ExtraActivity, SchedulerRules,
  ClassTimetable, ConflictItem, DEFAULT_RULES, DEFAULT_EXTRA_ACTIVITIES,
  SUBJECT_GRADIENT_COLORS, TimePreference,
} from '../../types/timetable';
import { generateClassTimetable } from '../../services/timetableSchedulerService';
import TimetableGrid from './TimetableGrid';

interface SchedulerPanelProps {
  department: string;
  existingTimetables: ClassTimetable[];
  onTimetableGenerated: (timetable: ClassTimetable) => void;
  availableFaculty: { id: string; name: string; department: string }[];
  availableClasses: { id: string; name: string }[];
}

const STORAGE_KEY_PREFIX = 'timetable_scheduler_';

const SchedulerPanel: React.FC<SchedulerPanelProps> = ({
  department,
  existingTimetables,
  onTimetableGenerated,
  availableFaculty,
  availableClasses,
}) => {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedClassName, setSelectedClassName] = useState('');
  const [subjects, setSubjects] = useState<SubjectConfig[]>([]);
  const [facultyConfigs, setFacultyConfigs] = useState<FacultyConfig[]>([]);
  const [activities, setActivities] = useState<ExtraActivity[]>(DEFAULT_EXTRA_ACTIVITIES);
  const [rules, setRules] = useState<SchedulerRules>(DEFAULT_RULES);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [generatedTimetable, setGeneratedTimetable] = useState<ClassTimetable | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [showAddSubject, setShowAddSubject] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    subjects: true, activities: true, rules: false, results: true,
  });

  const [newSubject, setNewSubject] = useState<Partial<SubjectConfig>>({
    name: '', shortName: '', type: 'theory', periodsPerWeek: 5,
    assignedFacultyId: '', assignedFacultyName: '', room: '',
    color: SUBJECT_GRADIENT_COLORS[0],
  });

  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${department}_${selectedClassId}`);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.subjects) setSubjects(data.subjects);
        if (data.activities) setActivities(data.activities);
        if (data.rules) setRules(data.rules);
        if (data.facultyConfigs) setFacultyConfigs(data.facultyConfigs);
      } catch (e) { /* ignore */ }
    }
  }, [department, selectedClassId]);

  useEffect(() => {
    if (selectedClassId) {
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${department}_${selectedClassId}`,
        JSON.stringify({ subjects, activities, rules, facultyConfigs })
      );
    }
  }, [subjects, activities, rules, facultyConfigs, department, selectedClassId]);

  useEffect(() => {
    const configs: FacultyConfig[] = availableFaculty.map(f => {
      const existing = facultyConfigs.find(fc => fc.id === f.id);
      return existing || { id: f.id, name: f.name, department: f.department, timePreference: 'any' as TimePreference };
    });
    if (JSON.stringify(configs.map(c => c.id)) !== JSON.stringify(facultyConfigs.map(c => c.id))) {
      setFacultyConfigs(configs);
    }
  }, [availableFaculty]);

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddSubject = () => {
    if (!newSubject.name || !newSubject.assignedFacultyId) return;
    const faculty = availableFaculty.find(f => f.id === newSubject.assignedFacultyId);

    if (editingSubjectId) {
      setSubjects(prev => prev.map(s => s.id === editingSubjectId ? {
        ...s,
        name: newSubject.name!,
        shortName: newSubject.shortName || newSubject.name!.substring(0, 3).toUpperCase(),
        type: newSubject.type as 'theory' | 'lab',
        periodsPerWeek: newSubject.type === 'lab' ? 3 : (newSubject.periodsPerWeek || 5),
        assignedFacultyId: newSubject.assignedFacultyId!,
        assignedFacultyName: faculty?.name || 'TBA',
        room: newSubject.room || 'TBA',
        color: newSubject.color || s.color,
      } : s));
      setEditingSubjectId(null);
    } else {
      const id = `subj-${Date.now()}`;
      const shortName = newSubject.shortName || newSubject.name!.substring(0, 3).toUpperCase();
      const color = SUBJECT_GRADIENT_COLORS[subjects.length % SUBJECT_GRADIENT_COLORS.length];

      setSubjects(prev => [...prev, {
        id, name: newSubject.name!, shortName,
        type: newSubject.type as 'theory' | 'lab',
        periodsPerWeek: newSubject.type === 'lab' ? 3 : (newSubject.periodsPerWeek || 5),
        assignedFacultyId: newSubject.assignedFacultyId!,
        assignedFacultyName: faculty?.name || 'TBA',
        room: newSubject.room || 'TBA',
        color: newSubject.color || color,
      }]);
    }

    setNewSubject({
      name: '', shortName: '', type: 'theory', periodsPerWeek: 5,
      assignedFacultyId: '', assignedFacultyName: '', room: '',
      color: SUBJECT_GRADIENT_COLORS[(subjects.length + 1) % SUBJECT_GRADIENT_COLORS.length],
    });
    setShowAddSubject(false);
  };

  const startEditSubject = (sub: SubjectConfig) => {
    setEditingSubjectId(sub.id);
    setNewSubject({
      name: sub.name,
      shortName: sub.shortName,
      type: sub.type,
      periodsPerWeek: sub.periodsPerWeek,
      assignedFacultyId: sub.assignedFacultyId,
      assignedFacultyName: sub.assignedFacultyName,
      room: sub.room,
      color: sub.color,
    });
    setShowAddSubject(true);
  };

  const removeSubject = (id: string) => {
    setSubjects(prev => prev.filter(s => s.id !== id));
  };

  const handleGenerate = async () => {
    if (!selectedClassId || subjects.length === 0) return;
    setIsGenerating(true);
    setConflicts([]);
    setGeneratedTimetable(null);

    await new Promise(r => setTimeout(r, 600));

    const result = generateClassTimetable(
      {
        classId: selectedClassId,
        className: selectedClassName,
        department,
        subjects,
        activities,
        rules,
        facultyConfigs,
      },
      existingTimetables
    );

    setGeneratedTimetable(result.timetable);
    setConflicts(result.conflicts);
    setIsGenerating(false);
    setExpandedSections(prev => ({ ...prev, results: true }));
  };

  const handleSaveTimetable = () => {
    if (generatedTimetable) {
      onTimetableGenerated(generatedTimetable);
    }
  };

  const renderSectionHeader = (
    key: keyof typeof expandedSections,
    icon: React.ReactNode,
    title: string,
    count?: number
  ) => (
    <button
      onClick={() => toggleSection(key)}
      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-t-lg"
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-semibold text-gray-800">{title}</span>
        {count !== undefined && (
          <Badge variant="secondary" className="text-xs">{count}</Badge>
        )}
      </div>
      {expandedSections[key] ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Class Selection */}
      <Card className="border-blue-200 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            Select Class to Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Class</Label>
              <Select
                value={selectedClassId}
                onValueChange={val => {
                  setSelectedClassId(val);
                  const cls = availableClasses.find(c => c.id === val);
                  setSelectedClassName(cls?.name || val);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a class..." />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Department</Label>
              <Input value={department} disabled className="mt-1 bg-gray-50" />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClassId && (
        <>
          {/* Subjects & Faculty */}
          <Card className="shadow-md">
            {renderSectionHeader('subjects', <BookOpen className="h-5 w-5 text-purple-600" />, 'Subjects & Faculty', subjects.length)}
            {expandedSections.subjects && (
              <CardContent className="pt-0">
                {subjects.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {subjects.map(sub => (
                      <div key={sub.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border">
                        <div className={`w-3 h-3 rounded-full ${sub.color.split(' ')[0] || 'bg-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{sub.name}</span>
                            <Badge variant={sub.type === 'lab' ? 'destructive' : 'default'} className="text-[10px] h-4">
                              {sub.type === 'lab' ? 'Lab' : 'Theory'}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] h-4">
                              {sub.periodsPerWeek}p/w
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {sub.assignedFacultyName} · {sub.room}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => startEditSubject(sub)}
                            className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => removeSubject(sub.id)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showAddSubject ? (
                  <div className={`border-2 border-dashed rounded-lg p-4 space-y-3 ${editingSubjectId ? 'border-green-300 bg-green-50/50' : 'border-blue-300 bg-blue-50/50'}`}>
                    <h4 className="text-sm font-semibold text-gray-700">
                      {editingSubjectId ? 'Edit Subject' : 'Add New Subject'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Subject Name</Label>
                        <Input
                          value={newSubject.name || ''}
                          onChange={e => setNewSubject(p => ({ ...p, name: e.target.value, shortName: e.target.value.substring(0, 3).toUpperCase() }))}
                          placeholder="e.g. Data Structures"
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Short Name</Label>
                        <Input
                          value={newSubject.shortName || ''}
                          onChange={e => setNewSubject(p => ({ ...p, shortName: e.target.value }))}
                          placeholder="e.g. DS"
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={newSubject.type}
                          onValueChange={val => setNewSubject(p => ({
                            ...p, type: val as 'theory' | 'lab',
                            periodsPerWeek: val === 'lab' ? 3 : (p.periodsPerWeek || 5),
                          }))}
                        >
                          <SelectTrigger className="mt-1 h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="theory">Theory</SelectItem>
                            <SelectItem value="lab">Lab</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">
                          {newSubject.type === 'lab' ? 'Periods/Session (fixed at 3)' : 'Periods per Week (4-6)'}
                        </Label>
                        <Input
                          type="number"
                          min={newSubject.type === 'lab' ? 3 : rules.minSubjectPeriodsPerWeek}
                          max={newSubject.type === 'lab' ? 3 : rules.maxSubjectPeriodsPerWeek}
                          value={newSubject.type === 'lab' ? 3 : (newSubject.periodsPerWeek || 5)}
                          onChange={e => setNewSubject(p => ({ ...p, periodsPerWeek: Number(e.target.value) }))}
                          disabled={newSubject.type === 'lab'}
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Faculty</Label>
                        <Select
                          value={newSubject.assignedFacultyId}
                          onValueChange={val => {
                            const f = availableFaculty.find(fac => fac.id === val);
                            setNewSubject(p => ({ ...p, assignedFacultyId: val, assignedFacultyName: f?.name || '' }));
                          }}
                        >
                          <SelectTrigger className="mt-1 h-8 text-sm">
                            <SelectValue placeholder="Select faculty..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableFaculty.map(f => (
                              <SelectItem key={f.id} value={f.id}>{f.name} ({f.department})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Room</Label>
                        <Input
                          value={newSubject.room || ''}
                          onChange={e => setNewSubject(p => ({ ...p, room: e.target.value }))}
                          placeholder="e.g. CSE-101"
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddSubject} className={editingSubjectId ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}>
                        {editingSubjectId ? (
                          <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Update</>
                        ) : (
                          <><Plus className="h-3.5 w-3.5 mr-1" /> Add</>
                        )}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setShowAddSubject(false);
                        setEditingSubjectId(null);
                        setNewSubject({
                          name: '', shortName: '', type: 'theory', periodsPerWeek: 5,
                          assignedFacultyId: '', assignedFacultyName: '', room: '',
                          color: SUBJECT_GRADIENT_COLORS[subjects.length % SUBJECT_GRADIENT_COLORS.length],
                        });
                      }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline" onClick={() => setShowAddSubject(true)}
                    className="w-full border-dashed border-2 hover:border-blue-400 hover:bg-blue-50"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Subject
                  </Button>
                )}

                {/* Faculty Time Preferences */}
                {subjects.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Settings2 className="h-4 w-4" /> Faculty Time Preferences
                    </h4>
                    <div className="space-y-2">
                      {[...new Map(subjects.map(s => [s.assignedFacultyId, s])).values()].map(sub => {
                        const config = facultyConfigs.find(f => f.id === sub.assignedFacultyId);
                        return (
                          <div key={sub.assignedFacultyId} className="flex items-center justify-between p-2 rounded bg-gray-50">
                            <span className="text-sm font-medium">{sub.assignedFacultyName}</span>
                            <Select
                              value={config?.timePreference || 'any'}
                              onValueChange={val => {
                                setFacultyConfigs(prev => prev.map(f =>
                                  f.id === sub.assignedFacultyId ? { ...f, timePreference: val as TimePreference } : f
                                ));
                              }}
                            >
                              <SelectTrigger className="w-36 h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="any">Any Time</SelectItem>
                                <SelectItem value="morning">Morning Only</SelectItem>
                                <SelectItem value="afternoon">Afternoon Only</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Extra Activities */}
          <Card className="shadow-md">
            {renderSectionHeader('activities', <Dumbbell className="h-5 w-5 text-emerald-600" />, 'Extra Activities', activities.filter(a => a.enabled).length)}
            {expandedSections.activities && (
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activities.map(act => (
                    <div
                      key={act.id}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                        act.enabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${act.color}`} />
                        <div>
                          <div className="text-sm font-medium">{act.name}</div>
                          <div className="text-[10px] text-gray-500">
                            {act.isConsecutive ? `${act.consecutiveCount} consecutive` : `${act.periodsPerWeek}p/w`}
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={act.enabled}
                        onCheckedChange={checked => {
                          setActivities(prev => prev.map(a =>
                            a.id === act.id ? { ...a, enabled: checked } : a
                          ));
                        }}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Scheduling Rules */}
          <Card className="shadow-md">
            {renderSectionHeader('rules', <Settings2 className="h-5 w-5 text-orange-600" />, 'Scheduling Rules')}
            {expandedSections.rules && (
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <RuleInput label="Min Periods per Subject / Week" value={rules.minSubjectPeriodsPerWeek}
                    onChange={v => setRules(p => ({ ...p, minSubjectPeriodsPerWeek: v }))} min={1} max={7} />
                  <RuleInput label="Max Periods per Subject / Week" value={rules.maxSubjectPeriodsPerWeek}
                    onChange={v => setRules(p => ({ ...p, maxSubjectPeriodsPerWeek: v }))} min={1} max={10} />
                  <RuleInput label="Max Consecutive Theory" value={rules.maxConsecutiveTheory}
                    onChange={v => setRules(p => ({ ...p, maxConsecutiveTheory: v }))} min={1} max={4} />
                  <RuleInput label="Gap After Consecutive (periods)" value={rules.gapAfterConsecutiveTheory}
                    onChange={v => setRules(p => ({ ...p, gapAfterConsecutiveTheory: v }))} min={0} max={3} />
                  <RuleInput label="Lab Periods per Session" value={rules.labPeriodsPerSession}
                    onChange={v => setRules(p => ({ ...p, labPeriodsPerSession: v }))} min={2} max={4} />
                  <RuleInput label="Max Weekly Periods" value={rules.maxWeeklyPeriods}
                    onChange={v => setRules(p => ({ ...p, maxWeeklyPeriods: v }))} min={30} max={48} />
                  <RuleInput label="Period Duration (min)" value={rules.periodDurationMinutes}
                    onChange={v => setRules(p => ({ ...p, periodDurationMinutes: v }))} min={30} max={90} />
                  <RuleInput label="Periods per Day" value={rules.maxPeriodsPerDay}
                    onChange={v => setRules(p => ({ ...p, maxPeriodsPerDay: v }))} min={5} max={9} />
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    size="sm" variant="outline"
                    onClick={() => setRules(DEFAULT_RULES)}
                    className="text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" /> Reset to Defaults
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Generate Button */}
          <Card className="shadow-lg border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-blue-600" />
                    Generate Timetable
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {subjects.length} subjects, {activities.filter(a => a.enabled).length} activities configured for {selectedClassName || 'selected class'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || subjects.length === 0}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-6 py-2 text-base shadow-lg"
                  >
                    {isGenerating ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                    ) : (
                      <><Wand2 className="h-4 w-4 mr-2" /> Generate</>
                    )}
                  </Button>
                  {generatedTimetable && (
                    <Button
                      onClick={handleGenerate}
                      variant="outline"
                      disabled={isGenerating}
                      className="border-blue-300"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" /> Regenerate
                    </Button>
                  )}
                </div>
              </div>

              {subjects.length === 0 && (
                <div className="mt-3 flex items-center gap-2 text-amber-600 text-sm">
                  <Info className="h-4 w-4" />
                  Add at least one subject to generate the timetable.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          {(generatedTimetable || conflicts.length > 0) && (
            <Card className="shadow-md">
              {renderSectionHeader('results',
                conflicts.some(c => c.severity === 'error')
                  ? <AlertTriangle className="h-5 w-5 text-red-500" />
                  : <CheckCircle2 className="h-5 w-5 text-green-500" />,
                'Generation Results',
                conflicts.length
              )}
              {expandedSections.results && (
                <CardContent className="pt-0 space-y-4">
                  {conflicts.length > 0 && (
                    <div className="space-y-2">
                      {conflicts.map((c, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                            c.severity === 'error' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-amber-50 border border-amber-200 text-amber-800'
                          }`}
                        >
                          <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${c.severity === 'error' ? 'text-red-500' : 'text-amber-500'}`} />
                          <span>{c.message}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {generatedTimetable && (
                    <>
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-800">
                          Preview: {generatedTimetable.className}
                        </h4>
                        <Button onClick={handleSaveTimetable} className="bg-green-600 hover:bg-green-700">
                          <CheckCircle2 className="h-4 w-4 mr-2" /> Save Timetable
                        </Button>
                      </div>
                      <TimetableGrid grid={generatedTimetable.grid} compact />
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
};

function RuleInput({ label, value, onChange, min, max }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number;
}) {
  return (
    <div>
      <Label className="text-xs text-gray-600">{label}</Label>
      <Input
        type="number" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="mt-1 h-8 text-sm"
      />
    </div>
  );
}

export default SchedulerPanel;
