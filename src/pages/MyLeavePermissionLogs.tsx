
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/user';
import { supabaseService } from '../services/supabaseService';
import { StudentData } from '../services/studentService';
import { databaseService } from '../services/databaseService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { FileText, Loader2 } from 'lucide-react';

const MyLeavePermissionLogs: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStudent, setCurrentStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaveLogs, setLeaveLogs] = useState<any[]>([]);
  const [permissionLogs, setPermissionLogs] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user || (user.role !== UserRole.STUDENT && user.role !== UserRole.CR)) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const studentData = await supabaseService.getStudentByEmail(user.email);
        if (studentData) {
          setCurrentStudent(studentData);
          const [leaves, perms] = await Promise.all([
            databaseService.getLeaveRequestsByStudent(studentData.id),
            databaseService.getPermissionRequestsByStudent(studentData.id),
          ]);
          setLeaveLogs(leaves || []);
          setPermissionLogs(perms || []);
        } else {
          setCurrentStudent(null);
          setLeaveLogs([]);
          setPermissionLogs([]);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setCurrentStudent(null);
        setLeaveLogs([]);
        setPermissionLogs([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (!user || (user.role !== UserRole.STUDENT && user.role !== UserRole.CR)) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentStudent) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">My Leave & Permission Logs</h1>
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Student profile not found. Please contact support.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Leave & Permission Logs</h1>
        <p className="text-gray-600 text-sm mt-1">View all your leave and permission requests and their status.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Leave requests</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaveLogs.length === 0 ? (
            <p className="text-sm text-gray-500">No leave requests yet.</p>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3">Type</th>
                    <th className="text-left p-3">Start</th>
                    <th className="text-left p-3">End</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveLogs.map((r: any) => (
                    <tr key={r.id} className="border-b">
                      <td className="p-3">{r.type}</td>
                      <td className="p-3">{r.start_date}</td>
                      <td className="p-3">{r.end_date}</td>
                      <td className="p-3">
                        <Badge variant={r.status === 'APPROVED' ? 'default' : r.status === 'REJECTED' ? 'destructive' : 'secondary'}>{r.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Permission requests</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {permissionLogs.length === 0 ? (
            <p className="text-sm text-gray-500">No permission requests yet.</p>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3">Type</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {permissionLogs.map((r: any) => (
                    <tr key={r.id} className="border-b">
                      <td className="p-3">{r.type}</td>
                      <td className="p-3">{r.request_date}</td>
                      <td className="p-3">
                        <Badge variant={r.status === 'APPROVED' ? 'default' : r.status === 'REJECTED' ? 'destructive' : 'secondary'}>{r.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyLeavePermissionLogs;
