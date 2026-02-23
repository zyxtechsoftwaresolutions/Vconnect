import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { StudentData } from '../../services/studentService';
import StudentProfileForm from '../forms/StudentProfileForm';

interface StudentProfileModalProps {
  student: StudentData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedStudent: StudentData) => void;
}

const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  student,
  isOpen,
  onClose,
  onSave
}) => {
  if (!student) return null;

  const handleSave = (updatedStudent: StudentData) => {
    onSave(updatedStudent);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-7xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-2 sm:p-6">
        <DialogHeader className="px-2 sm:px-0">
          <DialogTitle className="text-base sm:text-lg">Edit Profile - {student.name}</DialogTitle>
        </DialogHeader>
        <StudentProfileForm
          student={student}
          onSave={handleSave}
          onCancel={onClose}
          isEditing={true}
        />
      </DialogContent>
    </Dialog>
  );
};

export default StudentProfileModal; 