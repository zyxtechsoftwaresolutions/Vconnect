import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Key, Eye, EyeOff, Mail } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

interface PasswordChangeProps {
  onClose: () => void;
}

const PasswordChange: React.FC<PasswordChangeProps> = ({ onClose }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [forgotPassword, setForgotPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handlePasswordChange = () => {
    if (!formData.currentPassword) {
      toast({
        title: "Error",
        description: "Please enter your current password.",
        variant: "destructive",
      });
      return;
    }

    if (formData.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "New password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    // Simulate password change
    toast({
      title: "Password Changed",
      description: "Your password has been successfully updated.",
    });
    onClose();
  };

  const handleForgotPassword = () => {
    setEmailSent(true);
    toast({
      title: "Reset Email Sent",
      description: "A password reset link has been sent to your email address.",
    });
  };

  if (forgotPassword) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Reset Password</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!emailSent ? (
            <>
              <div className="text-sm text-gray-600">
                <p>Enter your email address and we'll send you a link to reset your password.</p>
              </div>
              
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  defaultValue="user@viet.edu.in"
                />
              </div>

              <div className="flex space-x-2">
                <Button onClick={handleForgotPassword}>
                  Send Reset Link
                </Button>
                <Button variant="outline" onClick={() => setForgotPassword(false)}>
                  Back to Password Change
                </Button>
              </div>
            </>
          ) : (
            <>
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  We've sent a password reset link to your email address. Please check your inbox and follow the instructions.
                </AlertDescription>
              </Alert>
              
              <div className="flex space-x-2">
                <Button onClick={() => setForgotPassword(false)}>
                  Back to Login
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Key className="h-5 w-5" />
          <span>Change Password</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="current-password">Current Password</Label>
          <div className="relative">
            <Input
              id="current-password"
              type={showPasswords.current ? "text" : "password"}
              value={formData.currentPassword}
              onChange={(e) => handleInputChange('currentPassword', e.target.value)}
              placeholder="Enter current password"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => togglePasswordVisibility('current')}
            >
              {showPasswords.current ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Button 
            variant="link" 
            size="sm" 
            className="p-0 h-auto mt-1"
            onClick={() => setForgotPassword(true)}
          >
            Forgot current password?
          </Button>
        </div>

        <div>
          <Label htmlFor="new-password">New Password</Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showPasswords.new ? "text" : "password"}
              value={formData.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              placeholder="Enter new password"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => togglePasswordVisibility('new')}
            >
              {showPasswords.new ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="confirm-password">Confirm New Password</Label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showPasswords.confirm ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              placeholder="Confirm new password"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => togglePasswordVisibility('confirm')}
            >
              {showPasswords.confirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <Alert>
          <AlertDescription>
            Password must be at least 8 characters long and contain a mix of letters, numbers, and special characters.
          </AlertDescription>
        </Alert>

        <div className="flex space-x-2">
          <Button onClick={handlePasswordChange}>
            Change Password
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PasswordChange;