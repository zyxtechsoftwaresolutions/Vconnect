import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  Loader2
} from 'lucide-react';

interface ForgotPasswordModalProps {
  children: React.ReactNode;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ children }) => {
  const { resetPassword } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setEmail('');
    setError('');
    setSuccess(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const handleSendResetEmail = async () => {
    setLoading(true);
    setError('');

    try {
      const success = await resetPassword(email);
      if (success) {
        setSuccess(true);
      } else {
        setError('Failed to send reset email. Please check the email address and try again.');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError('An error occurred while sending the reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Reset Password</span>
          </DialogTitle>
        </DialogHeader>

        {!success ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold">Forgot Password?</h3>
              <p className="text-gray-600">Enter your email address to receive password reset instructions</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handleSendResetEmail} 
                disabled={loading || !email.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Reset Email...
                  </>
                ) : (
                  'Send Reset Email'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold">Email Sent!</h3>
              <p className="text-gray-600">
                We've sent password reset instructions to <strong>{email}</strong>
              </p>
            </div>

            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Please check your email and follow the instructions to reset your password. 
                  The link will expire in 1 hour.
                </AlertDescription>
              </Alert>

              <Button 
                onClick={() => handleOpenChange(false)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordModal; 