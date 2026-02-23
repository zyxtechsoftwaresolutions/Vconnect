import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { UserPlus, Users, Search, Save, Loader2 } from 'lucide-react';
import { databaseService } from '../../services/databaseService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { Department } from '../../types/user';

interface MenteeAssignmentProps {
  onClose: () => void;
  onAssigned?: () => void;
}

const MenteeAssignment: React.FC<MenteeAssignmentProps> = ({ onClose, onAssigned }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [faculty, setFaculty] = useState<{ id: string; name: string; department: string; currentMentees: number }[]>([]);
  const [students, setStudents] = useState<{ id: string; registerId: string; name: string; class: string; currentMentor: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAssignmentData();
  }, [user?.department]);

  const loadAssignmentData = async () => {
    setLoading(true);
    try {
      const userDept = user?.department as Department | undefined;
      const facultyList = await databaseService.getFacultyUsers(userDept);
      const studentsList = await databaseService.getAllStudents();
      const byDept = userDept ? studentsList.filter((s: any) => s.department === userDept) : studentsList;

      const facultyData = await Promise.all(
        facultyList.map(async (f) => ({
          id: f.id,
          name: f.name,
          department: f.department,
          currentMentees: await databaseService.getMenteeCountByMentor(f.id),
        }))
      );

      const nameById = new Map(facultyList.map((f) => [f.id, f.name]));
      const studentsData = byDept.map((s: any) => ({
        id: s.id,
        registerId: s.registerId || s.register_id,
        name: s.name,
        class: s.class || s.classId || '',
        currentMentor: s.mentorId ? (nameById.get(s.mentorId) ?? null) : null,
      }));

      setFaculty(facultyData);
      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading assignment data:', error);
      toast({ title: 'Error', description: 'Failed to load faculty or students.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.registerId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleAssign = async () => {
    if (!selectedFaculty || selectedStudents.length === 0) return;
    setSaving(true);
    try {
      for (const studentId of selectedStudents) {
        await databaseService.updateStudent(studentId, { mentorId: selectedFaculty });
      }
      toast({ title: 'Assigned', description: `${selectedStudents.length} mentee(s) assigned.` });
      onAssigned?.();
      onClose();
    } catch (error) {
      console.error('Error assigning mentees:', error);
      toast({ title: 'Error', description: 'Failed to assign mentees.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>Assign Mentees to Faculty</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Faculty Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Select Faculty Mentor</label>
            <Select value={selectedFaculty} onValueChange={setSelectedFaculty} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? 'Loading faculty...' : faculty.length === 0 ? 'No faculty in your department' : 'Choose a faculty member'} />
              </SelectTrigger>
              <SelectContent>
                {faculty.map((facultyItem) => (
                  <SelectItem key={facultyItem.id} value={facultyItem.id}>
                    {facultyItem.name} ({facultyItem.department}) — {facultyItem.currentMentees}/30 mentees
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Students List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium">Select Students</label>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </div>
            
            <div className="border rounded-lg max-h-60 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Select</th>
                    <th className="text-left p-3">Register ID</th>
                    <th className="text-left p-3">Student Name</th>
                    <th className="text-left p-3">Class</th>
                    <th className="text-left p-3">Current Mentor</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(student => (
                    <tr key={student.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => handleStudentSelect(student.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="p-3 font-medium text-blue-600">{student.registerId}</td>
                      <td className="p-3">{student.name}</td>
                      <td className="p-3">{student.class}</td>
                      <td className="p-3">
                        {student.currentMentor ? (
                          <Badge variant="outline">{student.currentMentor}</Badge>
                        ) : (
                          <Badge variant="secondary">Unassigned</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          {selectedStudents.length > 0 && (
            <Card className="bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">
                    {selectedStudents.length} students selected for assignment
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button 
              onClick={handleAssign}
              disabled={!selectedFaculty || selectedStudents.length === 0 || saving}
              className="flex-1"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Assign Mentees
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MenteeAssignment;