
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { X, AlertCircle } from 'lucide-react';
import { Department } from '../../types/user';
import { studentService, StudentData } from '../../services/studentService';
import { toast } from '../ui/use-toast';

interface StudentFormProps {
  onSubmit: (studentData: any) => void;
  onClose: () => void;
  editStudent?: any;
  userDepartment?: Department;
}

const StudentForm: React.FC<StudentFormProps> = ({ onSubmit, onClose, editStudent, userDepartment }) => {
  const [formData, setFormData] = useState({
    name: editStudent?.name || '',
    registerId: editStudent?.registerId || '',
    regulation: editStudent?.regulation || '',
    email: editStudent?.email || '',
    phoneNumber: editStudent?.phoneNumber || '',
    fatherName: editStudent?.fatherName || '',
    fatherOccupation: editStudent?.fatherOccupation || '',
    fatherMobile: editStudent?.fatherMobile || '',
    motherName: editStudent?.motherName || '',
    motherOccupation: editStudent?.motherOccupation || '',
    motherMobile: editStudent?.motherMobile || '',
    apaarId: editStudent?.apaarId || '',
    aadharId: editStudent?.aadharId || '',
    address: editStudent?.address || '',
    healthIssues: editStudent?.healthIssues || '',
    seatQuota: editStudent?.seatQuota || 'CQ',
    caste: editStudent?.caste || 'OC',
    class: editStudent?.class || (userDepartment ? `${userDepartment}-A` : 'CSE-A'),
    department: editStudent?.department || userDepartment || Department.CSE,
    password: '',
    confirmPassword: '',
    useDefaultPassword: true,
    updatePassword: false
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Function to generate proper register ID format (23NT1A0552)
  const generateNextRegisterId = (department: Department, regulation: string) => {
    const deptCode = department === Department.CSE ? '05' : 
                   department === Department.ECE ? '04' : 
                   department === Department.EEE ? '03' : 
                   department === Department.CIVIL ? '01' : 
                   department === Department.MECH ? '02' : '05';
    
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    return `23NT1A${deptCode}${randomNum}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors([]);

    try {
      // Validate the form data
      const validation = studentService.validateStudent(formData, !!editStudent);
      
      if (!validation.isValid) {
        setErrors(validation.errors);
        setIsSubmitting(false);
        return;
      }

      // Validate password for new students or password updates
      if (!editStudent || formData.updatePassword) {
        if (!formData.useDefaultPassword) {
          if (!formData.password) {
            setErrors(['Password is required']);
            setIsSubmitting(false);
            return;
          }
          if (formData.password.length < 6) {
            setErrors(['Password must be at least 6 characters long']);
            setIsSubmitting(false);
            return;
          }
          if (formData.password !== formData.confirmPassword) {
            setErrors(['Passwords do not match']);
            setIsSubmitting(false);
            return;
          }
        }
      }

      const studentData = {
        ...formData,
        id: editStudent?.id || '',
        role: 'STUDENT',
        isActive: true,
        attendancePercentage: editStudent?.attendancePercentage || 0,
        attendance: editStudent?.attendance || '0%',
        createdAt: editStudent?.createdAt || new Date(),
        updatedAt: new Date(),
        registerId: formData.registerId || generateNextRegisterId(formData.department, formData.regulation),
        phoneNumber: formData.phoneNumber || '1234567890',
        fatherMobile: formData.fatherMobile || '1234567890',
        motherMobile: formData.motherMobile || '1234567890',
        apaarId: formData.apaarId || `APAAR${Date.now()}`,
        aadharId: formData.aadharId || `AADHAR${Date.now()}`
      };

      onSubmit(studentData);
      onClose();

      toast({
        title: "Student Created Successfully!",
        description: `Student "${studentData.name}" created successfully!`,
        duration: 3000,
      });
      
    } catch (error) {
      if (error instanceof Error) {
        setErrors([error.message]);
      } else {
        setErrors(['An unexpected error occurred']);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl my-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{editStudent ? 'Edit Student' : 'Add New Student'}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {/* Error Display */}
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <h3 className="text-sm font-medium text-red-800">Validation Errors</h3>
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-red-600">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Student Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="registerId">Register ID *</Label>
                <div className="flex gap-2">
                  <Input
                    id="registerId"
                    value={formData.registerId}
                    onChange={(e) => setFormData({ ...formData, registerId: e.target.value })}
                    placeholder="e.g., 23NT1A0552"
                    required
                  />
                  {!editStudent && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const nextId = generateNextRegisterId(formData.department, formData.regulation);
                        setFormData({ ...formData, registerId: nextId });
                      }}
                      className="whitespace-nowrap"
                    >
                      Auto Generate
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="regulation">Regulation *</Label>
                <Input
                  id="regulation"
                  value={formData.regulation}
                  onChange={(e) => setFormData({ ...formData, regulation: e.target.value })}
                  placeholder="e.g., R23, R20"
                  pattern="R[0-9]{2}"
                  title="Format: R followed by 2 digits (e.g., R23)"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Father's Information */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Father's Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="fatherName">Father Name *</Label>
                  <Input
                    id="fatherName"
                    value={formData.fatherName}
                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="fatherOccupation">Father Occupation *</Label>
                  <Input
                    id="fatherOccupation"
                    value={formData.fatherOccupation}
                    onChange={(e) => setFormData({ ...formData, fatherOccupation: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="fatherMobile">Father Mobile *</Label>
                  <Input
                    id="fatherMobile"
                    value={formData.fatherMobile}
                    onChange={(e) => setFormData({ ...formData, fatherMobile: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Mother's Information */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Mother's Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="motherName">Mother Name *</Label>
                  <Input
                    id="motherName"
                    value={formData.motherName}
                    onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="motherOccupation">Mother Occupation *</Label>
                  <Input
                    id="motherOccupation"
                    value={formData.motherOccupation}
                    onChange={(e) => setFormData({ ...formData, motherOccupation: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="motherMobile">Mother Mobile *</Label>
                  <Input
                    id="motherMobile"
                    value={formData.motherMobile}
                    onChange={(e) => setFormData({ ...formData, motherMobile: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Official Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="apaarId">APAAR ID *</Label>
                <Input
                  id="apaarId"
                  value={formData.apaarId}
                  onChange={(e) => setFormData({ ...formData, apaarId: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="aadharId">Aadhar ID *</Label>
                <Input
                  id="aadharId"
                  value={formData.aadharId}
                  onChange={(e) => setFormData({ ...formData, aadharId: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="seatQuota">Seat Quota *</Label>
                <Select value={formData.seatQuota} onValueChange={(value) => setFormData({ ...formData, seatQuota: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CQ">CQ (Convenor Quota)</SelectItem>
                    <SelectItem value="MQ">MQ (Management Quota)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="caste">Caste *</Label>
                <Input
                  id="caste"
                  value={formData.caste}
                  onChange={(e) => setFormData({ ...formData, caste: e.target.value })}
                  placeholder="Enter caste (e.g., OC, SC, ST, BC, OBC, etc.)"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="healthIssues">Health Issues (if any)</Label>
              <Textarea
                id="healthIssues"
                value={formData.healthIssues}
                onChange={(e) => setFormData({ ...formData, healthIssues: e.target.value })}
                placeholder="Mention any health conditions or allergies"
              />
            </div>

            <div>
              <Label htmlFor="class">Assign to Class</Label>
              <Select value={formData.class} onValueChange={(value) => setFormData({ ...formData, class: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {userDepartment ? (
                    // Department-specific classes
                    (() => {
                      const departmentClasses: Record<Department, string[]> = {
                        [Department.CSE]: ['CSE-A', 'CSE-B', 'CSE-C', 'CSE-D'],
                        [Department.ECE]: ['ECE-A', 'ECE-B', 'ECE-C'],
                        [Department.EEE]: ['EEE-A', 'EEE-B', 'EEE-C'],
                        [Department.CIVIL]: ['CIVIL-A', 'CIVIL-B', 'CIVIL-C'],
                        [Department.MECH]: ['MECH-A', 'MECH-B', 'MECH-C'],
                        [Department.AME]: ['AME-A', 'AME-B'],
                        [Department.MBA]: ['MBA-A', 'MBA-B'],
                        [Department.MCA]: ['MCA-A', 'MCA-B'],
                        [Department.DIPLOMA]: ['DIPLOMA-A', 'DIPLOMA-B'],
                        [Department.BBA]: ['BBA-A', 'BBA-B'],
                        [Department.BCA]: ['BCA-A', 'BCA-B'],
                        [Department.BSH]: ['BS&H-A', 'BS&H-B', 'BS&H-C', 'BS&H-D'] // BS&H classes for first-year students
                      };
                      return departmentClasses[userDepartment]?.map(className => (
                        <SelectItem key={className} value={className}>
                          {className}
                        </SelectItem>
                      )) || [];
                    })()
                  ) : (
                    // All classes for admin/principal
                    [
                      'CSE-A', 'CSE-B', 'CSE-C', 'CSE-D',
                      'ECE-A', 'ECE-B', 'ECE-C',
                      'EEE-A', 'EEE-B', 'EEE-C',
                      'CIVIL-A', 'CIVIL-B', 'CIVIL-C',
                      'MECH-A', 'MECH-B', 'MECH-C',
                      'AME-A', 'AME-B',
                      'MBA-A', 'MBA-B',
                      'MCA-A', 'MCA-B',
                      'DIPLOMA-A', 'DIPLOMA-B',
                      'BBA-A', 'BBA-B',
                      'BCA-A', 'BCA-B',
                      'BS&H-A', 'BS&H-B', 'BS&H-C', 'BS&H-D' // BS&H classes for first-year students
                    ].map(className => (
                      <SelectItem key={className} value={className}>
                        {className}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Password Fields */}
            {!editStudent && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!formData.useDefaultPassword}
                    disabled={formData.useDefaultPassword}
                    placeholder={formData.useDefaultPassword ? "Default password will be used" : "Minimum 6 characters"}
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required={!formData.useDefaultPassword}
                    disabled={formData.useDefaultPassword}
                    placeholder={formData.useDefaultPassword ? "Default password will be used" : "Confirm your password"}
                  />
                </div>
                <div className="flex items-center col-span-2">
                  <input
                    type="checkbox"
                    id="useDefaultPassword"
                    checked={formData.useDefaultPassword}
                    onChange={(e) => setFormData({ ...formData, useDefaultPassword: e.target.checked })}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <Label htmlFor="useDefaultPassword" className="text-sm text-gray-700">
                    Use default password (student123)
                  </Label>
                </div>
              </div>
            )}

            {/* Password Update Section for Editing Students */}
            {editStudent && (
              <>
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      id="updatePassword"
                      checked={formData.updatePassword}
                      onChange={(e) => setFormData({ ...formData, updatePassword: e.target.checked })}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <Label htmlFor="updatePassword" className="text-sm font-medium text-gray-700">
                      Update Password
                    </Label>
                  </div>
                  
                  {formData.updatePassword && (
                    <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                      <div>
                        <Label htmlFor="editPassword">New Password</Label>
                        <Input
                          id="editPassword"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required={formData.updatePassword && !formData.useDefaultPassword}
                          placeholder="Minimum 6 characters"
                          disabled={formData.useDefaultPassword}
                        />
                      </div>

                      <div>
                        <Label htmlFor="editConfirmPassword">Confirm New Password</Label>
                        <Input
                          id="editConfirmPassword"
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          required={formData.updatePassword && !formData.useDefaultPassword}
                          placeholder="Confirm new password"
                          disabled={formData.useDefaultPassword}
                        />
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="editUseDefaultPassword"
                          checked={formData.useDefaultPassword}
                          onChange={(e) => setFormData({ ...formData, useDefaultPassword: e.target.checked })}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <Label htmlFor="editUseDefaultPassword" className="text-sm text-gray-700">
                          Use default password (student123)
                        </Label>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

                          <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Processing...' : (editStudent ? 'Update Student' : 'Add Student')}
                </Button>
              </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentForm;
