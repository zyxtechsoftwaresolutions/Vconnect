import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Dialog, DialogContent, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { supabaseService } from '../services/supabaseService';
import { StudentData } from '../services/studentService';

import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { User, Bell, Shield, Eye, Download, FileText, Lock, Phone, MapPin, Calendar, Users, Building, GraduationCap, Home, Bus } from 'lucide-react';
import { UserRole, Department } from '../types/user';
import TwoFactorAuth from '../components/settings/TwoFactorAuth';
import PasswordChange from '../components/settings/PasswordChange';
import ProfilePictureUpload from '../components/profile/ProfilePictureUpload';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStudent, setCurrentStudent] = useState<StudentData | null>(null);
  const [notifications, setNotifications] = useState({
    email: true,
    sms: true,
    push: true,
    attendance: true,
    meetings: true
  });

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    emergencyContact: {
      name: '',
      relation: '',
      phone: ''
    },
    // Parents Information
    fatherName: '',
    fatherOccupation: '',
    fatherMobile: '',
    motherName: '',
    motherOccupation: '',
    motherMobile: '',
    // Student-specific fields
    registerId: '',
    regulation: '',
    class: '',
    department: user?.department || Department.CSE,
    // Transportation & Accommodation fields
    isHostler: false,
    hostelDetails: {
      block: '',
      roomNumber: '',
      floor: ''
    },
    transportDetails: {
      route: '',
      stop: '',
      busNumber: ''
    },
    // Faculty-specific fields
    employeeId: '',
    designation: '',
    officeLocation: '',
    officeHours: '',
    subjects: [] as string[],
    // Additional fields
    healthIssues: '',
    hobbies: [] as string[],
    skills: [] as string[],
    languages: [] as string[]
  });

  const [show2FA, setShow2FA] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newHobby, setNewHobby] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newLanguage, setNewLanguage] = useState('');

  // Load current student data when component mounts
  useEffect(() => {
    const loadCurrentStudent = async () => {
      if (user && (user.role === UserRole.STUDENT || user.role === UserRole.CR)) {
        try {
          // First try to get student by user_id (proper way)
          let studentData = await supabaseService.getStudentByUserId(user.id);
          
          // If not found, try by email
          if (!studentData) {
            studentData = await supabaseService.getStudentByEmail(user.email);
          }
          
          if (studentData) {
            setCurrentStudent(studentData);
            // Update profileData with current student data
            setProfileData(prev => ({
              ...prev,
              name: studentData.name || user.name || '',
              email: studentData.email || user.email || '',
              phone: studentData.phoneNumber || '',
              address: studentData.address || '',
              dateOfBirth: studentData.dateOfBirth || '',
              gender: studentData.gender || '',
              bloodGroup: studentData.bloodGroup || '',
              emergencyContact: studentData.emergencyContact || {
                name: '',
                relation: '',
                phone: ''
              },
              fatherName: studentData.fatherName || '',
              fatherOccupation: studentData.fatherOccupation || '',
              fatherMobile: studentData.fatherMobile || '',
              motherName: studentData.motherName || '',
              motherOccupation: studentData.motherOccupation || '',
              motherMobile: studentData.motherMobile || '',
              registerId: studentData.registerId || '',
              regulation: studentData.regulation || '',
              class: studentData.class || '',
              department: studentData.department || user.department || Department.CSE,
              isHostler: studentData.isHostler || false,
              hostelDetails: studentData.hostelDetails || {
                block: '',
                roomNumber: '',
                floor: ''
              },
              transportDetails: {
                route: studentData.transportDetails?.route || '',
                stop: studentData.transportDetails?.stop || '',
                busNumber: studentData.transportDetails?.busNumber || ''
              },
              healthIssues: studentData.healthIssues || '',
              hobbies: studentData.hobbies || [],
              skills: studentData.skills || [],
              languages: studentData.languages || []
            }));
          }
        } catch (error) {
          console.error('Error loading student data:', error);
        }
      }
    };

    loadCurrentStudent();
  }, [user]);

  const handleSaveProfile = async () => {

    if (!currentStudent) {

      // Try to fetch student data by user_id first, then by email
      try {
        let studentData = await supabaseService.getStudentByUserId(user?.id || '');

        if (!studentData) {
          studentData = await supabaseService.getStudentByEmail(user?.email || '');
        }

        if (studentData) {
          setCurrentStudent(studentData);

          // Continue with the save operation
          await performSave(studentData);
        } else {
          // Create a new student record if it doesn't exist
          const newStudentData = {
            userId: user?.id,
            name: profileData.name || user?.name || '',
            email: profileData.email || user?.email || '',
            registerId: profileData.registerId || `STU-${Date.now()}`,
            regulation: profileData.regulation || 'R23',
            class: profileData.class || '',
            department: profileData.department || user?.department || Department.CSE,
            phoneNumber: profileData.phone || '',
            address: profileData.address || '',
            dateOfBirth: profileData.dateOfBirth || '',
            gender: profileData.gender || 'MALE',
            bloodGroup: profileData.bloodGroup || '',
            emergencyContact: profileData.emergencyContact || { name: '', relation: '', phone: '' },
            fatherName: profileData.fatherName || '',
            fatherOccupation: profileData.fatherOccupation || '',
            fatherMobile: profileData.fatherMobile || '',
            motherName: profileData.motherName || '',
            motherOccupation: profileData.motherOccupation || '',
            motherMobile: profileData.motherMobile || '',
            isHostler: profileData.isHostler || false,
            hostelDetails: profileData.hostelDetails || { block: '', roomNumber: '', floor: '' },
            transportDetails: profileData.transportDetails || { route: '', stop: '', busNumber: '' },
            healthIssues: profileData.healthIssues || '',
            hobbies: profileData.hobbies || [],
            skills: profileData.skills || [],
            languages: profileData.languages || [],
            attendance: 'Present',
            attendancePercentage: 0,
            isActive: true
          };

          const createdStudent = await supabaseService.addStudent(newStudentData);

          if (createdStudent) {
            setCurrentStudent(createdStudent);
            await performSave(createdStudent);
          } else {
            console.error('❌ Failed to create student record');
            toast({
              title: "Error",
              description: "Failed to create student record. Please try again.",
              variant: "destructive"
            });
          }
        }
      } catch (error) {
        console.error('❌ Error fetching/creating student data:', error);
        toast({
          title: "Error",
          description: `Failed to load student data: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive"
        });
      }
      return;
    }

    await performSave(currentStudent);
  };

  const performSave = async (studentData: StudentData) => {
    try {

      // Create updated student data
      const updatedStudent: StudentData = {
        ...studentData,
        name: profileData.name,
        email: profileData.email,
        phoneNumber: profileData.phone,
        address: profileData.address,
        dateOfBirth: profileData.dateOfBirth,
        gender: profileData.gender as 'MALE' | 'FEMALE' | 'OTHER',
        bloodGroup: profileData.bloodGroup,
        emergencyContact: profileData.emergencyContact,
        fatherName: profileData.fatherName,
        fatherOccupation: profileData.fatherOccupation,
        fatherMobile: profileData.fatherMobile,
        motherName: profileData.motherName,
        motherOccupation: profileData.motherOccupation,
        motherMobile: profileData.motherMobile,
        registerId: profileData.registerId,
        regulation: profileData.regulation,
        class: profileData.class,
        department: profileData.department,
        isHostler: profileData.isHostler,
        hostelDetails: profileData.hostelDetails,
        transportDetails: profileData.transportDetails,
        healthIssues: profileData.healthIssues,
        hobbies: profileData.hobbies,
        skills: profileData.skills,
        languages: profileData.languages
      };

      // Save to database
      const result = await supabaseService.updateStudent(studentData.id, updatedStudent);

      if (result) {
        setCurrentStudent(updatedStudent);
        // Reload the profile data to reflect the changes
        const reloadedStudent = await supabaseService.getStudentByEmail(user.email);
        if (reloadedStudent) {
          setCurrentStudent(reloadedStudent);
          // Update profileData with the reloaded data
          setProfileData(prev => ({
            ...prev,
            name: reloadedStudent.name || user.name || '',
            email: reloadedStudent.email || user.email || '',
            phone: reloadedStudent.phoneNumber || '',
            address: reloadedStudent.address || '',
            dateOfBirth: reloadedStudent.dateOfBirth || '',
            gender: reloadedStudent.gender || '',
            bloodGroup: reloadedStudent.bloodGroup || '',
            emergencyContact: reloadedStudent.emergencyContact || {
              name: '',
              relation: '',
              phone: ''
            },
            fatherName: reloadedStudent.fatherName || '',
            fatherOccupation: reloadedStudent.fatherOccupation || '',
            fatherMobile: reloadedStudent.fatherMobile || '',
            motherName: reloadedStudent.motherName || '',
            motherOccupation: reloadedStudent.motherOccupation || '',
            motherMobile: reloadedStudent.motherMobile || '',
            registerId: reloadedStudent.registerId || '',
            regulation: reloadedStudent.regulation || '',
            class: reloadedStudent.class || '',
            department: reloadedStudent.department || user.department || Department.CSE,
            isHostler: reloadedStudent.isHostler || false,
            hostelDetails: reloadedStudent.hostelDetails || {
              block: '',
              roomNumber: '',
              floor: ''
            },
            transportDetails: reloadedStudent.transportDetails || {
              route: '',
              stop: '',
              busNumber: ''
            },
            healthIssues: reloadedStudent.healthIssues || '',
            hobbies: reloadedStudent.hobbies || [],
            skills: reloadedStudent.skills || [],
            languages: reloadedStudent.languages || [],
            achievements: reloadedStudent.achievements || [],
            supplies: reloadedStudent.supplies || []
          }));
        }
        toast({
          title: "Profile Updated",
          description: "Your profile information has been saved successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save profile changes. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Error updating student profile:', error);
      toast({
        title: "Error",
        description: "An error occurred while saving your profile. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleArrayFieldChange = (field: string, value: string, action: 'add' | 'remove', index?: number) => {
    const currentArray = (profileData[field as keyof typeof profileData] as string[]) || [];
    let newArray: string[];

    if (action === 'add') {
      newArray = [...currentArray, value];
    } else {
      newArray = currentArray.filter((_, i) => i !== index);
    }

    setProfileData(prev => ({ ...prev, [field]: newArray }));
  };

  const addHobby = () => {
    if (newHobby.trim()) {
      handleArrayFieldChange('hobbies', newHobby.trim(), 'add');
      setNewHobby('');
    }
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

  const handleExportData = async (format: 'excel' | 'pdf') => {
    try {
      const userData = {
        'Name': user?.name || '',
        'Email': user?.email || '',
        'Phone': profileData.phone,
        'Role': user?.role || '',
        'Department': user?.department || ''
      };

      if (format === 'excel') {
        await exportToExcel([userData], 'my_profile_data');
      } else {
        await exportToPDF([userData], 'my_profile_data', 'Profile Data Export');
      }

      toast({
        title: "Export Successful",
        description: `Your data has been exported to ${format.toUpperCase()} format.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export your data. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-xs sm:text-sm text-gray-600">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="profile" className="text-xs sm:text-sm px-2 py-1.5">Profile</TabsTrigger>
          <TabsTrigger value="security" className="text-xs sm:text-sm px-2 py-1.5">Security</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs sm:text-sm px-2 py-1.5">Notifications</TabsTrigger>
          <TabsTrigger value="data" className="text-xs sm:text-sm px-2 py-1.5">Data</TabsTrigger>
        </TabsList>

        {/* Profile Settings Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Profile Picture */}
          <Card>
            <CardContent className="py-6">
              <ProfilePictureUpload />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Basic Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="p-2 bg-gray-50 rounded border">
                    <span className="font-medium text-blue-600">{user?.role}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={profileData.dateOfBirth}
                    onChange={(e) => setProfileData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={profileData.gender} onValueChange={(value) => setProfileData(prev => ({ ...prev, gender: value }))}>
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

                <div className="space-y-2">
                  <Label htmlFor="bloodGroup">Blood Group</Label>
                  <Select value={profileData.bloodGroup} onValueChange={(value) => setProfileData(prev => ({ ...prev, bloodGroup: value }))}>
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
              </CardContent>
            </Card>

            {/* Contact & Address */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Contact & Address</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={profileData.address}
                    onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Enter your complete address"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyName">Emergency Contact Name</Label>
                  <Input
                    id="emergencyName"
                    value={profileData.emergencyContact.name}
                    onChange={(e) => setProfileData(prev => ({ 
                      ...prev, 
                      emergencyContact: { ...prev.emergencyContact, name: e.target.value }
                    }))}
                    placeholder="Emergency contact name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyRelation">Relation</Label>
                  <Input
                    id="emergencyRelation"
                    value={profileData.emergencyContact.relation}
                    onChange={(e) => setProfileData(prev => ({ 
                      ...prev, 
                      emergencyContact: { ...prev.emergencyContact, relation: e.target.value }
                    }))}
                    placeholder="e.g., Father, Mother, Guardian"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                  <Input
                    id="emergencyPhone"
                    value={profileData.emergencyContact.phone}
                    onChange={(e) => setProfileData(prev => ({ 
                      ...prev, 
                      emergencyContact: { ...prev.emergencyContact, phone: e.target.value }
                    }))}
                    placeholder="+91 XXXXXXXXXX"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Parents Information */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Parents Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fatherName">Father's Name</Label>
                    <Input
                      id="fatherName"
                      value={profileData.fatherName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, fatherName: e.target.value }))}
                      placeholder="Father's full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fatherOccupation">Father's Occupation</Label>
                    <Input
                      id="fatherOccupation"
                      value={profileData.fatherOccupation}
                      onChange={(e) => setProfileData(prev => ({ ...prev, fatherOccupation: e.target.value }))}
                      placeholder="Father's occupation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fatherMobile">Father's Mobile</Label>
                    <Input
                      id="fatherMobile"
                      value={profileData.fatherMobile}
                      onChange={(e) => setProfileData(prev => ({ ...prev, fatherMobile: e.target.value }))}
                      placeholder="+91 XXXXXXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="motherName">Mother's Name</Label>
                    <Input
                      id="motherName"
                      value={profileData.motherName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, motherName: e.target.value }))}
                      placeholder="Mother's full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="motherOccupation">Mother's Occupation</Label>
                    <Input
                      id="motherOccupation"
                      value={profileData.motherOccupation}
                      onChange={(e) => setProfileData(prev => ({ ...prev, motherOccupation: e.target.value }))}
                      placeholder="Mother's occupation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="motherMobile">Mother's Mobile</Label>
                    <Input
                      id="motherMobile"
                      value={profileData.motherMobile}
                      onChange={(e) => setProfileData(prev => ({ ...prev, motherMobile: e.target.value }))}
                      placeholder="+91 XXXXXXXXXX"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone">Emergency Phone</Label>
                  <Input
                    id="emergencyPhone"
                    value={profileData.emergencyContact.phone}
                    onChange={(e) => setProfileData(prev => ({ 
                      ...prev, 
                      emergencyContact: { ...prev.emergencyContact, phone: e.target.value }
                    }))}
                    placeholder="+91 9876543200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="healthIssues">Health Issues</Label>
                  <Textarea
                    id="healthIssues"
                    value={profileData.healthIssues}
                    onChange={(e) => setProfileData(prev => ({ ...prev, healthIssues: e.target.value }))}
                    placeholder="Any health issues or allergies"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Transportation & Accommodation Information */}
            {(user?.role === UserRole.STUDENT || user?.role === UserRole.CR) && (
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                    <Home className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>Transport & Accommodation</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isHostler"
                        checked={profileData.isHostler || false}
                        onCheckedChange={(checked) => setProfileData(prev => ({ ...prev, isHostler: checked }))}
                      />
                      <Label htmlFor="isHostler">Is Hostler (Campus Resident)</Label>
                    </div>
                  </div>

                  {profileData.isHostler ? (
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
                            value={profileData.hostelDetails?.block || ''}
                            onChange={(e) => setProfileData(prev => ({
                              ...prev,
                              hostelDetails: { ...prev.hostelDetails, block: e.target.value }
                            }))}
                            placeholder="e.g., A, B, C"
                          />
                        </div>
                        <div>
                          <Label htmlFor="hostelRoom">Room Number</Label>
                          <Input
                            id="hostelRoom"
                            value={profileData.hostelDetails?.roomNumber || ''}
                            onChange={(e) => setProfileData(prev => ({
                              ...prev,
                              hostelDetails: { ...prev.hostelDetails, roomNumber: e.target.value }
                            }))}
                            placeholder="e.g., A-101"
                          />
                        </div>
                        <div>
                          <Label htmlFor="hostelFloor">Floor</Label>
                          <Input
                            id="hostelFloor"
                            value={profileData.hostelDetails?.floor || ''}
                            onChange={(e) => setProfileData(prev => ({
                              ...prev,
                              hostelDetails: { ...prev.hostelDetails, floor: e.target.value }
                            }))}
                            placeholder="e.g., 1, 2, 3"
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
                            value={profileData.transportDetails?.route || ''}
                            onChange={(e) => setProfileData(prev => ({
                              ...prev,
                              transportDetails: { ...prev.transportDetails, route: e.target.value }
                            }))}
                            placeholder="e.g., Route 1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="transportStop">Stop</Label>
                          <Input
                            id="transportStop"
                            value={profileData.transportDetails?.stop || ''}
                            onChange={(e) => setProfileData(prev => ({
                              ...prev,
                              transportDetails: { ...prev.transportDetails, stop: e.target.value }
                            }))}
                            placeholder="e.g., Central Bus Stop"
                          />
                        </div>
                        <div>
                          <Label htmlFor="transportBus">Bus Number</Label>
                          <Input
                            id="transportBus"
                            value={profileData.transportDetails?.busNumber || ''}
                            onChange={(e) => setProfileData(prev => ({
                              ...prev,
                              transportDetails: { ...prev.transportDetails, busNumber: e.target.value }
                            }))}
                            placeholder="e.g., BUS-001"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {(user?.role === UserRole.FACULTY || user?.role === UserRole.HOD) && (
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                    <Building className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>Professional Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Employee ID</Label>
                    <Input
                      id="employeeId"
                      value={profileData.employeeId}
                      onChange={(e) => setProfileData(prev => ({ ...prev, employeeId: e.target.value }))}
                      placeholder="e.g., EMP001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation</Label>
                    <Input
                      id="designation"
                      value={profileData.designation}
                      onChange={(e) => setProfileData(prev => ({ ...prev, designation: e.target.value }))}
                      placeholder="e.g., Associate Professor"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="officeLocation">Office Location</Label>
                    <Input
                      id="officeLocation"
                      value={profileData.officeLocation}
                      onChange={(e) => setProfileData(prev => ({ ...prev, officeLocation: e.target.value }))}
                      placeholder="e.g., Block A, Room 205"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="officeHours">Office Hours</Label>
                    <Input
                      id="officeHours"
                      value={profileData.officeHours}
                      onChange={(e) => setProfileData(prev => ({ ...prev, officeHours: e.target.value }))}
                      placeholder="e.g., 9:00 AM - 5:00 PM"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Skills & Interests */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Skills & Interests</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Hobbies</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newHobby}
                      onChange={(e) => setNewHobby(e.target.value)}
                      placeholder="Add a hobby"
                      onKeyPress={(e) => e.key === 'Enter' && addHobby()}
                    />
                    <Button onClick={addHobby} size="sm">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profileData.hobbies.map((hobby, index) => (
                      <div key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                        {hobby}
                        <button
                          onClick={() => handleArrayFieldChange('hobbies', '', 'remove', index)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Skills</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Add a skill"
                      onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                    />
                    <Button onClick={addSkill} size="sm">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profileData.skills.map((skill, index) => (
                      <div key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                        {skill}
                        <button
                          onClick={() => handleArrayFieldChange('skills', '', 'remove', index)}
                          className="ml-2 text-green-600 hover:text-green-800"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Languages</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newLanguage}
                      onChange={(e) => setNewLanguage(e.target.value)}
                      placeholder="Add a language"
                      onKeyPress={(e) => e.key === 'Enter' && addLanguage()}
                    />
                    <Button onClick={addLanguage} size="sm">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profileData.languages.map((language, index) => (
                      <div key={index} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                        {language}
                        <button
                          onClick={() => handleArrayFieldChange('languages', '', 'remove', index)}
                          className="ml-2 text-purple-600 hover:text-purple-800"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} className="flex items-center space-x-2 w-full sm:w-auto">
              <User className="h-4 w-4" />
              <span>Save Profile Changes</span>
            </Button>
          </div>
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value="security" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Security Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Dialog open={showPasswordChange} onOpenChange={setShowPasswordChange}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center space-x-2">
                      <Lock className="h-4 w-4" />
                      <span>Change Password</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <PasswordChange onClose={() => setShowPasswordChange(false)} />
                  </DialogContent>
                </Dialog>
                
                <Dialog open={show2FA} onOpenChange={setShow2FA}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center space-x-2">
                      <Shield className="h-4 w-4" />
                      <span>Setup 2FA</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                    <TwoFactorAuth onClose={() => setShow2FA(false)} />
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings Tab */}
        <TabsContent value="notifications" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Notification Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {Object.entries(notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{key.charAt(0).toUpperCase() + key.slice(1)} Notifications</Label>
                      <p className="text-sm text-gray-500">Receive {key} notifications</p>
                    </div>
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, [key]: checked }))}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data & Privacy Tab */}
        <TabsContent value="data" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Data & Privacy</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm sm:text-base">Data Download (Excel)</p>
                  <p className="text-xs sm:text-sm text-gray-600">Download a copy of your data in Excel format</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => handleExportData('excel')}
                  className="flex items-center space-x-2 shrink-0 w-full sm:w-auto"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Excel</span>
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm sm:text-base">Data Export (PDF)</p>
                  <p className="text-xs sm:text-sm text-gray-600">Export your data in PDF format</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => handleExportData('pdf')}
                  className="flex items-center space-x-2 shrink-0 w-full sm:w-auto"
                >
                  <FileText className="h-4 w-4" />
                  <span>Export PDF</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;