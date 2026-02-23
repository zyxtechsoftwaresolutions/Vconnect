import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Plus, Edit, Trash2, Clock, Users, MapPin, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Department } from '../types/user';
import { facultyAssignmentService, FacultyAssignment } from '../services/facultyAssignmentService';
import FacultyAssignmentForm from '../components/forms/FacultyAssignmentForm';
import { TableLoader } from '../components/ui/loader';

const FacultyAssignments: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<FacultyAssignment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<FacultyAssignment | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAssignments();
  }, [user]);

  const loadAssignments = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let allAssignments: FacultyAssignment[];
      if (user.role === 'ADMIN' || user.role === 'PRINCIPAL') {
        allAssignments = await facultyAssignmentService.getAllAssignments();
      } else if (user.department) {
        allAssignments = await facultyAssignmentService.getAssignmentsByDepartment(user.department);
      } else {
        allAssignments = [];
      }

      setAssignments(allAssignments);
    } catch (error) {
      console.error('Error loading assignments:', error);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = (assignment: FacultyAssignment) => {
    setAssignments(prev => [...prev, assignment]);
    setShowForm(false);
  };

  const handleEditAssignment = (assignment: FacultyAssignment) => {
    setAssignments(prev => 
      prev.map(a => a.id === assignment.id ? assignment : a)
    );
    setShowForm(false);
    setEditingAssignment(undefined);
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (window.confirm('Are you sure you want to delete this assignment?')) {
      try {
        const success = await facultyAssignmentService.removeAssignment(assignmentId);
        if (success) {
          setAssignments(prev => prev.filter(a => a.id !== assignmentId));
        }
      } catch (error) {
        console.error('Error deleting assignment:', error);
      }
    }
  };

  const handleEdit = (assignment: FacultyAssignment) => {
    setEditingAssignment(assignment);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAssignment(undefined);
  };

  const getTimeSlotColor = (period: number) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-yellow-100 text-yellow-800',
      'bg-purple-100 text-purple-800',
      'bg-red-100 text-red-800',
      'bg-indigo-100 text-indigo-800',
      'bg-pink-100 text-pink-800'
    ];
    return colors[period % colors.length];
  };

  const getDayColor = (day: string) => {
    const dayColors: { [key: string]: string } = {
      'Monday': 'bg-blue-50 border-blue-200',
      'Tuesday': 'bg-green-50 border-green-200',
      'Wednesday': 'bg-yellow-50 border-yellow-200',
      'Thursday': 'bg-purple-50 border-purple-200',
      'Friday': 'bg-red-50 border-red-200',
      'Saturday': 'bg-indigo-50 border-indigo-200'
    };
    return dayColors[day] || 'bg-gray-50 border-gray-200';
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Please log in to view faculty assignments</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Faculty Assignments
            {user.department && user.role !== 'ADMIN' && user.role !== 'PRINCIPAL' && (
              <span className="text-lg font-normal text-gray-600 ml-2">
                - {user.department} Department
              </span>
            )}
          </h1>
          <p className="text-gray-600 mt-2">
            Manage faculty assignments and detect scheduling conflicts
          </p>
        </div>
        {(user.role === 'HOD' || user.role === 'ADMIN' || user.role === 'PRINCIPAL') && (
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Assignment
          </Button>
        )}
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12">
            <TableLoader />
          </CardContent>
        </Card>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Faculty Assignments</h3>
            <p className="text-gray-600 mb-4">
              {user.department && user.role !== 'ADMIN' && user.role !== 'PRINCIPAL'
                ? `No faculty assignments found for ${user.department} department.`
                : 'No faculty assignments found.'}
            </p>
            {(user.role === 'HOD' || user.role === 'ADMIN' || user.role === 'PRINCIPAL') && (
              <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add First Assignment
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
            const dayAssignments = assignments.filter(a => a.day === day);
            if (dayAssignments.length === 0) return null;

            return (
              <Card key={day} className={getDayColor(day)}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {day}
                    <Badge variant="secondary" className="ml-2">
                      {dayAssignments.length} assignment{dayAssignments.length !== 1 ? 's' : ''}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {dayAssignments
                      .sort((a, b) => a.period - b.period)
                      .map(assignment => (
                        <div
                          key={assignment.id}
                          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Badge className={getTimeSlotColor(assignment.period)}>
                                Period {assignment.period + 1}
                              </Badge>
                              <span className="text-sm text-gray-600 font-medium">
                                {assignment.timeSlot}
                              </span>
                            </div>
                            {(user.role === 'HOD' || user.role === 'ADMIN' || user.role === 'PRINCIPAL') && (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(assignment)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteAssignment(assignment.id)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {assignment.facultyName}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {assignment.department}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {assignment.subject}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {assignment.class}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-900">
                                {assignment.room}
                              </span>
                            </div>

                            <div className="text-right">
                              <p className="text-xs text-gray-500">
                                Created: {assignment.createdAt.toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showForm && (
        <FacultyAssignmentForm
          onSubmit={editingAssignment ? handleEditAssignment : handleAddAssignment}
          onClose={handleCloseForm}
          editAssignment={editingAssignment}
          userDepartment={user.department}
        />
      )}
    </div>
  );
};

export default FacultyAssignments; 