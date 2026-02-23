import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Users, Search, Download, Eye, User, GraduationCap, MessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/user';
import { databaseService } from '../../services/databaseService';

const MenteesSection: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [mentees, setMentees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [permissionRequests, setPermissionRequests] = useState<any[]>([]);

  useEffect(() => {
    loadMentees();
  }, [user?.id]);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const [leaves, perms] = await Promise.all([
        databaseService.getLeaveRequestsByMentor(user.id),
        databaseService.getPermissionRequestsByMentor(user.id),
      ]);
      setLeaveRequests(leaves || []);
      setPermissionRequests(perms || []);
    };
    load();
  }, [user?.id]);

  const loadMentees = async () => {
    if (!user?.id) {
      setMentees([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const list = await databaseService.getMenteesByMentor(user.id);
      setMentees(list);
    } catch (error) {
      console.error('Error loading mentees:', error);
      setMentees([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredMentees = mentees.filter((mentee) => {
    const name = (mentee.name || '').toLowerCase();
    const regId = (mentee.registerId || mentee.register_id || '').toLowerCase();
    const regulation = (mentee.regulation || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    return name.includes(term) || regId.includes(term) || regulation.includes(term);
  });

  const getAttendanceColor = (attendance: number | string) => {
    const n = Number(attendance);
    if (n >= 90) return 'text-green-600';
    if (n >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const exportMenteeData = (individual?: any) => {
    import('../../utils/exportUtils').then(({ exportToExcel }) => {
      const dataToExport = individual ? [individual] : filteredMentees;
      const formattedData = dataToExport.map(mentee => ({
        'Register ID': mentee.registerId,
        'Regulation': mentee.regulation,
        'Student Name': mentee.name,
        'Class': mentee.class,
        'Semester': mentee.semester,
        'Contact': mentee.contact,
        'Email': mentee.email,
        'Father Name': mentee.fatherName,
        'Mother Name': mentee.motherName,
        'Attendance %': mentee.attendance,
        'CGPA': mentee.cgpa,
        'Status': mentee.status,
        'Mentor': user?.name
      }));
      exportToExcel(formattedData, individual ? `mentee-${individual.registerId}` : 'all-mentees');
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-gray-600">Loading your mentees...</p>
        </div>
      </div>
    );
  }

  if (mentees.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-14 w-14 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">You are not assigned as a mentor</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              My Mentees is only available to faculty who have students assigned to them by HOD or above. If you should have mentees, please contact your HOD.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const toNum = (m: any) => {
    const raw = m.attendance_percentage ?? m.attendancePercentage ?? 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  };
  const avgAttendance = filteredMentees.length
    ? (filteredMentees.reduce((acc, m) => acc + toNum(m), 0) / filteredMentees.length).toFixed(1)
    : '0';
  const avgCgpa = filteredMentees.length
    ? (filteredMentees.reduce((acc, m) => acc + (Number(m.cgpa) || 0), 0) / filteredMentees.length).toFixed(1)
    : '0';
  const below75 = filteredMentees.filter((m) => toNum(m) < 75).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Mentees</h1>
          <p className="text-gray-600">Manage and monitor your assigned students</p>
        </div>
        <Button 
          onClick={() => exportMenteeData()}
          className="flex items-center space-x-2"
        >
          <Download className="h-4 w-4" />
          <span>Export All</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{filteredMentees.length}</p>
                <p className="text-sm text-gray-600">Total Mentees</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{avgAttendance}%</p>
                <p className="text-sm text-gray-600">Avg Attendance</p>
              </div>
              <GraduationCap className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">{avgCgpa}</p>
                <p className="text-sm text-gray-600">Avg CGPA</p>
              </div>
              <User className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-600">{below75}</p>
                <p className="text-sm text-gray-600">Below 75%</p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave & Permission Requests from mentees */}
      {(leaveRequests.length > 0 || permissionRequests.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Leave & Permission Requests</span>
            </CardTitle>
            <p className="text-sm text-gray-500 font-normal">Requests from your mentees — Accept or Reject</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {leaveRequests.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Leave requests</h4>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3">Student</th>
                        <th className="text-left p-3">Type</th>
                        <th className="text-left p-3">Start</th>
                        <th className="text-left p-3">End</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRequests.map((r: any) => (
                        <tr key={r.id} className="border-b">
                          <td className="p-3">{r.studentName || r.registerId || 'Student'}</td>
                          <td className="p-3">{r.type}</td>
                          <td className="p-3">{r.start_date}</td>
                          <td className="p-3">{r.end_date}</td>
                          <td className="p-3">
                            <Badge variant={r.status === 'APPROVED' ? 'default' : r.status === 'REJECTED' ? 'destructive' : 'secondary'}>{r.status}</Badge>
                          </td>
                          <td className="p-3">
                            {r.status === 'PENDING' && (
                              <span className="flex gap-1">
                                <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={async () => {
                                  await databaseService.updateLeaveRequestStatus(r.id, 'APPROVED');
                                  setLeaveRequests(prev => prev.map(x => x.id === r.id ? { ...x, status: 'APPROVED' } : x));
                                }}>Accept</Button>
                                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={async () => {
                                  await databaseService.updateLeaveRequestStatus(r.id, 'REJECTED');
                                  setLeaveRequests(prev => prev.map(x => x.id === r.id ? { ...x, status: 'REJECTED' } : x));
                                }}>Reject</Button>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {permissionRequests.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Permission requests</h4>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3">Student</th>
                        <th className="text-left p-3">Type</th>
                        <th className="text-left p-3">Date</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {permissionRequests.map((r: any) => (
                        <tr key={r.id} className="border-b">
                          <td className="p-3">{r.studentName || r.registerId || 'Student'}</td>
                          <td className="p-3">{r.type}</td>
                          <td className="p-3">{r.request_date}</td>
                          <td className="p-3">
                            <Badge variant={r.status === 'APPROVED' ? 'default' : r.status === 'REJECTED' ? 'destructive' : 'secondary'}>{r.status}</Badge>
                          </td>
                          <td className="p-3">
                            {r.status === 'PENDING' && (
                              <span className="flex gap-1">
                                <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={async () => {
                                  await databaseService.updatePermissionRequestStatus(r.id, 'APPROVED');
                                  setPermissionRequests(prev => prev.map(x => x.id === r.id ? { ...x, status: 'APPROVED' } : x));
                                }}>Accept</Button>
                                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={async () => {
                                  await databaseService.updatePermissionRequestStatus(r.id, 'REJECTED');
                                  setPermissionRequests(prev => prev.map(x => x.id === r.id ? { ...x, status: 'REJECTED' } : x));
                                }}>Reject</Button>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mentees List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Mentees List ({filteredMentees.length})</span>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search mentees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Register ID</th>
                  <th className="text-left p-4">Regulation</th>
                  <th className="text-left p-4">Student Name</th>
                  <th className="text-left p-4">Class</th>
                  <th className="text-left p-4">Contact</th>
                  <th className="text-left p-4">Attendance %</th>
                  <th className="text-left p-4">CGPA</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMentees.map((mentee) => {
                  const att = toNum(mentee);
                  return (
                  <tr key={mentee.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium text-blue-600">{mentee.registerId ?? mentee.register_id}</td>
                    <td className="p-4">
                      <Badge variant="outline">{mentee.regulation}</Badge>
                    </td>
                    <td className="p-4 font-medium">{mentee.name}</td>
                    <td className="p-4">{mentee.class ?? ''}</td>
                    <td className="p-4">{mentee.phoneNumber ?? mentee.phone_number ?? ''}</td>
                    <td className="p-4">
                      <span className={`font-bold ${getAttendanceColor(att)}`}>
                        {att}%
                      </span>
                    </td>
                    <td className="p-4 font-medium">{mentee.cgpa ?? '-'}</td>
                    <td className="p-4">
                      <Badge variant={mentee.status === 'Active' ? 'default' : 'secondary'}>
                        {mentee.status ?? 'Active'}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          title="Export Individual Data"
                          onClick={() => exportMenteeData(mentee)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MenteesSection;