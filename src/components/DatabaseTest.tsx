import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { supabaseService } from '../services/supabaseService';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Database, Users, Key } from 'lucide-react';

const DatabaseTest: React.FC = () => {
  const [testResults, setTestResults] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'success' | 'error' | 'partial'>('idle');

  const runTests = async () => {
    setLoading(true);
    setTestResults({});
    
    const results: any = {};
    
    try {
      // Test 1: Check Supabase configuration
      console.log('🧪 Testing Supabase configuration...');
      	const configOk = !!supabase;
      results.config = {
        status: configOk ? 'success' : 'error',
        message: configOk ? 'Supabase configured correctly' : 'Supabase configuration missing'
      };
      
      // Test 2: Test database connection
      console.log('🧪 Testing database connection...');
      const { data: connectionTest, error: connectionError } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      results.connection = {
        status: connectionError ? 'error' : 'success',
        message: connectionError ? `Connection failed: ${connectionError.message}` : 'Database connection successful',
        data: connectionError ? null : connectionTest
      };
      
      // Test 3: Check if users table has data
      if (!connectionError) {
        console.log('🧪 Testing users table data...');
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, email, name, role, department')
          .limit(5);
        
        results.usersData = {
          status: usersError ? 'error' : 'success',
          message: usersError ? `Users query failed: ${usersError.message}` : `Found ${usersData?.length || 0} users`,
          data: usersError ? null : usersData
        };
      }
      
      // Test 4: Test specific user lookup
      if (!connectionError) {
        console.log('🧪 Testing user lookup...');
        const testUser = await supabaseService.getUserByEmail('admin1@viet.edu.in');
        
        results.userLookup = {
          status: testUser ? 'success' : 'error',
          message: testUser ? `Found user: ${testUser.name}` : 'User lookup failed',
          data: testUser
        };
      }
      
      // Test 5: Test password verification
      if (!connectionError) {
        console.log('🧪 Testing password verification...');
        const { data: passwordTest, error: passwordError } = await supabase
          .from('users')
          .select('password')
          .eq('email', 'admin1@viet.edu.in')
          .single();
        
        results.passwordCheck = {
          status: passwordError ? 'error' : 'success',
          message: passwordError ? `Password check failed: ${passwordError.message}` : 'Password field accessible',
          hasPassword: passwordTest?.password ? 'Yes' : 'No'
        };
      }
      
    } catch (error) {
      console.error('❌ Test execution error:', error);
      results.executionError = {
        status: 'error',
        message: `Test execution failed: ${error}`
      };
    }
    
    setTestResults(results);
    
    // Determine overall status
    const successCount = Object.values(results).filter((r: any) => r.status === 'success').length;
    const errorCount = Object.values(results).filter((r: any) => r.status === 'error').length;
    
    if (errorCount === 0) {
      setOverallStatus('success');
    } else if (successCount === 0) {
      setOverallStatus('error');
    } else {
      setOverallStatus('partial');
    }
    
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Database Connection Test
          </CardTitle>
          <CardDescription>
            Test your database connection and authentication setup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runTests} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Running Tests...' : 'Run Database Tests'}
          </Button>
        </CardContent>
      </Card>

      {Object.keys(testResults).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className={`h-6 w-6 ${getStatusColor(overallStatus)}`} />
              Test Results
            </CardTitle>
            <CardDescription>
              Overall Status: 
              <span className={`ml-2 font-semibold ${getStatusColor(overallStatus)}`}>
                {overallStatus.toUpperCase()}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(testResults).map(([key, result]: [string, any]) => (
              <Alert key={key}>
                <div className="flex items-start gap-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <AlertDescription>
                      <span className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span className={`ml-2 ${getStatusColor(result.status)}`}>
                        {result.message}
                      </span>
                    </AlertDescription>
                    {result.data && (
                      <div className="mt-2 text-sm text-gray-600">
                        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            Quick Login Test
          </CardTitle>
          <CardDescription>
            Test login with these credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Admin 1</h4>
              <p className="text-sm text-gray-600">Email: admin1@viet.edu.in</p>
              <p className="text-sm text-gray-600">Password: admin123</p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Admin 2</h4>
              <p className="text-sm text-gray-600">Email: admin2@viet.edu.in</p>
              <p className="text-sm text-gray-600">Password: admin123</p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Admin 3</h4>
              <p className="text-sm text-gray-600">Email: admin3@viet.edu.in</p>
              <p className="text-sm text-gray-600">Password: admin123</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DatabaseTest; 