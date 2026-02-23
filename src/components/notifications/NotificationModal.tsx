
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Bell, Calendar, Users, AlertCircle } from 'lucide-react';

interface NotificationModalProps {
  onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ onClose }) => {
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      type: 'meeting',
      title: 'Faculty Meeting Reminder',
      message: 'Department meeting scheduled for tomorrow at 10:00 AM',
      time: '2 hours ago',
      unread: true,
      icon: Calendar
    },
    {
      id: '2',
      type: 'attendance',
      title: 'Low Attendance Alert',
      message: 'Student Arjun Reddy has attendance below 75%',
      time: '4 hours ago',
      unread: true,
      icon: AlertCircle
    },
    {
      id: '3',
      type: 'general',
      title: 'New Assignment Posted',
      message: 'Data Structures assignment has been posted for CSE-A',
      time: '1 day ago',
      unread: false,
      icon: Bell
    }
  ]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(notification => 
      notification.id === notificationId 
        ? { ...notification, unread: false }
        : notification
    ));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notification => ({ ...notification, unread: false })));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[600px]">
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
        
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                notification.unread ? 'bg-blue-50 border-blue-200' : 'bg-white'
              }`}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-full ${
                  notification.type === 'meeting' ? 'bg-blue-100 text-blue-600' :
                  notification.type === 'attendance' ? 'bg-red-100 text-red-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  <notification.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                    {notification.unread && (
                      <Badge className="bg-blue-500 text-white text-xs">New</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  <p className="text-xs text-gray-400 mt-2">{notification.time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationModal;
