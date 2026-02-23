
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { studentService, StudentData } from '../services/studentService';
import { searchStudents } from '../services/studentService';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../lib/supabase';
import DashboardStats from '../components/dashboard/DashboardStats';
import WelcomeCarousel from '../components/dashboard/WelcomeCarousel';
import DepartmentTechNews from '../components/dashboard/DepartmentTechNews';
import LibrarySection from '../components/dashboard/LibrarySection';
import MentorDetails from '../components/mentees/MentorDetails';
import PieCharts from '../components/dashboard/PieCharts';
import AcademicCurriculum from '../components/dashboard/AcademicCurriculum';
import StudentProfileModal from '../components/modals/StudentProfileModal';
import StudentTransferManager from '../components/StudentTransferManager';
import StudentSearchModal from '../components/search/StudentSearchModal';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Bell, Calendar, AlertTriangle, BookOpen, User, Home, Bus, Search, Loader2 } from 'lucide-react';
import { UserRole, Department } from '../types/user';
import LibrarianDashboard from '../components/dashboard/LibrarianDashboard';
import AccountantDashboard from '../components/dashboard/AccountantDashboard';
import ExamCellCoordinatorDashboard from '../components/dashboard/ExamCellCoordinatorDashboard';
import DashboardGroups from '../components/dashboard/DashboardGroups';

