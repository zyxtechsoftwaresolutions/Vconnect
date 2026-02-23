import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const SimpleLoginTest: React.FC = () => {
  const [email, setEmail] = useState('admin1@viet.edu.in');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const { login, user } = useAuth();

  const handleLogin = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log('🔐 Attempting login with:', { email, password });
      
      const success = await login(email, password);
      
      if (success) {
        setResult({
          success: true,
          message: `Login successful! Welcome ${user?.name || email}`
        });
        console.log('✅ Login successful, user:', user);
      } else {
        setResult({
          success: false,
          message: 'Login failed. Check console for details.'
        });
        console.log('❌ Login failed');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setResult({
        success: false,
        message: `Login error: ${error}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-blue-600" />
            Simple Login Test
          </CardTitle>
          <CardDescription>
            Test the authentication system with your database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@viet.edu.in"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="admin123"
            />
          </div>
          
          <Button 
            onClick={handleLogin} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Logging in...
              </>
            ) : (
              'Test Login'
            )}
          </Button>
          
          {result && (
            <Alert className={result.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  {result.message}
                </AlertDescription>
              </div>
            </Alert>
          )}
          
          {user && (
            <Alert className="border-blue-500 bg-blue-50">
              <AlertDescription>
                <strong>Current User:</strong>
                <div className="mt-2 text-sm">
                  <p><strong>Name:</strong> {user.name}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Role:</strong> {user.role}</p>
                  <p><strong>Department:</strong> {user.department || 'N/A'}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Test Credentials (3 admins):</strong></p>
            <p>Admin 1: admin1@viet.edu.in / admin123</p>
            <p>Admin 2: admin2@viet.edu.in / admin123</p>
            <p>Admin 3: admin3@viet.edu.in / admin123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleLoginTest;







