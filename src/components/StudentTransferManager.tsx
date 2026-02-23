import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Users, GraduationCap, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { Department, UserRole } from '../types/user';
import { useAuth } from '../contexts/AuthContext';
import { StudentData } from '../services/studentService';
import { supabase } from '../lib/supabase';

interface StudentTransferManagerProps {
  onTransferComplete?: () => void;
}

const StudentTransferManager: React.FC<StudentTransferManagerProps> = ({ onTransferComplete }) => {
  const { user } = useAuth();
  const [eligibleStudents, setEligibleStudents] = useState<StudentData[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [targetDepartment, setTargetDepartment] = useState<Department | ''>('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferStatus, setTransferStatus] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Check if user can manage transfers
  const canManageTransfers = () => {
    return user?.role === UserRole.ADMIN || 
           user?.role === UserRole.PRINCIPAL || 
           user?.role === UserRole.HOD;
  };

  // Load eligible students for transfer
  useEffect(() => {
    if (canManageTransfers()) {
      loadEligibleStudents();
    }
  }, []);

  const loadEligibleStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('department', Department.BSH);

      if (error) throw error;

      setEligibleStudents((data || []) as any);
    } catch (error) {
      console.error('Failed to load eligible students:', error);
      setTransferStatus({
        type: 'error',
        message: 'Failed to load eligible students for transfer.'
      });
    }
  };

  const handleTransfer = async () => {
    if (!selectedStudent || !targetDepartment) {
      setTransferStatus({
        type: 'error',
        message: 'Please select both a student and target department.'
      });
      return;
    }

    setIsTransferring(true);
    setTransferStatus(null);

    try {
      const { data, error } = await supabase
        .from('students')
        .update({
          department: targetDepartment,
          class: `${targetDepartment}-A`
        })
        .eq('id', selectedStudent)
        .select()
        .single();

      if (error || !data) {
        throw error || new Error('Transfer failed');
      }

      setTransferStatus({
        type: 'success',
        message: `Student ${data.name} successfully transferred from BS&H to ${targetDepartment}.`
      });

      // Reset form
      setSelectedStudent('');
      setTargetDepartment('');

      // Reload eligible students
      loadEligibleStudents();

      // Notify parent component
      if (onTransferComplete) {
        onTransferComplete();
      }
    } catch (error) {
      console.error('Transfer error:', error);
      setTransferStatus({
        type: 'error',
        message: `Transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsTransferring(false);
    }
  };

  const getTargetDepartments = (): Department[] => {
    return [Department.CSE, Department.ECE, Department.EEE, Department.CIVIL, Department.MECH, Department.AME];
  };

  if (!canManageTransfers()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <GraduationCap className="h-5 w-5" />
            <span>Student Transfer Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to manage student transfers. Only Administrators, Principals, and HODs can perform this operation.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <GraduationCap className="h-5 w-5" />
          <span>Student Transfer Management</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Messages */}
        {transferStatus && (
          <Alert className={transferStatus.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            {transferStatus.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={transferStatus.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {transferStatus.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Eligible Students Section */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Eligible Students for Transfer</span>
            <Badge variant="secondary">{eligibleStudents.length} students</Badge>
          </h3>
          
          {eligibleStudents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No students are currently eligible for transfer from BS&H.</p>
              <p className="text-sm">Students become eligible after completing their first year in BS&H.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {eligibleStudents.map((student) => (
                <div
                  key={student.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedStudent === student.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedStudent(student.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{student.name}</h4>
                      <p className="text-sm text-gray-600">
                        {student.registerId} • {student.regulation} • {student.class}
                      </p>
                    </div>
                    <Badge variant="outline">BS&H</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transfer Form */}
        {eligibleStudents.length > 0 && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Transfer Student</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Student</label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a student to transfer" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} ({student.registerId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Target Department</label>
                <Select value={targetDepartment} onValueChange={(value) => setTargetDepartment(value as Department)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target department" />
                  </SelectTrigger>
                  <SelectContent>
                    {getTargetDepartments().map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                onClick={handleTransfer}
                disabled={!selectedStudent || !targetDepartment || isTransferring}
                className="flex items-center space-x-2"
              >
                {isTransferring ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Transferring...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    <span>Transfer Student</span>
                  </>
                )}
              </Button>

              {selectedStudent && targetDepartment && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Transfer Summary:</span> Student will be moved from BS&H to {targetDepartment} department.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Information Section */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-3">Transfer Process Information</h3>
          <div className="bg-blue-50 p-4 rounded-lg space-y-2 text-sm text-blue-800">
            <p><strong>Eligibility:</strong> Students become eligible for transfer after completing their first year in BS&H.</p>
            <p><strong>Data Preservation:</strong> All student data (attendance, grades, personal info) will be preserved during transfer.</p>
            <p><strong>Automatic Updates:</strong> The system will automatically update all related records and references.</p>
            <p><strong>Target Departments:</strong> Students can be transferred to CSE, ECE, EEE, CIVIL, MECH, or AME departments.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentTransferManager; 