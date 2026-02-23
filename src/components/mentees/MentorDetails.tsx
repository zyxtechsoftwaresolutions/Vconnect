import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock, 
  MessageSquare, 
  FileText,
  Send,
  X,
  Loader2
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { databaseService } from '../../services/databaseService';

interface MentorDetailsProps {
  mentor: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    employeeId: string;
    department: string;
    designation: string;
    officeLocation: string;
    officeHours: string;
    subjects: string[];
    profilePicture?: string;
  };
  studentId?: string;
}

const LEAVE_TYPE_MAP: Record<string, 'SICK' | 'CASUAL' | 'EMERGENCY' | 'OTHER'> = {
  sick: 'SICK',
  casual: 'CASUAL',
  emergency: 'EMERGENCY',
  other: 'OTHER',
};
const PERMISSION_TYPE_MAP: Record<string, 'LATE' | 'EARLY' | 'ABSENT' | 'OTHER'> = {
  late: 'LATE',
  early: 'EARLY',
  absent: 'ABSENT',
  other: 'OTHER',
};

const MentorDetails: React.FC<MentorDetailsProps> = ({ mentor, studentId }) => {
  const { toast } = useToast();
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [mentorImageError, setMentorImageError] = useState(false);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [permissionSubmitting, setPermissionSubmitting] = useState(false);
  const [leaveType, setLeaveType] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [permissionType, setPermissionType] = useState('');
  const [permissionReason, setPermissionReason] = useState('');
  const [permissionDate, setPermissionDate] = useState('');
  const showMentorPhoto = mentor.profilePicture && !mentorImageError;
  const canSubmitRequests = !!studentId;

  const resetLeaveForm = () => {
    setLeaveType('');
    setLeaveReason('');
    setLeaveStartDate('');
    setLeaveEndDate('');
  };
  const resetPermissionForm = () => {
    setPermissionType('');
    setPermissionReason('');
    setPermissionDate('');
  };

  const handleLeaveSubmit = async () => {
    if (!canSubmitRequests) {
      toast({ title: 'Error', description: 'Student profile not loaded. Please refresh the page.', variant: 'destructive' });
      return;
    }
    if (!leaveType || !leaveStartDate || !leaveEndDate || !leaveReason.trim()) {
      toast({ title: 'Missing fields', description: 'Please fill leave type, start date, end date and reason.', variant: 'destructive' });
      return;
    }
    const typeEnum = LEAVE_TYPE_MAP[leaveType];
    if (!typeEnum) {
      toast({ title: 'Invalid type', description: 'Please select a valid leave type.', variant: 'destructive' });
      return;
    }
    if (new Date(leaveEndDate) < new Date(leaveStartDate)) {
      toast({ title: 'Invalid dates', description: 'End date must be on or after start date.', variant: 'destructive' });
      return;
    }
    setLeaveSubmitting(true);
    try {
      const result = await databaseService.createLeaveRequest({
        studentId,
        mentorId: mentor.id,
        type: typeEnum,
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        reason: leaveReason.trim(),
      });
      if (result) {
        toast({ title: 'Leave applied', description: 'Your leave request has been submitted to your mentor.' });
        setShowLeaveDialog(false);
        resetLeaveForm();
      } else {
        toast({ title: 'Failed', description: 'Could not submit leave request. Please try again.', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const handlePermissionSubmit = async () => {
    if (!canSubmitRequests) {
      toast({ title: 'Error', description: 'Student profile not loaded. Please refresh the page.', variant: 'destructive' });
      return;
    }
    if (!permissionType || !permissionDate || !permissionReason.trim()) {
      toast({ title: 'Missing fields', description: 'Please fill permission type, date and reason.', variant: 'destructive' });
      return;
    }
    const typeEnum = PERMISSION_TYPE_MAP[permissionType];
    if (!typeEnum) {
      toast({ title: 'Invalid type', description: 'Please select a valid permission type.', variant: 'destructive' });
      return;
    }
    setPermissionSubmitting(true);
    try {
      const result = await databaseService.createPermissionRequest({
        studentId,
        mentorId: mentor.id,
        type: typeEnum,
        requestDate: permissionDate,
        reason: permissionReason.trim(),
      });
      if (result) {
        toast({ title: 'Permission requested', description: 'Your permission request has been sent to your mentor.' });
        setShowPermissionDialog(false);
        resetPermissionForm();
      } else {
        toast({ title: 'Failed', description: 'Could not submit permission request. Please try again.', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setPermissionSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>My Mentor</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-6">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden shrink-0">
              {showMentorPhoto ? (
                <img
                  src={mentor.profilePicture}
                  alt={`${mentor.name} (Mentor)`}
                  className="w-24 h-24 rounded-full object-cover"
                  onError={() => setMentorImageError(true)}
                />
              ) : (
                <User className="h-12 w-12 text-gray-600" />
              )}
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-xl font-semibold">{mentor.name}</h3>
                <p className="text-gray-600">{mentor.designation}</p>
                <Badge variant="outline">{mentor.department}</Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{mentor.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{mentor.phoneNumber}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">ID: {mentor.employeeId}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{mentor.officeLocation}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{mentor.officeHours}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Subjects Taught</h4>
                <div className="flex flex-wrap gap-2">
                  {(mentor.subjects ?? []).map((subject, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {subject}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Apply Leave</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Apply Leave</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="leaveType">Leave Type</Label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="casual">Casual Leave</SelectItem>
                    <SelectItem value="emergency">Emergency Leave</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Please provide a detailed reason for your leave request..."
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="flex space-x-2">
                <Button onClick={handleLeaveSubmit} className="flex-1" disabled={leaveSubmitting}>
                  {leaveSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Submit
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowLeaveDialog(false)}
                  className="flex-1"
                  disabled={leaveSubmitting}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Seek Permission</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Seek Permission</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="permissionType">Permission Type</Label>
                <Select value={permissionType} onValueChange={setPermissionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select permission type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="late">Late Arrival</SelectItem>
                    <SelectItem value="early">Early Departure</SelectItem>
                    <SelectItem value="absent">Absence Permission</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="permissionDate">Date</Label>
                <Input
                  id="permissionDate"
                  type="date"
                  value={permissionDate}
                  onChange={(e) => setPermissionDate(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="permissionReason">Reason</Label>
                <Textarea
                  id="permissionReason"
                  placeholder="Please provide a detailed reason for your permission request..."
                  value={permissionReason}
                  onChange={(e) => setPermissionReason(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="flex space-x-2">
                <Button onClick={handlePermissionSubmit} className="flex-1" disabled={permissionSubmitting}>
                  {permissionSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Submit
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowPermissionDialog(false)}
                  className="flex-1"
                  disabled={permissionSubmitting}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MentorDetails; 