import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { X } from 'lucide-react';
import { Department } from '../../types/user';
import { facultyAssignmentService, FacultyAssignment } from '../../services/facultyAssignmentService';
import { databaseService } from '../../services/databaseService';
import FacultyConflictDialog from '../dialogs/FacultyConflictDialog';

interface FacultyAssignmentFormProps {
  onSubmit: (assignment: FacultyAssignment) => void;
  onClose: () => void;
  editAssignment?: FacultyAssignment;
  userDepartment?: Department;
}

const FacultyAssignmentForm: React.FC<FacultyAssignmentFormProps> = ({
  onSubmit,
  onClose,
  editAssignment,
  userDepartment
}) => {
  const [formData, setFormData] = useState({
    facultyId: editAssignment?.facultyId || '',
    subject: editAssignment?.subject || '',
    class: editAssignment?.class || '',
    room: editAssignment?.room || '',
    day: editAssignment?.day || 'Monday',
    period: editAssignment?.period || 0
  });

  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<any>(null);
  const [pendingAssignment, setPendingAssignment] = useState<any>(null);

  const timeSlots = [
    '9:10 - 10:00',
    '10:00 - 10:50',
    '10:50 - 11:40',
    '11:40 - 12:30',
    '1:30 - 2:20',
    '2:20 - 3:10',
    '3:10 - 4:00'
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Load faculty and classes from database so created faculty/classes appear
  const [availableFaculty, setAvailableFaculty] = useState<{ id: string; name: string; department: Department }[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingOptions(true);
      try {
        const [faculty, classes] = await Promise.all([
          facultyAssignmentService.getFacultyFromDb(userDepartment),
          userDepartment
            ? databaseService.getClassesByDepartment(userDepartment).then(cs => (cs || []).map(c => (c as { name?: string }).name).filter(Boolean) as string[])
            : databaseService.getAllClasses().then(cs => (cs || []).map(c => (c as { name?: string }).name).filter(Boolean) as string[])
        ]);
        if (!cancelled) {
          setAvailableFaculty(faculty);
          setAvailableClasses(classes.filter(Boolean));
        }
      } catch (e) {
        if (!cancelled) {
          setAvailableFaculty([]);
          setAvailableClasses([]);
        }
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userDepartment]);

  const availableSubjects = userDepartment
    ? facultyAssignmentService.getSubjectsByDepartment(userDepartment)
    : facultyAssignmentService.getSubjectsByDepartment(Department.CSE).concat(
        facultyAssignmentService.getSubjectsByDepartment(Department.ECE),
        facultyAssignmentService.getSubjectsByDepartment(Department.EEE),
        facultyAssignmentService.getSubjectsByDepartment(Department.CIVIL),
        facultyAssignmentService.getSubjectsByDepartment(Department.MECH),
        facultyAssignmentService.getSubjectsByDepartment(Department.AME),
        facultyAssignmentService.getSubjectsByDepartment(Department.MBA),
        facultyAssignmentService.getSubjectsByDepartment(Department.MCA),
        facultyAssignmentService.getSubjectsByDepartment(Department.DIPLOMA),
        facultyAssignmentService.getSubjectsByDepartment(Department.BBA),
        facultyAssignmentService.getSubjectsByDepartment(Department.BCA)
      );

  const availableRooms = facultyAssignmentService.getAllRooms();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.facultyId || !formData.subject || !formData.class || !formData.room) {
      alert('Please fill in all required fields');
      return;
    }

    const selectedFaculty = availableFaculty.find(f => f.id === formData.facultyId);
    if (!selectedFaculty) {
      alert('Please select a valid faculty');
      return;
    }

    const newAssignment = {
      facultyId: formData.facultyId,
      facultyName: selectedFaculty.name,
      department: selectedFaculty.department,
      day: formData.day,
      period: formData.period,
      timeSlot: timeSlots[formData.period],
      subject: formData.subject,
      class: formData.class,
      room: formData.room
    };

    // Check for conflicts
    const conflict = facultyAssignmentService.checkConflict(
      formData.facultyId,
      formData.day,
      formData.period,
      editAssignment?.id
    );

    if (conflict.hasConflict) {
      setConflictInfo({
        facultyName: selectedFaculty.name,
        conflictingAssignments: conflict.conflictingAssignments,
        newAssignment: {
          subject: formData.subject,
          class: formData.class,
          room: formData.room,
          day: formData.day,
          period: formData.period,
          timeSlot: timeSlots[formData.period]
        }
      });
      setPendingAssignment(newAssignment);
      setShowConflictDialog(true);
    } else {
      // No conflict, proceed directly
      try {
        if (editAssignment) {
          const updatedAssignment = await facultyAssignmentService.updateAssignment(
            editAssignment.id,
            newAssignment
          );
          if (updatedAssignment) {
            onSubmit(updatedAssignment);
          }
        } else {
          const createdAssignment = await facultyAssignmentService.addAssignment(newAssignment);
          onSubmit(createdAssignment);
        }
        onClose();
      } catch (error) {
        console.error('Error saving assignment:', error);
        alert('Error saving assignment. Please try again.');
      }
    }
  };

  const handleProceedWithConflict = async () => {
    if (pendingAssignment) {
      try {
        if (editAssignment) {
          const updatedAssignment = await facultyAssignmentService.updateAssignment(
            editAssignment.id,
            pendingAssignment
          );
          if (updatedAssignment) {
            onSubmit(updatedAssignment);
          }
        } else {
          const createdAssignment = await facultyAssignmentService.addAssignment(pendingAssignment);
          onSubmit(createdAssignment);
        }
        setShowConflictDialog(false);
        setConflictInfo(null);
        setPendingAssignment(null);
        onClose();
      } catch (error) {
        console.error('Error saving assignment:', error);
        alert('Error saving assignment. Please try again.');
      }
    }
  };

  const handleCancelConflict = () => {
    setShowConflictDialog(false);
    setConflictInfo(null);
    setPendingAssignment(null);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editAssignment ? 'Edit Faculty Assignment' : 'Assign Faculty to Class'}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="faculty">Faculty *</Label>
                <Select 
                  value={formData.facultyId} 
                  onValueChange={(value) => setFormData({ ...formData, facultyId: value })}
                  disabled={loadingOptions}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      loadingOptions ? 'Loading faculty...' : availableFaculty.length === 0 ? 'No faculty in DB—create in Users first' : 'Select Faculty'
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFaculty.map((faculty) => (
                      <SelectItem key={faculty.id} value={faculty.id}>
                        {faculty.name} ({faculty.department})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Select 
                  value={formData.subject} 
                  onValueChange={(value) => setFormData({ ...formData, subject: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="class">Class *</Label>
                <Select 
                  value={formData.class} 
                  onValueChange={(value) => setFormData({ ...formData, class: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses.map((className) => (
                      <SelectItem key={className} value={className}>
                        {className}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="room">Room *</Label>
                <Select 
                  value={formData.room} 
                  onValueChange={(value) => setFormData({ ...formData, room: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Room" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRooms.map((room) => (
                      <SelectItem key={room} value={room}>
                        {room}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="day">Day *</Label>
                  <Select 
                    value={formData.day} 
                    onValueChange={(value) => setFormData({ ...formData, day: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {days.map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="period">Period *</Label>
                  <Select 
                    value={formData.period.toString()} 
                    onValueChange={(value) => setFormData({ ...formData, period: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          Period {index + 1} ({slot})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editAssignment ? 'Update Assignment' : 'Assign Faculty'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {conflictInfo && (
        <FacultyConflictDialog
          isOpen={showConflictDialog}
          onClose={handleCancelConflict}
          onProceed={handleProceedWithConflict}
          onCancel={handleCancelConflict}
          conflictInfo={conflictInfo}
        />
      )}
    </>
  );
};

export default FacultyAssignmentForm; 