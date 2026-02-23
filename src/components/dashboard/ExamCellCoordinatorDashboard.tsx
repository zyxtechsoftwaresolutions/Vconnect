import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { LayoutGrid, Building2, Calendar, ArrowRight, ClipboardList } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { databaseService } from '../../services/databaseService';

const ExamCellCoordinatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roomsCount, setRoomsCount] = useState(0);
  const [sessionsCount, setSessionsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [rooms, sessions] = await Promise.all([
          databaseService.getExamRooms(),
          databaseService.getExamSessions(),
        ]);
        setRoomsCount(rooms?.length ?? 0);
        setSessionsCount(sessions?.length ?? 0);
      } catch {
        setRoomsCount(0);
        setSessionsCount(0);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Exam Cell Coordinator Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Welcome back, {user?.name || 'Exam Cell Coordinator'}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{roomsCount}</p>
                    <p className="text-sm text-gray-600">Exam Rooms</p>
                  </div>
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{sessionsCount}</p>
                    <p className="text-sm text-gray-600">Exam Sessions</p>
                  </div>
                  <Calendar className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-2 border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LayoutGrid className="h-5 w-5 text-blue-600" />
                Exam Seating Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">
                Create exam sessions, manage rooms, select students by department, and generate seating with the rule that no two students from the same section sit on the same bench or in adjacent seats.
              </p>
              <Button
                onClick={() => navigate('/exam-seating')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Open Exam Seating
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-4 w-4" />
                Quick actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => navigate('/exam-seating')}>
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Exam Seating
                </Button>
                <Button variant="outline" onClick={() => navigate('/settings')}>
                  Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ExamCellCoordinatorDashboard;
