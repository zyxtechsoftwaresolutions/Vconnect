
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Bell, Calendar, MessageSquare, AlertCircle, Loader2, Check, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { databaseService } from '../../services/databaseService';
import { UserRole } from '../../types/user';

interface NotificationModalProps {
  onClose: () => void;
  onRequestsUpdated?: () => void;
}

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  action_url?: string;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ onClose, onRequestsUpdated }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [pendingPermissions, setPendingPermissions] = useState<any[]>([]);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const isMentor = user?.role === UserRole.FACULTY || user?.role === UserRole.COORDINATOR;

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [list, leaves, perms] = await Promise.all([
        databaseService.getNotificationsByUser(user.id),
        isMentor ? databaseService.getLeaveRequestsByMentor(user.id) : Promise.resolve([]),
        isMentor ? databaseService.getPermissionRequestsByMentor(user.id) : Promise.resolve([]),
      ]);
      setNotifications(list);
      setPendingLeaves((leaves || []).filter((r: any) => r.status === 'PENDING'));
      setPendingPermissions((perms || []).filter((r: any) => r.status === 'PENDING'));
    } catch (e) {
      console.error('Error loading notifications:', e);
      setNotifications([]);
      setPendingLeaves([]);
      setPendingPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id, isMentor]);

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
    await databaseService.markNotificationRead(notificationId);
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await databaseService.markAllNotificationsRead(user.id);
  };

  const handleLeaveAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setActioningId(id);
    try {
      const ok = await databaseService.updateLeaveRequestStatus(id, status);
      if (ok) {
        setPendingLeaves(prev => prev.filter(r => r.id !== id));
        onRequestsUpdated?.();
        load();
      }
    } finally {
      setActioningId(null);
    }
  };

  const handlePermissionAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setActioningId(id);
    try {
      const ok = await databaseService.updatePermissionRequestStatus(id, status);
      if (ok) {
        setPendingPermissions(prev => prev.filter(r => r.id !== id));
        onRequestsUpdated?.();
        load();
      }
    } finally {
      setActioningId(null);
    }
  };

  const iconForType = (type: string) => {
    if (type === 'meeting' || type === 'leave') return Calendar;
    if (type === 'attendance' || type === 'permission') return AlertCircle;
    return Bell;
  };

  const typeColor = (type: string) => {
    if (type === 'SUCCESS') return 'bg-green-100 text-green-600';
    if (type === 'WARNING' || type === 'ERROR') return 'bg-red-100 text-red-600';
    return 'bg-blue-100 text-blue-600';
  };

  const formatTime = (created_at: string) => {
    const d = new Date(created_at);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour(s) ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day(s) ago`;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[540px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
            {/* Pending leave requests (mentors only) */}
            {isMentor && pendingLeaves.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase">Leave requests</h4>
                {pendingLeaves.map((req: any) => (
                  <div key={req.id} className="p-3 border rounded-lg bg-amber-50 border-amber-200">
                    <p className="font-medium text-sm">{req.studentName || 'Student'} — {req.type}</p>
                    <p className="text-xs text-gray-600 mt-1">{req.start_date} to {req.end_date}. {req.reason?.slice(0, 60)}...</p>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={actioningId === req.id} onClick={() => handleLeaveAction(req.id, 'APPROVED')}>
                        {actioningId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                        Accept
                      </Button>
                      <Button size="sm" variant="destructive" disabled={actioningId === req.id} onClick={() => handleLeaveAction(req.id, 'REJECTED')}>
                        <X className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pending permission requests (mentors only) */}
            {isMentor && pendingPermissions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase">Permission requests</h4>
                {pendingPermissions.map((req: any) => (
                  <div key={req.id} className="p-3 border rounded-lg bg-blue-50 border-blue-200">
                    <p className="font-medium text-sm">{req.studentName || 'Student'} — {req.type}</p>
                    <p className="text-xs text-gray-600 mt-1">Date: {req.request_date}. {req.reason?.slice(0, 60)}...</p>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={actioningId === req.id} onClick={() => handlePermissionAction(req.id, 'APPROVED')}>
                        {actioningId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                        Accept
                      </Button>
                      <Button size="sm" variant="destructive" disabled={actioningId === req.id} onClick={() => handlePermissionAction(req.id, 'REJECTED')}>
                        <X className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* General notifications */}
            <h4 className="text-xs font-semibold text-gray-500 uppercase">Activity</h4>
            {notifications.length === 0 && pendingLeaves.length === 0 && pendingPermissions.length === 0 ? (
              <div className="text-sm text-gray-500 py-4 text-center">No notifications yet.</div>
            ) : (
              notifications.map((notification) => {
                const Icon = iconForType(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      !notification.is_read ? 'bg-blue-50 border-blue-200' : 'bg-white'
                    }`}
                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full ${typeColor(notification.type)}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{notification.title}</h4>
                          {!notification.is_read && (
                            <Badge className="bg-blue-500 text-white text-xs">New</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-2">{formatTime(notification.created_at)}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationModal;