import { CardLoader } from '../components/ui/loader';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStudent, setCurrentStudent] = useState<StudentData | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [dashboardSearchTerm, setDashboardSearchTerm] = useState('');
  const [dashboardSearchResults, setDashboardSearchResults] = useState<StudentData[]>([]);
  const [dashboardSearching, setDashboardSearching] = useState(false);
  const [showFullSearchModal, setShowFullSearchModal] = useState(false);

  useEffect(() => {
    const loadCurrentStudent = async () => {
      if (user && (user.role === UserRole.STUDENT || user.role === UserRole.CR)) {
        setLoading(true);
        try {
          const studentData = await supabaseService.getStudentByEmail(user.email);
          if (studentData) {
            setCurrentStudent(studentData);
                  } else {
          setCurrentStudent(null);
        }
        } catch (error) {
          console.error('Error loading student data:', error);
          setCurrentStudent(null);
        } finally {
          setLoading(false);
        }
      }
    };

    loadCurrentStudent();
  }, [user]);

  if (!user) {
    return <div>Loading...</div>;
  }

  // Show librarian dashboard for librarian users
  if (user.role === UserRole.LIBRARIAN) {
    return <LibrarianDashboard />;
  }

  // Show accountant dashboard for accountant users
  if (user.role === UserRole.ACCOUNTANT) {
    return <AccountantDashboard />;
  }

  // Show exam cell coordinator dashboard
  if (user.role === UserRole.EXAM_CELL_COORDINATOR) {
    return <ExamCellCoordinatorDashboard />;
  }

  // Get user's department for department-specific content
  const userDepartment = user.department || Department.CSE;


  useEffect(() => {
    const loadNotifications = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('notifications')
        .select('id,title,message,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) {
        console.warn('Failed to load notifications:', error.message);
        setNotifications([]);
        return;
      }
      setNotifications(data || []);
    };
    loadNotifications();
  }, [user]);

  const handleViewFullProfile = () => {
    if (currentStudent) {
      setIsProfileModalOpen(true);
    }
  };

  const handleSaveProfile = async (updatedStudent: StudentData) => {
    try {
      // Update in the database first
      const result = await supabaseService.updateStudent(updatedStudent.id, updatedStudent);
      
      if (result) {
        // Update the current student data
        setCurrentStudent(updatedStudent);
      } else {
        console.error('Failed to update student in database');
      }
    } catch (error) {
      console.error('Error updating student:', error);
    }
  };


  const handleDashboardSearch = async () => {
    const term = dashboardSearchTerm.trim();
    if (!term) {
      setDashboardSearchResults([]);
      return;
    }
    setDashboardSearching(true);
    try {
      const results = await searchStudents(term);
      setDashboardSearchResults(results);
    } catch (err) {
      console.error('Dashboard search error:', err);
      setDashboardSearchResults([]);
    } finally {
      setDashboardSearching(false);
    }
  };

  const isStudentOrCR = user?.role === UserRole.STUDENT || user?.role === UserRole.CR;
  const isStudentOnly = user?.role === UserRole.STUDENT;
  const showSearchBar = !isStudentOnly;

  return (
    <div className="space-y-6">
      {/* Welcome Carousel */}
      <WelcomeCarousel userName={user?.name || ''} userRole={user?.role || ''} />

      {/* Student Search Bar - visible for all roles except STUDENT */}
      {showSearchBar && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5 text-blue-600" />
              <span>Student Search</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by roll number, name, email, or class..."
                  value={dashboardSearchTerm}
                  onChange={(e) => {
                    setDashboardSearchTerm(e.target.value);
                    if (!e.target.value.trim()) setDashboardSearchResults([]);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleDashboardSearch()}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleDashboardSearch} disabled={dashboardSearching} className="flex-1 sm:flex-none">
                  {dashboardSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowFullSearchModal(true)} className="flex-1 sm:flex-none">
                  Advanced
                </Button>
              </div>
            </div>

            {/* Inline Search Results */}
            {dashboardSearchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
                {dashboardSearchResults.slice(0, 8).map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition-colors gap-2"
                    onClick={() => {
                      setShowFullSearchModal(true);
                      setDashboardSearchTerm(student.registerId || student.name);
                    }}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
                        {student.name?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-sm truncate">{student.name}</h4>
                        <p className="text-xs text-gray-500 truncate">{student.registerId} &middot; {student.department} &middot; {student.class}</p>
                      </div>
                    </div>
                    <div className="text-right hidden sm:block shrink-0">
                      <p className="text-xs text-gray-500">{student.email}</p>
                      <p className="text-xs text-gray-400">{student.phoneNumber}</p>
                    </div>
                  </div>
                ))}
                {dashboardSearchResults.length > 8 && (
                  <div className="p-3 text-center">
                    <Button 
                      variant="link" 
                      size="sm" 
                      onClick={() => setShowFullSearchModal(true)}
                    >
                      View all {dashboardSearchResults.length} results
                    </Button>
                  </div>
                )}
              </div>
            )}

            {dashboardSearchTerm.trim() && !dashboardSearching && dashboardSearchResults.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-2">
                No students found matching "{dashboardSearchTerm}". Try a different search term.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <DashboardStats />

      {/* Mentor Details for Students and CRs — mentees see their mentor here */}
      {isStudentOrCR && currentStudent?.mentor && (
        <MentorDetails mentor={currentStudent.mentor as any} studentId={currentStudent.id} />
      )}
      {isStudentOrCR && currentStudent && !currentStudent.mentor && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>My Mentor</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">No mentor assigned yet. Your HOD or coordinator will assign one.</p>
          </CardContent>
        </Card>
      )}

      {/* Profile Quick Edit for Students and CRs (CRs are students with extra authority) */}
      {isStudentOrCR && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>My Profile</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Name</Label>
                <p className="text-sm text-gray-600">{user?.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Department</Label>
                <p className="text-sm text-gray-600">{user?.department}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Role</Label>
                <p className="text-sm text-gray-600">{user?.role === UserRole.CR ? 'Class Representative (Student)' : user?.role}</p>
              </div>
            </div>
            <div className="mt-4 flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
                Edit Profile
              </Button>
              <Button variant="outline" size="sm" onClick={handleViewFullProfile}>
                View Full Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Pie Charts */}
      <PieCharts 
        userRole={user?.role || UserRole.STUDENT}
        userDepartment={user?.department}
        isStudent={isStudentOrCR}
      />

      {/* My Groups Widget */}
      <DashboardGroups />

      {/* Student Transfer Manager for BS&H HODs and Admins */}
      {/* Temporarily disabled BS&H HOD check to fix login issues */}
      {user?.role === UserRole.ADMIN || 
       user?.role === UserRole.PRINCIPAL ? (
        <StudentTransferManager 
          onTransferComplete={() => {
            // Refresh dashboard data after transfer
            if (isStudentOrCR) {
              // Reload current student data if needed
            }
          }}
        />
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

        {/* Transportation & Accommodation Details for Students */}
        {isStudentOrCR && currentStudent ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {currentStudent.isHostler ? <Home className="h-5 w-5" /> : <Bus className="h-5 w-5" />}
                <span>{currentStudent.isHostler ? 'Hostel Accommodation' : 'Transport Details'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentStudent.isHostler && currentStudent.hostelDetails && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Home className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-600">Campus Hostel</span>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600"><span className="font-medium">Block:</span> {currentStudent.hostelDetails.block}</p>
                    <p className="text-sm text-gray-600"><span className="font-medium">Room:</span> {currentStudent.hostelDetails.roomNumber}</p>
                    <p className="text-sm text-gray-600"><span className="font-medium">Floor:</span> {currentStudent.hostelDetails.floor}</p>
                  </div>
                </div>
              )}
              {!currentStudent.isHostler && currentStudent.transportDetails && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Bus className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-600">Day Scholar Transport</span>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600"><span className="font-medium">Route:</span> {currentStudent.transportDetails.route}</p>
                    <p className="text-sm text-gray-600"><span className="font-medium">Stop:</span> {currentStudent.transportDetails.stop}</p>
                    {currentStudent.transportDetails.busNumber && (
                      <p className="text-sm text-gray-600"><span className="font-medium">Bus Number:</span> {currentStudent.transportDetails.busNumber}</p>
                    )}
                  </div>
                </div>
              )}
              <div className="mt-4 flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
                  Update Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : !isStudentOrCR ? (
          <DepartmentTechNews department={userDepartment} />
        ) : null}

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="text-sm text-gray-600">No recent activity yet.</div>
            ) : (
              <div className="space-y-4">
                {notifications.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="text-sm font-medium">{activity.title || activity.message}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Library Section for Students/Faculty */}
        {(user?.role === UserRole.STUDENT || user?.role === UserRole.FACULTY || user?.role === UserRole.CR) && (
          <LibrarySection />
        )}

        {/* Academic Curriculum */}
        <AcademicCurriculum 
          userRole={user?.role || UserRole.STUDENT}
          userDepartment={user?.department}
        />
      </div>

      {/* Student Profile Modal */}
      {currentStudent && (
        <StudentProfileModal
          student={currentStudent}
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          onSave={handleSaveProfile}
        />
      )}

      {/* Full Student Search Modal */}
      {showFullSearchModal && (
        <StudentSearchModal onClose={() => setShowFullSearchModal(false)} />
      )}
    </div>
  );
};

export default Dashboard;
