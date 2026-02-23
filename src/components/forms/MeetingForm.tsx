
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { X, Calendar, Clock, MapPin, Users } from 'lucide-react';

interface MeetingFormProps {
  onSubmit: (meetingData: any) => void;
  onClose: () => void;
  editMeeting?: any;
}

const MeetingForm: React.FC<MeetingFormProps> = ({ onSubmit, onClose, editMeeting }) => {
  const [formData, setFormData] = useState({
    title: editMeeting?.title || '',
    description: editMeeting?.description || '',
    date: editMeeting?.date || '',
    time: editMeeting?.time || '',
    location: editMeeting?.location || '',
    attendees: editMeeting?.attendees || [],
    agenda: editMeeting?.agenda || ''
  });

  const attendeeOptions = [
    'Coordinators',
    'CRs',
    'Faculty',
    'HOD',
    'All Faculty',
    'Department Staff'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const meetingData = {
      ...formData,
      id: editMeeting?.id || Date.now().toString(),
      scheduledBy: 'Dr. Rajesh Kumar (HOD)',
      status: 'SCHEDULED',
      dateTime: `${formData.date} ${formData.time}`
    };
    onSubmit(meetingData);
    onClose();
  };

  const handleAttendeeChange = (attendee: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.includes(attendee)
        ? prev.attendees.filter((a: string) => a !== attendee)
        : [...prev.attendees, attendee]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>{editMeeting ? 'Edit Meeting' : 'Schedule New Meeting'}</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Meeting Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter meeting title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Conference Room A"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Attendees *</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {attendeeOptions.map((attendee) => (
                  <label key={attendee} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.attendees.includes(attendee)}
                      onChange={() => handleAttendeeChange(attendee)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{attendee}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the meeting"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agenda">Agenda</Label>
              <Textarea
                id="agenda"
                value={formData.agenda}
                onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                placeholder="Meeting agenda and topics to discuss"
                rows={4}
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button type="submit" className="flex-1">
                {editMeeting ? 'Update Meeting' : 'Schedule Meeting'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MeetingForm;
