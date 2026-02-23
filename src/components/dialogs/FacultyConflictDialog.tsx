import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { AlertTriangle, Clock, Users, MapPin, BookOpen } from 'lucide-react';
import { FacultyAssignment } from '../../services/facultyAssignmentService';

interface FacultyConflictDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  onCancel: () => void;
  conflictInfo: {
    facultyName: string;
    conflictingAssignments: FacultyAssignment[];
    newAssignment: {
      subject: string;
      class: string;
      room: string;
      day: string;
      period: number;
      timeSlot: string;
    };
  };
}

const FacultyConflictDialog: React.FC<FacultyConflictDialogProps> = ({
  isOpen,
  onClose,
  onProceed,
  onCancel,
  conflictInfo
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="border-b">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            <CardTitle className="text-xl text-orange-600">Faculty Assignment Conflict</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Conflict Message */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-orange-800 font-medium">
                {conflictInfo.facultyName} is already assigned to multiple classes during this time slot.
              </p>
            </div>

            {/* New Assignment Details */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
                <BookOpen className="h-4 w-4 mr-2" />
                New Assignment
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Subject:</span>
                  <p className="text-blue-800">{conflictInfo.newAssignment.subject}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Class:</span>
                  <p className="text-blue-800">{conflictInfo.newAssignment.class}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Room:</span>
                  <p className="text-blue-800">{conflictInfo.newAssignment.room}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Time:</span>
                  <p className="text-blue-800">{conflictInfo.newAssignment.timeSlot}</p>
                </div>
              </div>
            </div>

            {/* Existing Assignments */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Existing Assignments (Same Time Slot)
              </h3>
              <div className="space-y-3">
                {conflictInfo.conflictingAssignments.map((assignment, index) => (
                  <div key={assignment.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-sm">
                        Assignment {index + 1}
                      </Badge>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-3 w-3 mr-1" />
                        {assignment.timeSlot}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Subject:</span>
                        <p className="text-gray-800">{assignment.subject}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Class:</span>
                        <p className="text-gray-800">{assignment.class}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Room:</span>
                        <p className="text-gray-800 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {assignment.room}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Department:</span>
                        <p className="text-gray-800">{assignment.department}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Warning Message */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-yellow-800 font-medium mb-1">Important Note:</p>
                  <p className="text-yellow-700 text-sm">
                    If you proceed, {conflictInfo.facultyName} will be assigned to multiple classes during the same time period. 
                    The faculty will need to manage attendance for all assigned classes.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button 
                variant="default" 
                onClick={onProceed}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Add Anyway
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FacultyConflictDialog; 