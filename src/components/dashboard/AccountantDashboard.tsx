import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { 
  Search, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  FileText,
  Plus,
  Download,
  Eye,
  Receipt,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { exportToExcel, generateReceipt } from '../../utils/exportUtils';
import { FeeType, StudentFeeRecord, PaymentTransaction, Department } from '../../types/user';
import { useAuth } from '../../contexts/AuthContext';
import { studentService, StudentData } from '../../services/studentService';

const AccountantDashboard: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feeStats, setFeeStats] = useState({
    totalStudents: 0,
    totalFeesCollected: 0,
    pendingFees: 0,
    overdueAmount: 0
  });
  const [feeStructures, setFeeStructures] = useState<any[]>([]);

  useEffect(() => {
    loadStudents();
  }, [user]);

  const loadStudents = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      let allStudents: StudentData[];
      if (user.role === 'ADMIN' || user.role === 'PRINCIPAL' || user.role === 'ACCOUNTANT') {
        allStudents = await studentService.getAllStudents();
      } else if (user.department) {
        allStudents = await studentService.getStudentsByDepartment(user.department);
      } else {
        allStudents = [];
      }

      setStudents(allStudents);
      // Load fee data after students are loaded
      loadFeeData();
    } catch (err) {
      setError('Failed to load students. Please try again.');
      console.error('Error loading students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeeData();
  }, [students]);

  const loadFeeData = async () => {
    try {
      // TODO: Load fee statistics and structures from database when the tables are created
      // For now, we'll use calculated values
      setFeeStats({
        totalStudents: students.length,
        totalFeesCollected: 0, // TODO: Calculate from database
        pendingFees: 0, // TODO: Calculate from database
        overdueAmount: 0 // TODO: Calculate from database
      });
      setFeeStructures([]); // TODO: Load from database
    } catch (error) {
      console.error('Error loading fee data:', error);
    }
  };

  // Get fee records for selected student
  const getStudentFeeRecords = (studentId: string): StudentFeeRecord[] => {
    // TODO: Load actual fee records from database
    return [];
  };

  const getFeeTypeName = (feeType: FeeType): string => {
    switch (feeType) {
      case FeeType.TUITION_FEE: return 'Tuition Fee';
      case FeeType.BUS_FEE: return 'Bus Fee';
      case FeeType.CRT_FEE: return 'CRT Fee';
      case FeeType.HOSTEL_FEE: return 'Hostel Fee';
      case FeeType.UNIVERSITY_FEE: return 'University Fee';
      default: return 'Other Fee';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'PAID': return 'text-green-600';
      case 'PARTIAL': return 'text-yellow-600';
      case 'PENDING': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const handleStudentSearch = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Search Error",
        description: "Please enter a roll number or name to search.",
        variant: "destructive",
      });
      return;
    }

    const term = searchTerm.trim().toLowerCase();

    // Search in-memory first with null-safe checks
    const student = students.find(s => 
      (s.registerId && s.registerId.toLowerCase().includes(term)) ||
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.email && s.email.toLowerCase().includes(term))
    );

    if (student) {
      setSelectedStudent(student);
      toast({
        title: "Student Found",
        description: `Found student: ${student.name} (${student.registerId})`,
      });
      return;
    }

    // Fallback: search the database directly for more thorough matching
    try {
      const dbResults = await import('../../services/studentService').then(m => m.searchStudents(searchTerm.trim()));
      if (dbResults.length > 0) {
        setSelectedStudent(dbResults[0]);
        toast({
          title: "Student Found",
          description: `Found student: ${dbResults[0].name} (${dbResults[0].registerId})`,
        });
        return;
      }
    } catch (err) {
      console.error('Database search fallback failed:', err);
    }

    setSelectedStudent(null);
    toast({
      title: "Student Not Found",
      description: `No student found matching "${searchTerm}". Please check the roll number or name.`,
      variant: "destructive",
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const handleExport = async () => {
    try {
      const exportData = students.map(student => ({
        'Student Name': student.name,
        'Register ID': student.registerId,
        'Department': student.department,
        'Class': student.class,
        'Email': student.email,
        'Phone': student.phoneNumber,
        'Regulation': student.regulation,
        'Attendance': student.attendance
      }));
      
      await exportToExcel(exportData, 'student_fee_records');
      toast({
        title: "Export Successful",
        description: "Data has been exported to Excel format.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateReceipt = (student: StudentData) => {
    const feeRecords = getStudentFeeRecords(student.id);
    const totalPaid = feeRecords.reduce((sum, f) => sum + f.amountPaid, 0);
    
    generateReceipt({
      studentName: student.name,
      registerId: student.registerId,
      amount: totalPaid
    }, 'fee');
    
    toast({
      title: "Receipt Generated",
      description: "Payment receipt has been generated.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4 sm:p-6 rounded-lg">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Accounts & Fee Management</h1>
        <p className="text-sm sm:text-base text-green-100">
          Comprehensive fee collection and student finance management system
        </p>
      </div>

      {/* Fee Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl sm:text-3xl font-bold">{feeStats.totalStudents}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Fees Collected</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600">
                  {formatCurrency(feeStats.totalFeesCollected)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Fees</p>
                <p className="text-2xl sm:text-3xl font-bold text-yellow-600">
                  {formatCurrency(feeStats.pendingFees)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue Amount</p>
                <p className="text-2xl sm:text-3xl font-bold text-red-600">
                  {formatCurrency(feeStats.overdueAmount)}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Search */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Student Fee Search</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <Input
                placeholder="Enter Roll Number or Name (e.g., 23NT1A0552)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleStudentSearch()}
                className="flex-1"
              />
              <Button onClick={handleStudentSearch} className="w-full sm:w-auto">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>

            {loading && (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                <span className="ml-2 text-lg">Searching...</span>
              </div>
            )}

            {error && (
              <div className="flex justify-center items-center py-8 text-red-600">
                <AlertCircle className="h-6 w-6 mr-2" />
                {error}
              </div>
            )}

            {selectedStudent && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4">
                  <Avatar className="h-16 w-16 shrink-0">
                    <AvatarImage src="" />
                    <AvatarFallback>
                      {selectedStudent.name.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-lg sm:text-xl font-semibold">{selectedStudent.name}</h3>
                    <p className="text-gray-600">{selectedStudent.registerId}</p>
                    <p className="text-gray-600">{selectedStudent.department} - {selectedStudent.class}</p>
                    <p className="text-sm text-gray-500">{selectedStudent.email}</p>
                    <p className="text-sm text-gray-500">{selectedStudent.phoneNumber}</p>
                  </div>
                </div>

                {/* Student Fee Details */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-lg">Fee Details</h4>
                  {getStudentFeeRecords(selectedStudent.id).map((feeRecord, index) => {
                    const feeStructure = feeStructures[index];
                    return (
                      <div key={feeRecord.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded border gap-2">
                        <div>
                          <h5 className="font-medium">{getFeeTypeName(feeStructure.type)}</h5>
                          <p className="text-sm text-gray-600">
                            Due: {formatCurrency(feeRecord.amountDue)} | 
                            Paid: {formatCurrency(feeRecord.amountPaid)}
                            {feeRecord.lateFeesApplied > 0 && (
                              <span className="text-red-600"> + Late Fee: {formatCurrency(feeRecord.lateFeesApplied)}</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(feeRecord.status)}>
                            {feeRecord.status}
                          </Badge>
                          {feeRecord.status !== 'PAID' && (
                            <Button size="sm" onClick={() => setShowPaymentForm(true)}>
                              Pay
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total Summary */}
                <div className="mt-4 p-3 bg-blue-50 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Outstanding:</span>
                    <span className="text-xl font-bold text-red-600">
                      {formatCurrency(
                        getStudentFeeRecords(selectedStudent.id)
                          .filter(f => f.status !== 'PAID')
                          .reduce((sum, f) => sum + (f.amountDue - f.amountPaid + f.lateFeesApplied), 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Fee Structure
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => selectedStudent && handleGenerateReceipt(selectedStudent)}
                disabled={!selectedStudent}
              >
                <Receipt className="mr-2 h-4 w-4" />
                Generate Fee Receipt
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={handleExport}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Fee Report
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Eye className="mr-2 h-4 w-4" />
                View Defaulters List
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <DollarSign className="mr-2 h-4 w-4" />
                Bulk Payment Entry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Student Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {students.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No students found. Data will appear once students are added to the database.</p>
              </div>
            ) : (
              students.slice(0, 10).map((student) => (
                <div 
                  key={student.id} 
                  className="flex items-center justify-between p-3 border rounded hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setSelectedStudent(student);
                    setSearchTerm(student.registerId);
                  }}
                >
                  <div>
                    <h4 className="font-medium">{student.name}</h4>
                    <p className="text-sm text-gray-600">{student.registerId} - {student.department} - {student.class}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{student.email}</p>
                    <p className="text-sm text-gray-500">{student.phoneNumber}</p>
                  </div>
                </div>
              ))
            )}
            {students.length > 10 && (
              <p className="text-sm text-gray-500 text-center">
                Showing first 10 of {students.length} students. Use search to find specific students.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Record Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input id="amount" type="number" placeholder="Enter amount" />
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CARD">Card</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="reference">Transaction Reference</Label>
                  <Input id="reference" placeholder="Enter transaction reference" />
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowPaymentForm(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setShowPaymentForm(false)}>
                    Record Payment
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AccountantDashboard;