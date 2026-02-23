
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Plus, Search, Calendar, Clock, MapPin, Users, Edit, Trash2, Eye, AlertCircle } from 'lucide-react';
import MeetingForm from '../components/forms/MeetingForm';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Meeting {
  id: string;
  title: string;
  description: string;
  scheduledBy: string;
  scheduled_by?: string;
  attendees: string[] | number[];
  date: string;
  time: string;
  dateTime: string;
  date_time: string;
  location: string;
  status: string;
  agenda?: string;
  meeting_type?: string;
}

const Meetings: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<any>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMeetings();
  }, [user]);

  const loadMeetings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('meetings')
        .select(`
          *,
          scheduled_by_user:users!scheduled_by(id, name, role)
        `)
        .order('date_time', { ascending: false });

      // Filter by department if user is not admin/principal
      if (user && user.role !== 'ADMIN' && user.role !== 'PRINCIPAL' && user.department) {
        // Get meetings where user is in attendees or department matches
        query = query.contains('attendees', [user.id]);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading meetings:', error);
        setMeetings([]);
        return;
      }

      const meetingsList: Meeting[] = (data || []).map((meeting: any) => {
        const dateTime = new Date(meeting.date_time);
        return {
          id: meeting.id,
          title: meeting.title,
          description: meeting.description || '',
          scheduledBy: meeting.scheduled_by_user?.name || user?.name || 'Unknown',
          attendees: Array.isArray(meeting.attendees) ? meeting.attendees : [],
          date: dateTime.toISOString().split('T')[0],
          time: dateTime.toTimeString().slice(0, 5),
          dateTime: dateTime.toLocaleString(),
          location: meeting.location || '',
          status: meeting.status || 'SCHEDULED',
          agenda: meeting.agenda || '',
          meeting_type: meeting.meeting_type
        };
      });

      setMeetings(meetingsList);
    } catch (error) {
      console.error('Error loading meetings:', error);
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredMeetings = meetings.filter(m => 
    m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddMeeting = async (meetingData: any) => {
    try {
      const dateTime = new Date(`${meetingData.date}T${meetingData.time}`);
      const { data, error } = await supabase
        .from('meetings')
        .insert([{
          title: meetingData.title,
          description: meetingData.description,
          scheduled_by: user?.id,
          attendees: meetingData.attendees || [],
          date_time: dateTime.toISOString(),
          location: meetingData.location,
          status: 'SCHEDULED',
          agenda: meetingData.agenda,
          meeting_type: meetingData.meeting_type
        }])
        .select()
        .single();

      if (error) throw error;
      
      await loadMeetings();
      setShowMeetingForm(false);
    } catch (error) {
      console.error('Error creating meeting:', error);
    }
  };

  const handleEditMeeting = async (meetingData: any) => {
    try {
      const dateTime = new Date(`${meetingData.date}T${meetingData.time}`);
      const { error } = await supabase
        .from('meetings')
        .update({
          title: meetingData.title,
          description: meetingData.description,
          attendees: meetingData.attendees || [],
          date_time: dateTime.toISOString(),
          location: meetingData.location,
          status: meetingData.status,
          agenda: meetingData.agenda,
          meeting_type: meetingData.meeting_type
        })
        .eq('id', meetingData.id);

      if (error) throw error;
      
      await loadMeetings();
      setEditingMeeting(null);
      setShowMeetingForm(false);
    } catch (error) {
      console.error('Error updating meeting:', error);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (window.confirm('Are you sure you want to delete this meeting?')) {
      try {
        const { error } = await supabase
          .from('meetings')
          .delete()
          .eq('id', meetingId);

        if (error) throw error;
        
        await loadMeetings();
      } catch (error) {
        console.error('Error deleting meeting:', error);
      }
    }
  };

  const handleCancelMeeting = async (meetingId: string) => {
    if (window.confirm('Are you sure you want to cancel this meeting?')) {
      try {
        const { error } = await supabase
          .from('meetings')
          .update({ status: 'CANCELLED' })
          .eq('id', meetingId);

        if (error) throw error;
        
        await loadMeetings();
      } catch (error) {
        console.error('Error cancelling meeting:', error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Check if user can schedule meetings
  const canScheduleMeetings = user && (
    user.role === 'HOD' || 
    user.role === 'ADMIN' || 
    user.role === 'PRINCIPAL'
  );

  // Check if user can manage meetings
  const canManageMeetings = user && (
    user.role === 'HOD' || 
    user.role === 'ADMIN' || 
    user.role === 'PRINCIPAL'
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meeting Management</h1>
          <p className="text-gray-600">Schedule and manage meetings</p>
        </div>
        {canScheduleMeetings ? (
          <Button 
            className="flex items-center space-x-2"
            onClick={() => setShowMeetingForm(true)}
          >
            <Plus className="h-4 w-4" />
            <span>Schedule Meeting</span>
          </Button>
        ) : (
          <div className="flex items-center space-x-2 text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Only HOD, Admin, and Principal can schedule meetings</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {meetings.filter(m => m.status === 'SCHEDULED').length}
                </p>
                <p className="text-sm text-gray-600">Upcoming Meetings</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {meetings.filter(m => m.status === 'COMPLETED').length}
                </p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {meetings.reduce((total, m) => total + m.attendees.length, 0)}
                </p>
                <p className="text-sm text-gray-600">Total Attendees</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Meetings ({filteredMeetings.length})</CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search meetings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading meetings...</div>
          ) : filteredMeetings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No meetings found</div>
          ) : (
            <div className="space-y-4">
              {filteredMeetings.map((meeting) => (
              <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{meeting.title}</h3>
                      <p className="text-gray-600 mt-1">{meeting.description}</p>
                    </div>
                    <Badge className={getStatusColor(meeting.status)}>
                      {meeting.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{meeting.dateTime}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{meeting.location}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>{meeting.attendees.join(', ')}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Scheduled by: </span>
                      <span className="font-medium">{meeting.scheduledBy}</span>
                    </div>
                  </div>

                  {meeting.agenda && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 font-medium">Agenda:</p>
                      <p className="text-sm text-gray-700">{meeting.agenda}</p>
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" title="View Details">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {canManageMeetings && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingMeeting(meeting);
                            setShowMeetingForm(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        {meeting.status === 'SCHEDULED' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-600"
                            onClick={() => handleCancelMeeting(meeting.id)}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600"
                          onClick={() => handleDeleteMeeting(meeting.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showMeetingForm && (
        <MeetingForm
          onSubmit={editingMeeting ? handleEditMeeting : handleAddMeeting}
          onClose={() => {
            setShowMeetingForm(false);
            setEditingMeeting(null);
          }}
          editMeeting={editingMeeting}
        />
      )}
    </div>
  );
};

export default Meetings;
