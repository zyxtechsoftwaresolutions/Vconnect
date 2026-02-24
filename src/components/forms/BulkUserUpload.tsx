import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import {
  Upload,
  X,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  Download,
  Users,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { databaseService } from '../../services/databaseService';

const db = supabaseAdmin || supabase;

interface ParsedUser {
  name: string;
  email: string;
  role: string;
  department: string;
  phoneNumber?: string;
  registerId?: string;
  className?: string;
  status: 'valid' | 'error' | 'duplicate' | 'created' | 'failed';
  errors: string[];
  resultMessage?: string;
}

interface BulkUserUploadProps {
  onClose: () => void;
  onComplete: () => void;
  userRole: string;
}

const VALID_ROLES = ['ADMIN', 'PRINCIPAL', 'HOD', 'COORDINATOR', 'CR', 'STUDENT', 'FACULTY', 'GUEST', 'LIBRARIAN', 'ACCOUNTANT'];
const FALLBACK_DEPARTMENTS = ['CSE', 'ECE', 'EEE', 'CIVIL', 'MECH', 'AME', 'MBA', 'MCA', 'DIPLOMA', 'BBA', 'BCA', 'BS&H'];

const BulkUserUpload: React.FC<BulkUserUploadProps> = ({ onClose, onComplete, userRole }) => {
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [defaultRole, setDefaultRole] = useState('STUDENT');
  const [defaultDepartment, setDefaultDepartment] = useState('CSE');
  const [defaultPassword, setDefaultPassword] = useState('user123');
  const [defaultClass, setDefaultClass] = useState('');
  const [step, setStep] = useState<'upload' | 'preview' | 'processing' | 'done'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [VALID_DEPARTMENTS, setValidDepartments] = useState<string[]>(FALLBACK_DEPARTMENTS);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [previewPage, setPreviewPage] = useState(1);
  const [resultsPage, setResultsPage] = useState(1);

  const PREVIEW_PAGE_SIZE = 10;
  const RESULTS_PAGE_SIZE = 10;

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data } = await db.from('departments').select('name').order('name');
        if (data && data.length > 0) {
          const dbDepts = data.map((d: any) => d.name);
          const merged = [...new Set([...dbDepts, ...FALLBACK_DEPARTMENTS])].sort();
          setValidDepartments(merged);
        }
      } catch { /* keep fallback */ }

      try {
        const { data: classes } = await db.from('classes').select('name').order('name');
        if (classes) {
          setAvailableClasses(classes.map((c: any) => c.name));
        }
      } catch { /* ignore */ }
    };
    loadData();
  }, []);

  const downloadTemplate = () => {
    const headers = 'name,email,role,department,phone_number,register_id,class';
    const sampleRows = [
      'John Doe,john@viet.edu.in,STUDENT,CSE,+91 9876543210,23NT1A0501,CSE-A',
      'Jane Smith,jane@viet.edu.in,STUDENT,ECE,+91 9876543211,23NT1A0601,ECE-A',
      'Bob Faculty,bob@viet.edu.in,FACULTY,CSE,+91 9876543212,,',
    ];
    const csv = [headers, ...sampleRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_users_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    let current = '';
    let inQuotes = false;
    let row: string[] = [];

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (current || row.length > 0) {
          row.push(current.trim());
          if (row.some(cell => cell !== '')) rows.push(row);
          row = [];
          current = '';
        }
        if (char === '\r' && text[i + 1] === '\n') i++;
      } else {
        current += char;
      }
    }
    if (current || row.length > 0) {
      row.push(current.trim());
      if (row.some(cell => cell !== '')) rows.push(row);
    }
    return rows;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processCSVData(text);
    };
    reader.readAsText(file);
  };

  const processCSVData = (text: string) => {
    const rows = parseCSV(text);
    if (rows.length < 2) {
      alert('CSV file must have a header row and at least one data row.');
      return;
    }

    const rawHeaders = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
    const headerMap: Record<string, number> = {};
    rawHeaders.forEach((h, i) => { headerMap[h] = i; });

    const nameIdx = headerMap['name'] ?? headerMap['student_name'] ?? headerMap['full_name'] ?? -1;
    const emailIdx = headerMap['email'] ?? headerMap['email_id'] ?? headerMap['mail'] ?? -1;
    const roleIdx = headerMap['role'] ?? headerMap['user_role'] ?? -1;
    const deptIdx = headerMap['department'] ?? headerMap['dept'] ?? headerMap['branch'] ?? -1;
    const phoneIdx = headerMap['phone_number'] ?? headerMap['phone'] ?? headerMap['mobile'] ?? headerMap['contact'] ?? -1;
    const regIdx = headerMap['register_id'] ?? headerMap['roll_number'] ?? headerMap['roll_no'] ?? headerMap['reg_id'] ?? headerMap['registration_id'] ?? -1;
    const classIdx = headerMap['class'] ?? headerMap['class_name'] ?? headerMap['section'] ?? -1;

    if (nameIdx === -1 || emailIdx === -1) {
      alert('CSV must have at least "name" and "email" columns. Detected headers: ' + rawHeaders.join(', '));
      return;
    }

    const emailsSeen = new Set<string>();
    const parsed: ParsedUser[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const name = row[nameIdx]?.trim() || '';
      const email = row[emailIdx]?.trim().toLowerCase() || '';
      const role = (roleIdx >= 0 ? row[roleIdx]?.trim().toUpperCase() : '') || defaultRole;
      const department = (deptIdx >= 0 ? row[deptIdx]?.trim().toUpperCase() : '') || defaultDepartment;
      const phoneNumber = phoneIdx >= 0 ? row[phoneIdx]?.trim() : '';
      const registerId = regIdx >= 0 ? row[regIdx]?.trim() : '';
      const className = (classIdx >= 0 ? row[classIdx]?.trim() : '') || defaultClass;

      const errors: string[] = [];
      let status: ParsedUser['status'] = 'valid';

      if (!name) errors.push('Name is required');
      if (!email) errors.push('Email is required');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid email format');

      if (emailsSeen.has(email)) {
        errors.push('Duplicate email in file');
        status = 'duplicate';
      }
      emailsSeen.add(email);

      if (!VALID_ROLES.includes(role)) errors.push(`Invalid role: ${role}`);
      if (!VALID_DEPARTMENTS.includes(department)) errors.push(`Invalid department: ${department}`);

      if (role === 'STUDENT' && registerId) {
        const registerIdPattern = /^[0-9]{2}[A-Z]{2}[0-9][A-Z][0-9]{2}[0-9A-Z]{2}$/i;
        if (!registerIdPattern.test(registerId)) {
          errors.push('Register ID format: NNLLNLNNNN or NNLLNLNNLL (e.g., 23NT1A0552)');
        }
      }

      if (errors.length > 0 && status !== 'duplicate') status = 'error';

      parsed.push({ name, email, role, department, phoneNumber, registerId, className, status, errors });
    }

    setParsedUsers(parsed);
    setPreviewPage(1);
    setStep('preview');
  };

  const removeUser = (index: number) => {
    setParsedUsers(prev => prev.filter((_, i) => i !== index));
  };

  const getValidCount = () => parsedUsers.filter(u => u.status === 'valid').length;
  const getErrorCount = () => parsedUsers.filter(u => u.status === 'error' || u.status === 'duplicate').length;

  const createSingleUser = async (userData: ParsedUser): Promise<ParsedUser> => {
    const password = defaultPassword || 'user123';

    try {
      const { data: existing } = await db.from('users').select('id').eq('email', userData.email).maybeSingle();
      if (existing) {
        return { ...userData, status: 'failed', resultMessage: 'User with this email already exists' };
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      let userId: string | null = null;

      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'apikey': supabaseAnonKey
          },
          body: JSON.stringify({
            email: userData.email,
            password,
            name: userData.name,
            role: userData.role,
            department: userData.department
          })
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          if (result.error?.includes('already') || result.error?.includes('exists')) {
            userId = result.userId || crypto.randomUUID();
          } else {
            throw new Error(result.error || 'Edge function failed');
          }
        } else {
          userId = result.userId;
        }
      } catch (authErr: any) {
        if (authErr.message?.includes('404') || authErr.message?.includes('Not Found')) {
          return { ...userData, status: 'failed', resultMessage: 'Edge Function not deployed' };
        }
        userId = crypto.randomUUID();
      }

      if (!userId) {
        return { ...userData, status: 'failed', resultMessage: 'Failed to get user ID' };
      }

      try {
        await db.from('users').delete().eq('email', userData.email);
      } catch { /* ignore */ }

      const { error: dbError } = await db
        .from('users')
        .upsert({
          id: userId,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          department: userData.department,
          profile_picture: '',
          is_active: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'email' });

      if (dbError) {
        return { ...userData, status: 'failed', resultMessage: `DB error: ${dbError.message}` };
      }

      if (userData.role === 'STUDENT' || userData.role === 'CR') {
        const deptCodeMap: Record<string, string> = {
          'CSE': '05', 'ECE': '04', 'EEE': '03', 'CIVIL': '01', 'MECH': '02',
          'AME': '10', 'MBA': '11', 'MCA': '12', 'DIPLOMA': '13', 'BBA': '14', 'BCA': '15', 'BS&H': '16'
        };
        const deptCode = deptCodeMap[userData.department] || '05';
        const registerId = userData.registerId || `23NT1A${deptCode}${Math.floor(Math.random() * 9000) + 1000}`;

        try {
          await db.from('students').delete().eq('email', userData.email);
        } catch { /* ignore */ }

        await db.from('students').insert([{
          user_id: userId,
          name: userData.name,
          register_id: registerId,
          regulation: 'R23',
          email: userData.email,
          class: userData.className || '',
          department: userData.department,
          attendance: '0%',
          phone_number: userData.phoneNumber || '+91 9999999999',
          role: userData.role,
          is_active: true,
          is_hostler: false,
          skills: [],
          languages: [],
          hobbies: [],
          library_records: [],
          achievements: [],
          academic_records: [],
          attendance_records: [],
          fee_records: []
        }]);
      }

      if (['FACULTY', 'HOD', 'COORDINATOR'].includes(userData.role)) {
        await databaseService.createFacultyRecordIfNeeded(userId, userData.department || 'CSE');
      }

      return { ...userData, status: 'created', resultMessage: 'Created successfully' };
    } catch (err: any) {
      return { ...userData, status: 'failed', resultMessage: err.message || 'Unknown error' };
    }
  };

  const handleBulkCreate = async () => {
    const validUsers = parsedUsers.filter(u => u.status === 'valid');
    if (validUsers.length === 0) {
      alert('No valid users to create.');
      return;
    }

    if (!window.confirm(`This will create ${validUsers.length} users with password "${defaultPassword}". Continue?`)) {
      return;
    }

    setStep('processing');
    setIsProcessing(true);
    setProcessedCount(0);

    const results: ParsedUser[] = [...parsedUsers];

    for (let i = 0; i < results.length; i++) {
      if (results[i].status !== 'valid') continue;

      const result = await createSingleUser(results[i]);
      results[i] = result;
      setProcessedCount(prev => prev + 1);
      setParsedUsers([...results]);

      // Small delay to avoid rate-limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setIsProcessing(false);
    setResultsPage(1);
    setStep('done');
    onComplete();
  };

  const createdCount = parsedUsers.filter(u => u.status === 'created').length;
  const failedCount = parsedUsers.filter(u => u.status === 'failed').length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Bulk Add Users</span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isProcessing}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Default Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label>Default Role (for rows without a role)</Label>
                  <Select value={defaultRole} onValueChange={setDefaultRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VALID_ROLES.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Default Department</Label>
                  <Select value={defaultDepartment} onValueChange={setDefaultDepartment}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VALID_DEPARTMENTS.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Default Class (optional)</Label>
                  <Select
                    value={defaultClass === '' ? '__none__' : defaultClass}
                    onValueChange={(v) => setDefaultClass(v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger><SelectValue placeholder="No class" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No class (assign later)</SelectItem>
                      {availableClasses.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Default Password</Label>
                  <Input
                    value={defaultPassword}
                    onChange={(e) => setDefaultPassword(e.target.value)}
                    placeholder="Default password for all users"
                  />
                </div>
              </div>

              {/* Upload Area */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">Upload CSV File</h3>
                <p className="text-sm sm:text-base text-gray-500 mb-4">
                  Click to browse or drag and drop your CSV file here
                </p>
                <p className="text-xs sm:text-sm text-gray-400">
                  Required columns: <strong>name</strong>, <strong>email</strong><br />
                  Optional: role, department, phone_number, register_id
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {/* Template Download */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="font-medium text-blue-800">Download CSV Template</p>
                    <p className="text-sm text-blue-600">Pre-formatted template with sample data</p>
                  </div>
                </div>
                <Button variant="outline" onClick={downloadTemplate} className="w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-blue-100 text-blue-800 px-3 py-1">
                  Total: {parsedUsers.length}
                </Badge>
                <Badge className="bg-green-100 text-green-800 px-3 py-1">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Valid: {getValidCount()}
                </Badge>
                {getErrorCount() > 0 && (
                  <Badge className="bg-red-100 text-red-800 px-3 py-1">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Errors: {getErrorCount()}
                  </Badge>
                )}
              </div>

              {/* Preview Table */}
              {(() => {
                const totalPages = Math.max(1, Math.ceil(parsedUsers.length / PREVIEW_PAGE_SIZE));
                const start = (previewPage - 1) * PREVIEW_PAGE_SIZE;
                const pageUsers = parsedUsers.slice(start, start + PREVIEW_PAGE_SIZE);
                return (
                  <>
              <div className="border rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left">#</th>
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Email</th>
                      <th className="p-3 text-left">Role</th>
                      <th className="p-3 text-left">Department</th>
                      <th className="p-3 text-left">Phone</th>
                      <th className="p-3 text-left">Register ID</th>
                      <th className="p-3 text-left">Class</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageUsers.map((user, idx) => {
                      const globalIdx = start + idx;
                      return (
                      <tr key={globalIdx} className={`border-t ${user.status === 'error' || user.status === 'duplicate' ? 'bg-red-50' : ''}`}>
                        <td className="p-3 text-gray-500">{globalIdx + 1}</td>
                        <td className="p-3 font-medium">{user.name || <span className="text-red-400">Missing</span>}</td>
                        <td className="p-3">{user.email || <span className="text-red-400">Missing</span>}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">{user.role}</Badge>
                        </td>
                        <td className="p-3">{user.department}</td>
                        <td className="p-3 text-gray-500">{user.phoneNumber || '-'}</td>
                        <td className="p-3 text-gray-500">{user.registerId || '-'}</td>
                        <td className="p-3 text-gray-500">{user.className || <span className="italic text-gray-300">none</span>}</td>
                        <td className="p-3">
                          {user.status === 'valid' && (
                            <Badge className="bg-green-100 text-green-800 text-xs">Valid</Badge>
                          )}
                          {(user.status === 'error' || user.status === 'duplicate') && (
                            <div>
                              <Badge className="bg-red-100 text-red-800 text-xs mb-1">Error</Badge>
                              {user.errors.map((err, i) => (
                                <p key={i} className="text-xs text-red-600">{err}</p>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <Button variant="ghost" size="sm" onClick={() => removeUser(globalIdx)}>
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 pt-2">
                  <p className="text-sm text-gray-500">
                    Page {previewPage} of {totalPages} ({parsedUsers.length} rows)
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                      disabled={previewPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewPage(p => Math.min(totalPages, p + 1))}
                      disabled={previewPage >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
                  </>
                );
              })()}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => { setParsedUsers([]); setStep('upload'); }} className="w-full sm:w-auto">
                  Back to Upload
                </Button>
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                  <p className="text-sm text-gray-500">
                    Password for all users: <strong>{defaultPassword}</strong>
                  </p>
                  <Button
                    onClick={handleBulkCreate}
                    disabled={getValidCount() === 0}
                    className="w-full sm:w-auto"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Create {getValidCount()} Users
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Processing */}
          {step === 'processing' && (
            <div className="text-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
              <h3 className="text-lg font-semibold">Creating Users...</h3>
              <p className="text-gray-600">
                Processed {processedCount} of {getValidCount()} users
              </p>
              <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${getValidCount() > 0 ? (processedCount / getValidCount()) * 100 : 0}%` }}
                />
              </div>
              <p className="text-sm text-gray-400">Please don't close this window</p>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="text-center py-6">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Bulk Import Complete</h3>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Badge className="bg-green-100 text-green-800 px-3 py-1 text-base">
                    {createdCount} Created
                  </Badge>
                  {failedCount > 0 && (
                    <Badge className="bg-red-100 text-red-800 px-3 py-1 text-base">
                      {failedCount} Failed
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Default password: <strong>{defaultPassword}</strong>
                </p>
              </div>

              {/* Results Table */}
              {(() => {
                const resultsList = parsedUsers.filter(u => u.status === 'created' || u.status === 'failed');
                const totalResultPages = Math.max(1, Math.ceil(resultsList.length / RESULTS_PAGE_SIZE));
                const resultStart = (resultsPage - 1) * RESULTS_PAGE_SIZE;
                const resultPageItems = resultsList.slice(resultStart, resultStart + RESULTS_PAGE_SIZE);
                return (
                  <>
              <div className="border rounded-lg overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Email</th>
                      <th className="p-3 text-left">Role</th>
                      <th className="p-3 text-left">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultPageItems.map((user, idx) => (
                      <tr key={resultStart + idx} className={`border-t ${user.status === 'failed' ? 'bg-red-50' : 'bg-green-50'}`}>
                        <td className="p-3 font-medium">{user.name}</td>
                        <td className="p-3">{user.email}</td>
                        <td className="p-3">{user.role}</td>
                        <td className="p-3">
                          {user.status === 'created' ? (
                            <span className="flex items-center text-green-700">
                              <CheckCircle className="h-4 w-4 mr-1" /> Created
                            </span>
                          ) : (
                            <span className="flex items-center text-red-700">
                              <AlertCircle className="h-4 w-4 mr-1" /> {user.resultMessage}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalResultPages > 1 && (
                <div className="flex items-center justify-between gap-2 pt-2">
                  <p className="text-sm text-gray-500">
                    Page {resultsPage} of {totalResultPages} ({resultsList.length} results)
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setResultsPage(p => Math.max(1, p - 1))}
                      disabled={resultsPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setResultsPage(p => Math.min(totalResultPages, p + 1))}
                      disabled={resultsPage >= totalResultPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
                  </>
                );
              })()}

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkUserUpload;
