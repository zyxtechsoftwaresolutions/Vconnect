
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { X, Search, User, Phone, Mail, MapPin, Calendar, Award, AlertCircle, BookOpen, TrendingUp, Clock, Loader2, GraduationCap, CreditCard, Home, Bus, Heart, Users, Star, Trophy, Book, FileText, DollarSign, Building, Car, Shield, Edit } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { StudentData, getAllStudents, getStudentsByDepartment, searchStudents, getStudentById, updateStudent } from '../../services/studentService';
import StudentProfileModal from '../modals/StudentProfileModal';
import { TableLoader } from '../ui/loader';

// Import the global notification system
import { subscribeToStudentUpdates, notifyStudentUpdates } from '../../pages/Students';

interface StudentSearchModalProps {
  onClose: () => void;
}

const StudentSearchModal: React.FC<StudentSearchModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    loadStudents();
  }, [user]);

  // Subscribe to global student updates
  useEffect(() => {
    const unsubscribe = subscribeToStudentUpdates((updatedStudents) => {
      console.log('🔄 StudentSearchModal received update:', updatedStudents.length, 'students');
      setStudents(updatedStudents);
    });
    
    return unsubscribe;
  }, []);

  const loadStudents = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      let allStudents: StudentData[] = [];
      const fullAccessRoles = ['ADMIN', 'PRINCIPAL', 'ACCOUNTANT', 'LIBRARIAN'];
      if (fullAccessRoles.includes(user.role)) {
        allStudents = await getAllStudents();
      } else if (user.department) {
        allStudents = await getStudentsByDepartment(user.department);
      }

      console.log('📋 Loaded students from unified service:', allStudents);
      if (allStudents.length > 0) {
        console.log('🔍 First student sample data:', allStudents[0]);
      }

      setStudents(allStudents);
    } catch (err) {
      console.error('Error loading students:', err);
      // Fallback to empty array if functions fail
      setStudents([]);
      setError('Using fallback student data.');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => 
    (student.registerId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (student.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (student.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (student.class?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const handleStudentSelect = async (student: StudentData) => {
    console.log('🔍 Selected student data:', student);
    console.log('📊 Student fields check:');
    console.log('- registerId:', student.registerId);
    console.log('- phoneNumber:', student.phoneNumber);
    console.log('- fatherName:', student.fatherName);
    console.log('- motherName:', student.motherName);
    console.log('- address:', student.address);
    console.log('- skills:', student.skills);
    console.log('- languages:', student.languages);
    console.log('- hobbies:', student.hobbies);
    console.log('- isHostler:', student.isHostler);
    console.log('- transportDetails:', student.transportDetails);
    console.log('- hostelDetails:', student.hostelDetails);
    
    // Refresh student data to ensure we have the latest
    const freshStudent = await getStudentById(student.id);
    if (freshStudent) {
      setSelectedStudent(freshStudent);
      console.log('✅ Loaded fresh student data:', freshStudent.name);
    } else {
      setSelectedStudent(student);
    }
  };

  const handleEditProfile = () => {
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = async (updatedStudent: StudentData) => {
    try {
      console.log('🔄 Updating student profile in search modal...');
      
      // Update in the unified service (persists changes)
      const result = await updateStudent(updatedStudent.id, updatedStudent);
      
      if (result) {
        // Update the student in the local state
        setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
        setSelectedStudent(updatedStudent);
        console.log('Student profile updated successfully:', updatedStudent.name);
        
        // Notify all other components
        notifyStudentUpdates([updatedStudent]);
      } else {
        console.error('Failed to update student in unified service');
      }
    } catch (error) {
      console.error('Error updating student:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ISSUED': return 'text-blue-600';
      case 'RETURNED': return 'text-green-600';
      case 'OVERDUE': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAttendanceStatus = (percentage: number) => {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 75) return 'Good';
    if (percentage >= 60) return 'Below Average';
    return 'Poor';
  };

  const getAttendanceStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-100 text-green-800';
    if (percentage >= 75) return 'bg-blue-100 text-blue-800';
    if (percentage >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getFeeStatusColor = (status: string) => {
    switch(status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-800';
      case 'PENDING': return 'bg-orange-100 text-orange-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAchievementLevelColor = (level: string) => {
    switch(level) {
      case 'INTERNATIONAL': return 'bg-purple-100 text-purple-800';
      case 'NATIONAL': return 'bg-blue-100 text-blue-800';
      case 'STATE': return 'bg-green-100 text-green-800';
      case 'INSTITUTE': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAchievementCategoryColor = (category: string) => {
    switch(category) {
      case 'ACADEMIC': return 'bg-blue-100 text-blue-800';
      case 'SPORTS': return 'bg-green-100 text-green-800';
      case 'CULTURAL': return 'bg-purple-100 text-purple-800';
      case 'TECHNICAL': return 'bg-orange-100 text-orange-800';
      case 'LEADERSHIP': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const attendanceData = selectedStudent?.attendanceRecords?.map(record => ({
    month: record.month.substring(0, 3),
    attendance: record.percentage
  })) || [];

  const marksData = selectedStudent?.academicRecords?.flatMap(record =>
    record.subjects.map(subject => ({
      subject: subject.name,
      marks: subject.marks
    }))
  ) || [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-1 sm:p-4">
      <div className="bg-white rounded-lg w-full max-w-7xl max-h-[95vh] overflow-y-auto">
        <div className="p-3 sm:p-6 border-b flex justify-between items-center gap-2">
          <h2 className="text-lg sm:text-2xl font-bold truncate">Student Search</h2>
          <div className="flex gap-1 sm:gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={loadStudents} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-400 shrink-0" />
                <Input
                  placeholder="Search by ID, name, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Button 
              className="w-full sm:w-auto"
              onClick={() => {
                if (filteredStudents.length > 0) {
                  handleStudentSelect(filteredStudents[0]);
                }
              }}
              disabled={filteredStudents.length === 0}
            >
              Search
            </Button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading students...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
              <p className="text-red-600 mb-2">{error}</p>
              <Button onClick={loadStudents} variant="outline">
                Try Again
              </Button>
            </div>
          )}

          {/* Search Results */}
          {!loading && !error && searchTerm && filteredStudents.length > 0 && !selectedStudent && (
            <div className="mb-6">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Search Results ({filteredStudents.length})</h3>
              <div className="space-y-2">
                {filteredStudents.slice(0, 5).map((student) => (
                  <div
                    key={student.id}
                    onClick={() => handleStudentSelect(student)}
                    className="p-3 sm:p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                      <div>
                        <h4 className="font-medium text-sm sm:text-base">{student.name || 'N/A'}</h4>
                        <p className="text-xs sm:text-sm text-gray-600">{student.registerId || 'N/A'}</p>
                        <p className="text-xs sm:text-sm text-gray-600">{student.class || 'N/A'} • {student.department || 'N/A'}</p>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-xs sm:text-sm text-gray-600">{student.email || 'N/A'}</p>
                        <p className="text-xs sm:text-sm text-gray-600">{student.phoneNumber || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredStudents.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    Showing first 5 results. Click on a student to view details.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="py-8">
              <TableLoader />
            </div>
          )}

          {/* No Results */}
          {!loading && !error && searchTerm && filteredStudents.length === 0 && (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h3>
              <p className="text-gray-600">
                No students found matching "{searchTerm}". Try searching with a different term.
              </p>
            </div>
          )}

          {/* Selected Student Details */}
          {selectedStudent && (
            <div className="space-y-6">
              {/* Student Basic Info */}
              <Card>
                <CardHeader className="p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                      <User className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span>Student Information</span>
                    </CardTitle>
                    <Button onClick={handleEditProfile} variant="outline" size="sm" className="flex items-center space-x-2 w-full sm:w-auto">
                      <Edit className="h-4 w-4" />
                      <span>Edit Profile</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-semibold">{selectedStudent.name || 'N/A'}</h3>
                        <p className="text-blue-600 font-medium">{selectedStudent.registerId || 'N/A'}</p>
                        <p className="text-gray-600">{selectedStudent.class || 'N/A'} • {selectedStudent.department || 'N/A'}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{selectedStudent.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                                                  <span className="text-sm">{selectedStudent.phoneNumber || 'N/A'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">Regulation: {selectedStudent.regulation || 'N/A'}</span>
                      </div>
                        {selectedStudent.dateOfBirth && (
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">DOB: {selectedStudent.dateOfBirth}</span>
                          </div>
                        )}
                        {selectedStudent.bloodGroup && (
                          <div className="flex items-center space-x-2">
                            <Heart className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">Blood Group: {selectedStudent.bloodGroup}</span>
                          </div>
                        )}
                        {selectedStudent.gender && (
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">Gender: {selectedStudent.gender}</span>
                          </div>
                        )}
                        {selectedStudent.isHostler !== undefined && (
                          <div className="flex items-center space-x-2">
                            {selectedStudent.isHostler ? (
                              <>
                                <Home className="h-4 w-4 text-blue-600" />
                                <span className="text-sm text-blue-600 font-medium">Hostler (Campus Resident)</span>
                              </>
                            ) : (
                              <>
                                <Bus className="h-4 w-4 text-green-600" />
                                <span className="text-sm text-green-600 font-medium">Day Scholar (Commuter)</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Attendance Overview</h4>
                        <div className="flex items-center space-x-2 mb-2">
                                                <Progress value={selectedStudent.attendance ? parseFloat(selectedStudent.attendance.replace('%', '')) : 0} className="flex-1" />
                      <span className="text-sm font-medium">{selectedStudent.attendance || 'N/A'}</span>
                    </div>
                    <Badge className={selectedStudent.attendance ? getAttendanceStatusColor(parseFloat(selectedStudent.attendance.replace('%', ''))) : 'bg-gray-100 text-gray-800'}>
                      {selectedStudent.attendance ? getAttendanceStatus(parseFloat(selectedStudent.attendance.replace('%', ''))) : 'N/A'}
                    </Badge>
                      </div>
                      {selectedStudent.placementStatus && (
                        <div>
                          <h4 className="font-medium mb-2">Placement Status</h4>
                          <Badge className={selectedStudent.placementStatus === 'PLACED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                            {selectedStudent.placementStatus}
                          </Badge>
                          {selectedStudent.placementDetails?.company && (
                            <p className="text-sm text-gray-600 mt-1">
                              {selectedStudent.placementDetails.company} - ₹{selectedStudent.placementDetails.package?.toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      {selectedStudent.mentor && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center space-x-2">
                            <Users className="h-4 w-4" />
                            <span>Mentor</span>
                          </h4>
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="font-medium text-sm">{selectedStudent.mentor.name}</p>
                            <p className="text-sm text-gray-600">{selectedStudent.mentor.designation}</p>
                            <p className="text-sm text-gray-600">{selectedStudent.mentor.specialization}</p>
                            <p className="text-sm text-gray-600">{selectedStudent.mentor.email}</p>
                          </div>
                        </div>
                      )}
                      {selectedStudent.emergencyContact && (
                        <div>
                          <h4 className="font-medium mb-2">Emergency Contact</h4>
                          <div className="bg-red-50 p-3 rounded-lg">
                            <p className="font-medium text-sm">{selectedStudent.emergencyContact.name}</p>
                            <p className="text-sm text-gray-600">{selectedStudent.emergencyContact.relation}</p>
                            <p className="text-sm text-gray-600">{selectedStudent.emergencyContact.phone}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Comprehensive Student Details Tabs */}
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="flex flex-wrap h-auto gap-1 w-full justify-start">
                  <TabsTrigger value="personal" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5">Personal</TabsTrigger>
                  <TabsTrigger value="academic" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5">Academic</TabsTrigger>
                  <TabsTrigger value="attendance" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5">Attendance</TabsTrigger>
                  <TabsTrigger value="library" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5">Library</TabsTrigger>
                  <TabsTrigger value="achievements" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5">Achievements</TabsTrigger>
                  <TabsTrigger value="fees" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5">Fees</TabsTrigger>
                  <TabsTrigger value="placement" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5">Placement</TabsTrigger>
                  <TabsTrigger value="charts" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5">Charts</TabsTrigger>
                </TabsList>

                {/* Personal Information Tab */}
                <TabsContent value="personal" className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Family Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Users className="h-5 w-5" />
                          <span>Family Information</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {selectedStudent.fatherName && (
                          <div>
                            <h4 className="font-medium">Father's Details</h4>
                            <p className="text-sm text-gray-600">Name: {selectedStudent.fatherName}</p>
                            <p className="text-sm text-gray-600">Occupation: {selectedStudent.fatherOccupation}</p>
                            <p className="text-sm text-gray-600">Phone: {selectedStudent.fatherMobile}</p>
                          </div>
                        )}
                        {selectedStudent.motherName && (
                          <div>
                            <h4 className="font-medium">Mother's Details</h4>
                            <p className="text-sm text-gray-600">Name: {selectedStudent.motherName}</p>
                            <p className="text-sm text-gray-600">Occupation: {selectedStudent.motherOccupation}</p>
                            <p className="text-sm text-gray-600">Phone: {selectedStudent.motherMobile}</p>
                          </div>
                        )}
                        {selectedStudent.address && (
                          <div>
                            <h4 className="font-medium">Address</h4>
                            <p className="text-sm text-gray-600">{selectedStudent.address}</p>
                          </div>
                        )}
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
                        {selectedStudent.apaarId && (
                          <div>
                            <h4 className="font-medium">APAAR ID</h4>
                            <p className="text-sm text-gray-600">{selectedStudent.apaarId}</p>
                          </div>
                        )}
                        {selectedStudent.aadharId && (
                          <div>
                            <h4 className="font-medium">Aadhar ID</h4>
                            <p className="text-sm text-gray-600">{selectedStudent.aadharId}</p>
                          </div>
                        )}
                        {selectedStudent.seatQuota && (
                          <div>
                            <h4 className="font-medium">Seat Quota</h4>
                            <p className="text-sm text-gray-600">{selectedStudent.seatQuota}</p>
                          </div>
                        )}
                        {selectedStudent.caste && (
                          <div>
                            <h4 className="font-medium">Caste</h4>
                            <p className="text-sm text-gray-600">{selectedStudent.caste}</p>
                          </div>
                        )}
                        {selectedStudent.healthIssues && (
                          <div>
                            <h4 className="font-medium">Health Issues</h4>
                            <p className="text-sm text-gray-600">{selectedStudent.healthIssues}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Accommodation Details */}
                    {((selectedStudent.isHostler && selectedStudent.hostelDetails) || (!selectedStudent.isHostler && selectedStudent.transportDetails)) && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            {selectedStudent.isHostler ? <Home className="h-5 w-5" /> : <Bus className="h-5 w-5" />}
                            <span>{selectedStudent.isHostler ? 'Hostel Accommodation' : 'Transport Details'}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {selectedStudent.isHostler && selectedStudent.hostelDetails && (
                            <div>
                              <div className="flex items-center space-x-2 mb-3">
                                <Home className="h-4 w-4 text-blue-600" />
                                <span className="font-medium text-blue-600">Campus Hostel</span>
                              </div>
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <p className="text-sm text-gray-600"><span className="font-medium">Block:</span> {selectedStudent.hostelDetails.block}</p>
                                <p className="text-sm text-gray-600"><span className="font-medium">Room:</span> {selectedStudent.hostelDetails.roomNumber}</p>
                                <p className="text-sm text-gray-600"><span className="font-medium">Floor:</span> {selectedStudent.hostelDetails.floor}</p>
                              </div>
                            </div>
                          )}
                          {!selectedStudent.isHostler && selectedStudent.transportDetails && (
                            <div>
                              <div className="flex items-center space-x-2 mb-3">
                                <Bus className="h-4 w-4 text-green-600" />
                                <span className="font-medium text-green-600">Day Scholar Transport</span>
                              </div>
                              <div className="bg-green-50 p-3 rounded-lg">
                                <p className="text-sm text-gray-600"><span className="font-medium">Route:</span> {selectedStudent.transportDetails.route}</p>
                                <p className="text-sm text-gray-600"><span className="font-medium">Stop:</span> {selectedStudent.transportDetails.stop}</p>
                                {selectedStudent.transportDetails.busNumber && (
                                  <p className="text-sm text-gray-600"><span className="font-medium">Bus Number:</span> {selectedStudent.transportDetails.busNumber}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Skills & Interests */}
                    {(selectedStudent.skills || selectedStudent.languages || selectedStudent.hobbies) && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <Star className="h-5 w-5" />
                            <span>Skills & Interests</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {selectedStudent.skills && selectedStudent.skills.length > 0 && (
                            <div>
                              <h4 className="font-medium">Skills</h4>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {selectedStudent.skills.map((skill, index) => (
                                  <Badge key={index} variant="secondary">{skill}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {selectedStudent.languages && selectedStudent.languages.length > 0 && (
                            <div>
                              <h4 className="font-medium">Languages</h4>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {selectedStudent.languages.map((language, index) => (
                                  <Badge key={index} variant="outline">{language}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {selectedStudent.hobbies && selectedStudent.hobbies.length > 0 && (
                            <div>
                              <h4 className="font-medium">Hobbies</h4>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {selectedStudent.hobbies.map((hobby, index) => (
                                  <Badge key={index} variant="outline">{hobby}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {selectedStudent.careerGoals && (
                            <div>
                              <h4 className="font-medium">Career Goals</h4>
                              <p className="text-sm text-gray-600">{selectedStudent.careerGoals}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                {/* Academic Information Tab */}
                <TabsContent value="academic" className="space-y-4">
                  {selectedStudent.academicRecords && selectedStudent.academicRecords.length > 0 ? (
                    <div className="space-y-4">
                      {selectedStudent.academicRecords.map((record, index) => (
                        <Card key={index}>
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <GraduationCap className="h-5 w-5" />
                              <span>{record.semester}</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                              <div className="text-center p-3 bg-blue-50 rounded-lg">
                                <p className="text-2xl font-bold text-blue-600">{record.sgpa}</p>
                                <p className="text-sm text-gray-600">SGPA</p>
                              </div>
                              <div className="text-center p-3 bg-green-50 rounded-lg">
                                <p className="text-2xl font-bold text-green-600">{record.cgpa}</p>
                                <p className="text-sm text-gray-600">CGPA</p>
                              </div>
                              <div className="text-center p-3 bg-purple-50 rounded-lg">
                                <p className="text-2xl font-bold text-purple-600">{record.totalCredits}</p>
                                <p className="text-sm text-gray-600">Total Credits</p>
                              </div>
                            </div>
                            <div className="overflow-x-auto -mx-3 sm:mx-0">
                          <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs sm:text-sm">Subject</TableHead>
                                  <TableHead className="text-xs sm:text-sm">Code</TableHead>
                                  <TableHead className="text-xs sm:text-sm">Credits</TableHead>
                                  <TableHead className="text-xs sm:text-sm">Grade</TableHead>
                                  <TableHead className="text-xs sm:text-sm">Marks</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {record.subjects.map((subject, subIndex) => (
                                  <TableRow key={subIndex}>
                                    <TableCell>{subject.name}</TableCell>
                                    <TableCell>{subject.code}</TableCell>
                                    <TableCell>{subject.credits}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline">{subject.grade}</Badge>
                                    </TableCell>
                                    <TableCell className="text-xs sm:text-sm">{subject.marks}%</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="text-center py-8">
                        <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No academic records available</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Attendance Tab */}
                <TabsContent value="attendance" className="space-y-4">
                  {selectedStudent.attendanceRecords && selectedStudent.attendanceRecords.length > 0 ? (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <TrendingUp className="h-5 w-5" />
                            <span>Monthly Attendance</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6">
                          <div className="overflow-x-auto -mx-3 sm:mx-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs sm:text-sm">Month</TableHead>
                                <TableHead className="text-xs sm:text-sm">Total</TableHead>
                                <TableHead className="text-xs sm:text-sm">Present</TableHead>
                                <TableHead className="text-xs sm:text-sm">%</TableHead>
                                <TableHead className="text-xs sm:text-sm">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedStudent.attendanceRecords.map((record, index) => (
                                <TableRow key={index}>
                                  <TableCell className="text-xs sm:text-sm">{record.month}</TableCell>
                                  <TableCell className="text-xs sm:text-sm">{record.totalDays}</TableCell>
                                  <TableCell className="text-xs sm:text-sm">{record.presentDays}</TableCell>
                                  <TableCell className="text-xs sm:text-sm">{record.percentage}%</TableCell>
                                  <TableCell>
                                    <Badge className={getAttendanceStatusColor(record.percentage)}>
                                      {getAttendanceStatus(record.percentage)}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="text-center py-8">
                        <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No attendance records available</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Library Tab */}
                <TabsContent value="library" className="space-y-4">
                  {selectedStudent.libraryRecords && selectedStudent.libraryRecords.length > 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <BookOpen className="h-5 w-5" />
                          <span>Library Records</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-6">
                        <div className="overflow-x-auto -mx-3 sm:mx-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs sm:text-sm">Book</TableHead>
                              <TableHead className="text-xs sm:text-sm">Author</TableHead>
                              <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Issue</TableHead>
                              <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Return</TableHead>
                              <TableHead className="text-xs sm:text-sm">Status</TableHead>
                              <TableHead className="text-xs sm:text-sm">Fine</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedStudent.libraryRecords.map((record, index) => (
                              <TableRow key={index}>
                                <TableCell className="text-xs sm:text-sm">{record.bookTitle}</TableCell>
                                <TableCell className="text-xs sm:text-sm">{record.author}</TableCell>
                                <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{record.issueDate}</TableCell>
                                <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{record.returnDate}</TableCell>
                                <TableCell>
                                  <Badge className={`${getStatusColor(record.status)} text-[10px] sm:text-xs`}>
                                    {record.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm">
                                  {record.fine ? `₹${record.fine}` : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="text-center py-8">
                        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No library records available</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Achievements Tab */}
                <TabsContent value="achievements" className="space-y-4">
                  {selectedStudent.achievements && selectedStudent.achievements.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedStudent.achievements.map((achievement, index) => (
                        <Card key={index}>
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <Trophy className="h-5 w-5 text-yellow-500" />
                              <span>{achievement.title}</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              <Badge className={getAchievementCategoryColor(achievement.category)}>
                                {achievement.category}
                              </Badge>
                              <Badge className={getAchievementLevelColor(achievement.level)}>
                                {achievement.level}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{achievement.description}</p>
                            <p className="text-sm text-gray-500">Date: {achievement.date}</p>
                            {achievement.certificate && (
                              <Button variant="outline" size="sm">
                                <FileText className="h-4 w-4 mr-2" />
                                View Certificate
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="text-center py-8">
                        <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No achievements recorded</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Fees Tab */}
                <TabsContent value="fees" className="space-y-4">
                  {selectedStudent.feeRecords && selectedStudent.feeRecords.length > 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <DollarSign className="h-5 w-5" />
                          <span>Fee Records</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-6">
                        <div className="overflow-x-auto -mx-3 sm:mx-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs sm:text-sm">Sem</TableHead>
                              <TableHead className="text-xs sm:text-sm">Total</TableHead>
                              <TableHead className="text-xs sm:text-sm">Paid</TableHead>
                              <TableHead className="text-xs sm:text-sm">Due</TableHead>
                              <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Due Date</TableHead>
                              <TableHead className="text-xs sm:text-sm">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedStudent.feeRecords.map((record, index) => (
                              <TableRow key={index}>
                                <TableCell className="text-xs sm:text-sm">{record.semester}</TableCell>
                                <TableCell className="text-xs sm:text-sm">₹{record.totalAmount.toLocaleString()}</TableCell>
                                <TableCell className="text-xs sm:text-sm">₹{record.paidAmount.toLocaleString()}</TableCell>
                                <TableCell className="text-xs sm:text-sm">₹{record.dueAmount.toLocaleString()}</TableCell>
                                <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{record.dueDate}</TableCell>
                                <TableCell>
                                  <Badge className={`${getFeeStatusColor(record.status)} text-[10px] sm:text-xs`}>
                                    {record.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="text-center py-8">
                        <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No fee records available</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Placement Tab */}
                <TabsContent value="placement" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Building className="h-5 w-5" />
                        <span>Placement Information</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedStudent.placementStatus ? (
                        <div className="space-y-4">
                          <div className="flex items-center space-x-4">
                            <Badge className={selectedStudent.placementStatus === 'PLACED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {selectedStudent.placementStatus}
                            </Badge>
                          </div>
                          {selectedStudent.placementDetails && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {selectedStudent.placementDetails.company && (
                                <div>
                                  <h4 className="font-medium">Company</h4>
                                  <p className="text-sm text-gray-600">{selectedStudent.placementDetails.company}</p>
                                </div>
                              )}
                              {selectedStudent.placementDetails.role && (
                                <div>
                                  <h4 className="font-medium">Role</h4>
                                  <p className="text-sm text-gray-600">{selectedStudent.placementDetails.role}</p>
                                </div>
                              )}
                              {selectedStudent.placementDetails.package && (
                                <div>
                                  <h4 className="font-medium">Package</h4>
                                  <p className="text-sm text-gray-600">₹{selectedStudent.placementDetails.package.toLocaleString()}</p>
                                </div>
                              )}
                              {selectedStudent.placementDetails.date && (
                                <div>
                                  <h4 className="font-medium">Placement Date</h4>
                                  <p className="text-sm text-gray-600">{selectedStudent.placementDetails.date}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">No placement information available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Charts Tab */}
                <TabsContent value="charts" className="space-y-4">
                  {attendanceData.length === 0 && marksData.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-8">
                        <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No chart data available for this student</p>
                      </CardContent>
                    </Card>
                  ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Attendance Chart */}
                    {attendanceData.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <TrendingUp className="h-5 w-5" />
                          <span>Attendance Trend</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={attendanceData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="attendance" stroke="#3b82f6" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                    )}

                    {/* Academic Performance */}
                    {marksData.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Award className="h-5 w-5" />
                          <span>Academic Performance</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={marksData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="subject" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="marks" fill="#10b981" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                    )}
                  </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2">
                <Button variant="outline" onClick={() => setSelectedStudent(null)} className="w-full sm:w-auto">
                  Back to Search
                </Button>
                <Button onClick={onClose} className="w-full sm:w-auto">
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Student Profile Modal */}
      <StudentProfileModal
        student={selectedStudent}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSave={handleSaveProfile}
      />
    </div>
  );
};

export default StudentSearchModal;
