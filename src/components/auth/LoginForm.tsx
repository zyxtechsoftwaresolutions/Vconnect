
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Eye, EyeOff, GraduationCap, Users, Settings, BookOpen, Calendar, UserCheck, Clock, Shield, Book, DollarSign, User, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ForgotPasswordModal from './ForgotPasswordModal';
import { ButtonLoader } from '../ui/loader';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const { login, loginWithOtp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    try {
      const success = await login(email, password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Login failed. Please check your email and password and try again.');
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    setOtpLoading(true);
    setError('');
    setInfo('');
    try {
      const sent = await loginWithOtp(email);
      if (sent) {
        setInfo('Magic link sent. Check your email to sign in.');
      } else {
        setError('Unable to send magic link. Verify the email and try again.');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Dynamic College-Themed Background */}
      <div className="absolute inset-0 animate-gradient"></div>
      
      {/* Geometric Pattern Overlay */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 border-2 border-white rounded-full animate-float"></div>
        <div className="absolute top-40 right-20 w-24 h-24 border-2 border-college-gold rotate-45 animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-40 left-20 w-28 h-28 border-2 border-white rounded-lg animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-20 right-40 w-20 h-20 border-2 border-college-gold rounded-full animate-float" style={{animationDelay: '3s'}}></div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full opacity-30 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${4 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left side - College Branding (hidden on mobile, shown on lg+) */}
          <div className="hidden lg:block text-left space-y-8">
            <div className="space-y-6">
              <div>
                <img
                  src="/vconnectLogo.png"
                  alt="V Connect Logo"
                  className="h-40 w-auto max-w-full"
                />
              </div>
              
              <div className="space-y-4">
                <h1 className="text-7xl font-black text-white leading-tight tracking-tight">
                  V Connect
                  <span className="block text-college-gold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                    PORTAL
                  </span>
                </h1>
                <p className="text-2xl text-blue-100 max-w-md font-medium">
                  Smart Campus Management System for Academic Excellence
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 max-w-lg">
              <div className="glass-effect rounded-xl p-6 text-center hover:scale-105 transition-transform duration-300">
                <UserCheck className="h-10 w-10 text-college-gold mx-auto mb-3" />
                <p className="text-white text-sm font-semibold">Smart Attendance</p>
                <p className="text-blue-200 text-xs mt-1">AI-Powered Tracking</p>
              </div>
              <div className="glass-effect rounded-xl p-6 text-center hover:scale-105 transition-transform duration-300">
                <Calendar className="h-10 w-10 text-college-gold mx-auto mb-3" />
                <p className="text-white text-sm font-semibold">Schedule Management</p>
                <p className="text-blue-200 text-xs mt-1">Dynamic Timetables</p>
              </div>
              <div className="glass-effect rounded-xl p-6 text-center hover:scale-105 transition-transform duration-300">
                <BookOpen className="h-10 w-10 text-college-gold mx-auto mb-3" />
                <p className="text-white text-sm font-semibold">Class Management</p>
                <p className="text-blue-200 text-xs mt-1">Comprehensive Control</p>
              </div>
              <div className="glass-effect rounded-xl p-6 text-center hover:scale-105 transition-transform duration-300">
                <GraduationCap className="h-10 w-10 text-college-gold mx-auto mb-3" />
                <p className="text-white text-sm font-semibold">Student Portal</p>
                <p className="text-blue-200 text-xs mt-1">Personalized Dashboard</p>
              </div>
            </div>
          </div>

          {/* Mobile-only: logo moved inside login card (see CardContent) */}

          {/* Right side - Login Form */}
          <div className="w-full max-w-md mx-auto">
            <Card className="glass-effect border-white/20 shadow-2xl backdrop-blur-xl">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-3xl font-bold text-white">
                  Welcome Back
                </CardTitle>
                <CardDescription className="text-blue-200 text-lg">
                  Access your academic portal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo on mobile (replaces icon); Student icon on desktop */}
                <div className="flex justify-center mb-6">
                  <div className="lg:hidden flex justify-center">
                    <img
                      src="/vconnectLogo.png"
                      alt="V Connect Logo"
                      className="h-32 w-auto max-w-full"
                    />
                  </div>
                  <div className="hidden lg:block relative">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                      <User className="h-10 w-10 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-college-gold rounded-full flex items-center justify-center">
                      <GraduationCap className="h-3 w-3 text-white" />
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-white font-medium">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your college email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="glass-effect border-white/30 text-white placeholder:text-blue-300 focus:border-college-gold h-12"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="password" className="text-white font-medium">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="glass-effect border-white/30 text-white placeholder:text-blue-300 focus:border-college-gold pr-12 h-12"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 text-blue-300 hover:text-white hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </Button>
                    </div>
                  </div>
                  
                  {error && (
                    <Alert variant="destructive" className="bg-red-500/20 border-red-500/50">
                      <AlertDescription className="text-red-200">{error}</AlertDescription>
                    </Alert>
                  )}
                  {info && (
                    <Alert className="bg-green-500/20 border-green-500/50">
                      <AlertDescription className="text-green-200">{info}</AlertDescription>
                    </Alert>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-college-blue to-college-blue-dark hover:from-college-blue-dark hover:to-college-blue text-white font-semibold py-4 rounded-xl transition-all duration-300 hover:scale-105 shadow-xl h-14 text-lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <ButtonLoader text="Signing in..." />
                    ) : (
                      'Access Portal'
                    )}
                  </Button>
                </form>

                <div className="flex items-center justify-between gap-3">
                  <div className="h-px flex-1 bg-white/20" />
                  <span className="text-blue-200 text-sm">or</span>
                  <div className="h-px flex-1 bg-white/20" />
                </div>

                <Button onClick={handleMagicLink} className="w-full bg-white/10 hover:bg-white/20 text-white h-12" disabled={otpLoading || !email}>
                  {otpLoading ? <ButtonLoader text="Sending magic link..." /> : (<span className="flex items-center gap-2"><Mail className="h-5 w-5" /> Sign in with Magic Link</span>)}
                </Button>
                
                <div className="text-center">
                  <ForgotPasswordModal>
                    <Button variant="link" className="text-college-gold hover:text-yellow-300 font-medium">
                      Forgot your password?
                    </Button>
                  </ForgotPasswordModal>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
