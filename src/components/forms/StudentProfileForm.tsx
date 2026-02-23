import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { X, Plus, Save, User, Phone, Mail, MapPin, Calendar, Heart, Home, Bus, Star, Users, FileText, GraduationCap, Award, BookOpen, CreditCard, Building, Trophy, Trash2 } from 'lucide-react';
import { Department, UserRole } from '../../types/user';
import { StudentData, Achievement, updateStudent } from '../../services/studentService';
import { Supply } from '../../types/user';
import { useAuth } from '../../contexts/AuthContext';

// Import the global notification system
import { notifyStudentUpdates } from '../../pages/Students';

interface StudentProfileFormProps {
  student: StudentData;
  onSave: (updatedStudent: StudentData) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const StudentProfileForm: React.FC<StudentProfileFormProps> = ({ 
  student, 
  onSave, 
  onCancel, 
  isEditing = false 
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<StudentData>(student);
  const [newSkill, setNewSkill] = useState('');
  const [newLanguage, setNewLanguage] = useState('');
  const [newHobby, setNewHobby] = useState('');
  const [newAchievement, setNewAchievement] = useState<Partial<Achievement>>({
    title: '',
    category: 'ACADEMIC',
    description: '',
    date: '',
    level: 'INSTITUTE'
  });
  const [newSupply, setNewSupply] = useState<Partial<Supply>>({
    subject: '',
    semester: 1,
    academicYear: '2024-25',
    attempts: 1
  });

  // Check if current user is the student being edited
  const isCurrentUserStudent = user?.role === UserRole.STUDENT && user?.email === student.email;
  
  // Check if current user can edit this student's profile
  const canEdit = !isCurrentUserStudent || user?.role !== UserRole.STUDENT;
  
  // Check if current user is a student (for field-level restrictions)
  const isStudentUser = user?.role === UserRole.STUDENT;
  
  // Fields that students cannot edit
  const restrictedFields = ['attendance', 'attendancePercentage', 'academicPercentage'];

  const handleInputChange = (field: keyof StudentData, value: any) => {
    // Prevent editing restricted fields for students
    if (isStudentUser && restrictedFields.includes(field)) {
      return;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayFieldChange = (field: keyof StudentData, value: string, action: 'add' | 'remove', index?: number) => {
    const currentArray = (formData[field] as string[]) || [];
    let newArray: string[];

    if (action === 'add') {
      newArray = [...currentArray, value];
    } else {
      newArray = currentArray.filter((_, i) => i !== index);
    }

    setFormData(prev => ({ ...prev, [field]: newArray }));
  };

  const handleSave = () => {
    // Update the student data with current timestamp
    const updatedStudent = {
      ...formData,
      updatedAt: new Date()
    };
    
    // Update in the unified service (persists changes)
    const result = updateStudent(updatedStudent.id, updatedStudent);
    if (result) {
      console.log('✅ Student updated in unified service:', result.name);
    }
    
    // Notify all components about the student update
    try {
      notifyStudentUpdates([updatedStudent]);
    } catch (e) {
      console.log('Global notification failed:', e);
    }
    
    // Call the parent's onSave function
    onSave(updatedStudent);
  };

  const addSkill = () => {
    if (newSkill.trim()) {
      handleArrayFieldChange('skills', newSkill.trim(), 'add');
      setNewSkill('');
    }
  };

  const addLanguage = () => {
    if (newLanguage.trim()) {
      handleArrayFieldChange('languages', newLanguage.trim(), 'add');
      setNewLanguage('');
    }
  };

  const addHobby = () => {
    if (newHobby.trim()) {
      handleArrayFieldChange('hobbies', newHobby.trim(), 'add');
      setNewHobby('');
    }
  };

  const addAchievement = () => {
    if (newAchievement.title && newAchievement.description && newAchievement.date) {
      const achievement: Achievement = {
        id: Date.now().toString(),
        title: newAchievement.title,
        category: newAchievement.category || 'ACADEMIC',
        description: newAchievement.description,
        date: newAchievement.date,
        level: newAchievement.level || 'INSTITUTE',
        certificate: newAchievement.certificate
      };
      
      const currentAchievements = formData.achievements || [];
      setFormData(prev => ({
        ...prev,
        achievements: [...currentAchievements, achievement]
      }));
      
      setNewAchievement({
        title: '',
        category: 'ACADEMIC',
        description: '',
        date: '',
        level: 'INSTITUTE'
      });
    }
  };

  const removeAchievement = (index: number) => {
    const currentAchievements = formData.achievements || [];
    const updatedAchievements = currentAchievements.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      achievements: updatedAchievements
    }));
  };

  const addSupply = () => {
    if (newSupply.subject && newSupply.semester && newSupply.academicYear) {
      const supply: Supply = {
        subject: newSupply.subject,
        semester: newSupply.semester,
        academicYear: newSupply.academicYear,
        attempts: newSupply.attempts || 1
      };
      
      const currentSupplies = formData.supplies || [];
      setFormData(prev => ({
        ...prev,
        supplies: [...currentSupplies, supply]
      }));
      
      setNewSupply({
        subject: '',
        semester: 1,
        academicYear: '2024-25',
        attempts: 1
      });
    }
  };

  const removeSupply = (index: number) => {
    const currentSupplies = formData.supplies || [];
    const updatedSupplies = currentSupplies.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      supplies: updatedSupplies
    }));
  };

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-lg sm:text-2xl font-bold">Student Profile {isEditing ? 'Edit' : 'View'}</h2>
        <div className="flex space-x-2 w-full sm:w-auto">
          <Button variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          {canEdit && (
            <Button onClick={handleSave} className="flex items-center space-x-2 flex-1 sm:flex-none">
              <Save className="h-4 w-4" />
              <span>Save</span>
            </Button>
          )}
        </div>
      </div>

      {isStudentUser && !isCurrentUserStudent && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            <strong>Note:</strong> As a student, you can only edit your own profile information. 
            You cannot edit attendance, attendance percentage, or academic percentage.
          </p>
        </div>
      )}

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 w-full justify-start">
          <TabsTrigger value="basic" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5">Basic</TabsTrigger>
          <TabsTrigger value="personal" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5">Personal</TabsTrigger>
          <TabsTrigger value="academic" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5">Academic</TabsTrigger>
          <TabsTrigger value="accommodation" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5">Accommodation</TabsTrigger>
          <TabsTrigger value="skills" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5">Skills</TabsTrigger>
          <TabsTrigger value="achievements" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5">Achievements</TabsTrigger>
          <TabsTrigger value="supplies" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5">Supplies</TabsTrigger>
          <TabsTrigger value="placement" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5">Placement</TabsTrigger>
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Basic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter full name"
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="registerId">Register ID</Label>
                  <Input
                    id="registerId"
                    value={formData.registerId}
                    onChange={(e) => handleInputChange('registerId', e.target.value)}
                    placeholder="e.g., 23NT1A0501"
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="student@viet.edu.in"
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    placeholder="+91 9876543210"
                    disabled={!canEdit}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="regulation">Regulation</Label>
                  <Select 
                    value={formData.regulation} 
                    onValueChange={(value) => handleInputChange('regulation', value)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select regulation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="R23">R23</SelectItem>
                      <SelectItem value="R20">R20</SelectItem>
                      <SelectItem value="R19">R19</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="class">Class</Label>
                  <Input
                    id="class"
                    value={formData.class}
                    onChange={(e) => handleInputChange('class', e.target.value)}
                    placeholder="e.g., CSE-A"
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Select 
                    value={formData.department} 
                    onValueChange={(value) => handleInputChange('department', value as Department)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={Department.CSE}>CSE</SelectItem>
                      <SelectItem value={Department.ECE}>ECE</SelectItem>
                      <SelectItem value={Department.EEE}>EEE</SelectItem>
                      <SelectItem value={Department.CIVIL}>CIVIL</SelectItem>
                      <SelectItem value={Department.MECH}>MECH</SelectItem>
                      <SelectItem value={Department.AME}>AME</SelectItem>
                      <SelectItem value={Department.MBA}>MBA</SelectItem>
                      <SelectItem value={Department.MCA}>MCA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="attendance">Attendance</Label>
                  <Input
                    id="attendance"
                    value={formData.attendance}
                    onChange={(e) => handleInputChange('attendance', e.target.value)}
                    placeholder="e.g., 92.5%"
                    disabled={isStudentUser}
                    className={isStudentUser ? "bg-gray-100 cursor-not-allowed" : ""}
                  />
                  {isStudentUser && (
                    <p className="text-sm text-gray-500 mt-1">
                      Attendance can only be updated by faculty/staff
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personal Information Tab */}
        <TabsContent value="personal" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Personal Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth || ''}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select 
                    value={formData.gender || ''} 
                    onValueChange={(value) => handleInputChange('gender', value)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="bloodGroup">Blood Group</Label>
                  <Select 
                    value={formData.bloodGroup || ''} 
                    onValueChange={(value) => handleInputChange('bloodGroup', value)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Enter complete address"
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="healthIssues">Health Issues</Label>
                  <Textarea
                    id="healthIssues"
                    value={formData.healthIssues || ''}
                    onChange={(e) => handleInputChange('healthIssues', e.target.value)}
                    placeholder="Any health issues or allergies"
                    disabled={!canEdit}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Family Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Family Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="fatherName">Father's Name</Label>
                  <Input
                    id="fatherName"
                    value={formData.fatherName || ''}
                    onChange={(e) => handleInputChange('fatherName', e.target.value)}
                    placeholder="Father's full name"
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="fatherOccupation">Father's Occupation</Label>
                  <Input
                    id="fatherOccupation"
                    value={formData.fatherOccupation || ''}
                    onChange={(e) => handleInputChange('fatherOccupation', e.target.value)}
                    placeholder="Father's occupation"
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="fatherMobile">Father's Mobile</Label>
                  <Input
                    id="fatherMobile"
                    value={formData.fatherMobile || ''}
                    onChange={(e) => handleInputChange('fatherMobile', e.target.value)}
                    placeholder="+91 9876543200"
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="motherName">Mother's Name</Label>
                  <Input
                    id="motherName"
                    value={formData.motherName || ''}
                    onChange={(e) => handleInputChange('motherName', e.target.value)}
                    placeholder="Mother's full name"
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="motherOccupation">Mother's Occupation</Label>
                  <Input
                    id="motherOccupation"
                    value={formData.motherOccupation || ''}
                    onChange={(e) => handleInputChange('motherOccupation', e.target.value)}
                    placeholder="Mother's occupation"
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="motherMobile">Mother's Mobile</Label>
                  <Input
                    id="motherMobile"
                    value={formData.motherMobile || ''}
                    onChange={(e) => handleInputChange('motherMobile', e.target.value)}
                    placeholder="+91 9876543201"
                    disabled={!canEdit}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Academic Information Tab */}
        <TabsContent value="academic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <GraduationCap className="h-5 w-5" />
                <span>Academic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="attendancePercentage">Attendance Percentage</Label>
                  <Input
                    id="attendancePercentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.attendancePercentage || ''}
                    onChange={(e) => handleInputChange('attendancePercentage', parseFloat(e.target.value))}
                    placeholder="e.g., 92.5"
                    disabled={isStudentUser}
                    className={isStudentUser ? "bg-gray-100 cursor-not-allowed" : ""}
                  />
                  {isStudentUser && (
                    <p className="text-sm text-gray-500 mt-1">
                      Attendance percentage can only be updated by faculty/staff
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="role">Student Role</Label>
                  <Input
                    id="role"
                    value={formData.role || 'STUDENT'}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    placeholder="Student role"
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accommodation Tab */}
        <TabsContent value="accommodation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Home className="h-5 w-5" />
                <span>Accommodation & Transport</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isHostler"
                  checked={formData.isHostler || false}
                  onCheckedChange={(checked) => handleInputChange('isHostler', checked)}
                  disabled={!canEdit}
                />
                <Label htmlFor="isHostler">Is Hostler (Campus Resident)</Label>
              </div>

              {formData.isHostler ? (
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center space-x-2">
                    <Home className="h-4 w-4 text-blue-600" />
                    <span>Hostel Details</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="hostelBlock">Block</Label>
                      <Input
                        id="hostelBlock"
                        value={formData.hostelDetails?.block || ''}
                        onChange={(e) => handleInputChange('hostelDetails', {
                          ...formData.hostelDetails,
                          block: e.target.value
                        })}
                        placeholder="e.g., A, B, C"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <Label htmlFor="hostelRoom">Room Number</Label>
                      <Input
                        id="hostelRoom"
                        value={formData.hostelDetails?.roomNumber || ''}
                        onChange={(e) => handleInputChange('hostelDetails', {
                          ...formData.hostelDetails,
                          roomNumber: e.target.value
                        })}
                        placeholder="e.g., A-101"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <Label htmlFor="hostelFloor">Floor</Label>
                      <Input
                        id="hostelFloor"
                        value={formData.hostelDetails?.floor || ''}
                        onChange={(e) => handleInputChange('hostelDetails', {
                          ...formData.hostelDetails,
                          floor: e.target.value
                        })}
                        placeholder="e.g., 1, 2, 3"
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center space-x-2">
                    <Bus className="h-4 w-4 text-green-600" />
                    <span>Transport Details</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="transportRoute">Route</Label>
                      <Input
                        id="transportRoute"
                        value={formData.transportDetails?.route || ''}
                        onChange={(e) => handleInputChange('transportDetails', {
                          ...formData.transportDetails,
                          route: e.target.value
                        })}
                        placeholder="e.g., Route 1"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <Label htmlFor="transportStop">Stop</Label>
                      <Input
                        id="transportStop"
                        value={formData.transportDetails?.stop || ''}
                        onChange={(e) => handleInputChange('transportDetails', {
                          ...formData.transportDetails,
                          stop: e.target.value
                        })}
                        placeholder="e.g., Central Bus Stop"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <Label htmlFor="transportBus">Bus Number</Label>
                      <Input
                        id="transportBus"
                        value={formData.transportDetails?.busNumber || ''}
                        onChange={(e) => handleInputChange('transportDetails', {
                          ...formData.transportDetails,
                          busNumber: e.target.value
                        })}
                        placeholder="e.g., BUS-001"
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills & Interests Tab */}
        <TabsContent value="skills" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Skills */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>Skills</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {canEdit && (
                  <div className="flex space-x-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Add a skill"
                      onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                    />
                    <Button onClick={addSkill} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {(formData.skills || []).map((skill, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                      <span>{skill}</span>
                      {canEdit && (
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => handleArrayFieldChange('skills', '', 'remove', index)}
                        />
                      )}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Languages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>Languages</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {canEdit && (
                  <div className="flex space-x-2">
                    <Input
                      value={newLanguage}
                      onChange={(e) => setNewLanguage(e.target.value)}
                      placeholder="Add a language"
                      onKeyPress={(e) => e.key === 'Enter' && addLanguage()}
                    />
                    <Button onClick={addLanguage} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {(formData.languages || []).map((language, index) => (
                    <Badge key={index} variant="outline" className="flex items-center space-x-1">
                      <span>{language}</span>
                      {canEdit && (
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => handleArrayFieldChange('languages', '', 'remove', index)}
                        />
                      )}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Hobbies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>Hobbies</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {canEdit && (
                  <div className="flex space-x-2">
                    <Input
                      value={newHobby}
                      onChange={(e) => setNewHobby(e.target.value)}
                      placeholder="Add a hobby"
                      onKeyPress={(e) => e.key === 'Enter' && addHobby()}
                    />
                    <Button onClick={addHobby} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {(formData.hobbies || []).map((hobby, index) => (
                    <Badge key={index} variant="outline" className="flex items-center space-x-1">
                      <span>{hobby}</span>
                      {canEdit && (
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => handleArrayFieldChange('hobbies', '', 'remove', index)}
                        />
                      )}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Career Goals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>Career Goals</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.careerGoals || ''}
                  onChange={(e) => handleInputChange('careerGoals', e.target.value)}
                  placeholder="Describe your career goals and aspirations"
                  rows={4}
                  disabled={!canEdit}
                />
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Additional Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="apaarId">APAAR ID</Label>
                  <Input
                    id="apaarId"
                    value={formData.apaarId || ''}
                    onChange={(e) => handleInputChange('apaarId', e.target.value)}
                    placeholder="APAAR ID"
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="aadharId">Aadhar ID</Label>
                  <Input
                    id="aadharId"
                    value={formData.aadharId || ''}
                    onChange={(e) => handleInputChange('aadharId', e.target.value)}
                    placeholder="Aadhar ID"
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="seatQuota">Seat Quota</Label>
                  <Select 
                    value={formData.seatQuota || ''} 
                    onValueChange={(value) => handleInputChange('seatQuota', value)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select seat quota" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CQ">CQ (Convenor Quota)</SelectItem>
                      <SelectItem value="MQ">MQ (Management Quota)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="caste">Caste</Label>
                  <Input
                    id="caste"
                    value={formData.caste || ''}
                    onChange={(e) => handleInputChange('caste', e.target.value)}
                    placeholder="Caste"
                    disabled={!canEdit}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Phone className="h-5 w-5" />
                  <span>Emergency Contact</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="emergencyName">Emergency Contact Name</Label>
                  <Input
                    id="emergencyName"
                    value={formData.emergencyContact?.name || ''}
                    onChange={(e) => handleInputChange('emergencyContact', {
                      ...formData.emergencyContact,
                      name: e.target.value
                    })}
                    placeholder="Emergency contact name"
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyRelation">Relation</Label>
                  <Input
                    id="emergencyRelation"
                    value={formData.emergencyContact?.relation || ''}
                    onChange={(e) => handleInputChange('emergencyContact', {
                      ...formData.emergencyContact,
                      relation: e.target.value
                    })}
                    placeholder="e.g., Father, Mother, Guardian"
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyPhone">Emergency Phone</Label>
                  <Input
                    id="emergencyPhone"
                    value={formData.emergencyContact?.phone || ''}
                    onChange={(e) => handleInputChange('emergencyContact', {
                      ...formData.emergencyContact,
                      phone: e.target.value
                    })}
                    placeholder="+91 9876543200"
                    disabled={!canEdit}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-5 w-5" />
                <span>Achievements</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {canEdit && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="achievementTitle">Achievement Title</Label>
                    <Input
                      id="achievementTitle"
                      value={newAchievement.title}
                      onChange={(e) => setNewAchievement(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., First Prize in Coding Competition"
                    />
                  </div>
                  <div>
                    <Label htmlFor="achievementCategory">Category</Label>
                    <Select 
                      value={newAchievement.category} 
                      onValueChange={(value) => setNewAchievement(prev => ({ ...prev, category: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACADEMIC">Academic</SelectItem>
                        <SelectItem value="SPORTS">Sports</SelectItem>
                        <SelectItem value="CULTURAL">Cultural</SelectItem>
                        <SelectItem value="TECHNICAL">Technical</SelectItem>
                        <SelectItem value="LEADERSHIP">Leadership</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="achievementLevel">Level</Label>
                    <Select 
                      value={newAchievement.level} 
                      onValueChange={(value) => setNewAchievement(prev => ({ ...prev, level: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INSTITUTE">Institute</SelectItem>
                        <SelectItem value="STATE">State</SelectItem>
                        <SelectItem value="NATIONAL">National</SelectItem>
                        <SelectItem value="INTERNATIONAL">International</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="achievementDate">Date</Label>
                    <Input
                      id="achievementDate"
                      type="date"
                      value={newAchievement.date}
                      onChange={(e) => setNewAchievement(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="achievementDescription">Description</Label>
                    <Textarea
                      id="achievementDescription"
                      value={newAchievement.description}
                      onChange={(e) => setNewAchievement(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the achievement in detail"
                      rows={3}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button onClick={addAchievement} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Achievement
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                {(formData.achievements || []).map((achievement, index) => (
                  <Card key={index} className="relative">
                    <CardContent className="pt-6">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                          onClick={() => removeAchievement(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <h4 className="font-semibold text-sm sm:text-lg">{achievement.title}</h4>
                          <div className="flex gap-1 sm:gap-2">
                            <Badge variant="outline" className="text-[10px] sm:text-xs">{achievement.category}</Badge>
                            <Badge variant="secondary" className="text-[10px] sm:text-xs">{achievement.level}</Badge>
                          </div>
                        </div>
                        <p className="text-gray-600">{achievement.description}</p>
                        <p className="text-sm text-gray-500">Date: {achievement.date}</p>
                        {achievement.certificate && (
                          <Button variant="outline" size="sm">
                            <FileText className="h-4 w-4 mr-2" />
                            View Certificate
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(formData.achievements || []).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No achievements recorded yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Supply Subjects Tab */}
        <TabsContent value="supplies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Supply Subjects</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {canEdit && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="supplySubject">Subject</Label>
                    <Input
                      id="supplySubject"
                      value={newSupply.subject}
                      onChange={(e) => setNewSupply(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="e.g., Data Structures"
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplySemester">Semester</Label>
                    <Select 
                      value={newSupply.semester?.toString()} 
                      onValueChange={(value) => setNewSupply(prev => ({ ...prev, semester: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                          <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="supplyAcademicYear">Academic Year</Label>
                    <Input
                      id="supplyAcademicYear"
                      value={newSupply.academicYear}
                      onChange={(e) => setNewSupply(prev => ({ ...prev, academicYear: e.target.value }))}
                      placeholder="e.g., 2024-25"
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplyAttempts">Attempts</Label>
                    <Input
                      id="supplyAttempts"
                      type="number"
                      min="1"
                      value={newSupply.attempts}
                      onChange={(e) => setNewSupply(prev => ({ ...prev, attempts: parseInt(e.target.value) }))}
                      placeholder="Number of attempts"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button onClick={addSupply} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Supply Subject
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                {(formData.supplies || []).map((supply, index) => (
                  <Card key={index} className="relative">
                    <CardContent className="pt-6">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                          onClick={() => removeSupply(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-lg">{supply.subject}</h4>
                          <Badge variant="outline">Semester {supply.semester}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Academic Year:</span> {supply.academicYear}
                          </div>
                          <div>
                            <span className="font-medium">Attempts:</span> {supply.attempts}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(formData.supplies || []).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No supply subjects recorded</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Placement Tab */}
        <TabsContent value="placement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Placement Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="placementStatus">Placement Status</Label>
                <Select 
                  value={formData.placementStatus || ''} 
                  onValueChange={(value) => handleInputChange('placementStatus', value)}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select placement status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLACED">Placed</SelectItem>
                    <SelectItem value="NOT_PLACED">Not Placed</SelectItem>
                    <SelectItem value="HIGHER_STUDIES">Higher Studies</SelectItem>
                    <SelectItem value="ENTREPRENEUR">Entrepreneur</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.placementStatus === 'PLACED' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="placementCompany">Company</Label>
                    <Input
                      id="placementCompany"
                      value={formData.placementDetails?.company || ''}
                      onChange={(e) => handleInputChange('placementDetails', {
                        ...formData.placementDetails,
                        company: e.target.value
                      })}
                      placeholder="Company name"
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <Label htmlFor="placementRole">Role</Label>
                    <Input
                      id="placementRole"
                      value={formData.placementDetails?.role || ''}
                      onChange={(e) => handleInputChange('placementDetails', {
                        ...formData.placementDetails,
                        role: e.target.value
                      })}
                      placeholder="Job role"
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <Label htmlFor="placementPackage">Package (LPA)</Label>
                    <Input
                      id="placementPackage"
                      type="number"
                      value={formData.placementDetails?.package || ''}
                      onChange={(e) => handleInputChange('placementDetails', {
                        ...formData.placementDetails,
                        package: parseFloat(e.target.value)
                      })}
                      placeholder="e.g., 8.5"
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <Label htmlFor="placementDate">Placement Date</Label>
                    <Input
                      id="placementDate"
                      type="date"
                      value={formData.placementDetails?.date || ''}
                      onChange={(e) => handleInputChange('placementDetails', {
                        ...formData.placementDetails,
                        date: e.target.value
                      })}
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentProfileForm; 