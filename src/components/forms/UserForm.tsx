
import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { supabase, supabaseAdmin } from '../../lib/supabase'
import { toast } from '../ui/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { UserRole, Department } from '../../types/user';
import { X, Eye, EyeOff } from 'lucide-react';

const db = supabaseAdmin || supabase;

interface UserFormProps {
  onSubmit: (userData: any) => void;
  onClose: () => void;
  editUser?: any;
  userRole: UserRole;
}

const UserForm: React.FC<UserFormProps> = ({ onSubmit, onClose, editUser, userRole }) => {
  const [formData, setFormData] = useState({
    name: editUser?.name || '',
    email: editUser?.email || '',
    password: '',
    confirmPassword: '',
    role: editUser?.role || UserRole.STUDENT,
    registerId: editUser?.registerId || '',
    phoneNumber: editUser?.phoneNumber || '',
    department: editUser?.department || Department.CSE,
    employeeId: editUser?.employeeId || '',
    useDefaultPassword: true,
    updatePassword: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [departmentList, setDepartmentList] = useState<string[]>(Object.values(Department));

  useEffect(() => {
    const loadDepts = async () => {
      try {
        const { data } = await db.from('departments').select('name').order('name');
        if (data && data.length > 0) {
          const dbDepts = data.map((d: any) => d.name);
          const merged = [...new Set([...dbDepts, ...Object.values(Department)])].sort();
          setDepartmentList(merged);
        }
      } catch {
        // keep enum fallback
      }
    };
    loadDepts();
  }, []);

  const getRoleOptions = () => {
    if (userRole === UserRole.ADMIN) {
      return Object.values(UserRole);
    } else if (userRole === UserRole.HOD) {
      return [UserRole.COORDINATOR, UserRole.CR, UserRole.FACULTY, UserRole.GUEST, UserRole.STUDENT];
    }
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate password for new users or password updates
    if (!editUser || formData.updatePassword) {
      if (!formData.useDefaultPassword) {
        if (!formData.password) {
          setError('Password is required');
          return;
        }
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters long');
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return;
        }
      }
    }

    if (!editUser) {
      onSubmit(formData);
      onClose();
    } else {
      // For editing, handle password updates if needed
      if (formData.updatePassword) {
        const passwordUpdated = await updateUserPassword(formData);
        if (!passwordUpdated) {
          return; // Don't proceed if password update failed
        }
      }
      
      // Update the database user
      onSubmit({
        ...formData,
        id: editUser?.id || Date.now().toString(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      onClose();
    }
  };

  const checkUserInAuth = async (email: string) => {
    try {
      const { data: authUsers, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (searchError) {
        return null;
      }
      
      if (authUsers?.users) {
        const authUser = authUsers.users.find((u: any) => u.email === email);
        return authUser || null;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  const testAuthCapabilities = async () => {
    try {
      // Test 1: List users
      const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      // Test 2: Get current user
      const { data: currentUser, error: currentError } = await supabaseAdmin.auth.getUser();
      
      // Test 3: Check if we have admin access
      if (authUsers?.users && authUsers.users.length > 0) {
        const firstUser = authUsers.users[0];
        
        // Try a simple update to test permissions
        try {
          await supabaseAdmin.auth.admin.updateUserById(
            firstUser.id,
            { user_metadata: { test: 'permission_test' } }
          );
        } catch {
          // Permission test
        }
      }
      
    } catch (error) {
      console.error('Auth capability test failed:', error);
    }
  };

  const confirmUserEmail = async (userId: string) => {
    try {
      const { data: confirmedUser, error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          email_confirm: true
        }
      );

      if (!confirmError && confirmedUser) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  const testLoginWithNewPassword = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        return false;
      }
      
      if (data.user) {
        // Sign out immediately after test
        await supabase.auth.signOut();
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  };

  // Set password for existing HOD users
  const setHODPassword = async (email: string, password: string) => {
    try {
      // Update password in database
      const { error: dbError } = await supabase
        .from('users')
        .update({ 
          password_hash: password,
          updated_at: new Date()
        })
        .eq('email', email);
      
      if (!dbError) {
        // Also create user in Supabase auth if not exists
        if (supabaseAdmin) {
          try {
            const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
              email: email,
              password: password,
              email_confirm: true,
              user_metadata: {
                name: 'HOD User',
                role: 'HOD',
                department: 'CSE'
              }
            });
            
            if (!authError) {
              // HOD user created in Supabase auth
            }
          } catch {
            // Auth creation failed (may already exist)
          }
        }
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  // Create comprehensive sample data for presentation
  const createSampleDataForPresentation = async () => {
    try {
      if (!supabaseAdmin) {
        console.error('❌ Admin client not available');
        return false;
      }

      // Three admin users only
      const sampleUsers = [
        { email: 'admin1@viet.edu.in', name: 'Admin 1', role: 'ADMIN', department: 'CSE', password: 'admin123' },
        { email: 'admin2@viet.edu.in', name: 'Admin 2', role: 'ADMIN', department: 'CSE', password: 'admin123' },
        { email: 'admin3@viet.edu.in', name: 'Admin 3', role: 'ADMIN', department: 'CSE', password: 'admin123' }
      ];

      for (const userData of sampleUsers) {
        try {
          // Create in Supabase auth
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: userData.email,
            password: userData.password,
            email_confirm: true,
            user_metadata: {
              name: userData.name,
              role: userData.role,
              department: userData.department
            }
          });

          if (!authError && authUser) {
            // Create in database users table
            const { error: dbError } = await supabase
              .from('users')
              .upsert([{
                id: authUser.user.id,
                email: userData.email,
                name: userData.name,
                role: userData.role,
                department: userData.department,
                password_hash: userData.password,
                is_active: true,
                created_at: new Date(),
                updated_at: new Date()
              }]);
          }
        } catch (error) {
          // Skip failed user
        }
      }

      return true;
      
    } catch (error) {
      console.error('❌ Error creating sample data:', error);
      return false;
    }
  };

  const updateUserPassword = async (userData: any) => {
    try {
      // IMPORTANT: Supabase blocks service role key usage in browser for security
      // We cannot create or update auth users from client-side code
      // Users must be created/updated via Supabase Dashboard
      
      // Show clear instructions to user
      const finalPassword = userData.useDefaultPassword ? 'user123' : userData.password;
      const instructionText = `⚠️ Cannot update password from browser (security restriction)\n\n✅ To set/update password:\n\n1. Go to Supabase Dashboard → Authentication → Users\n2. Find user by email: ${userData.email}\n3. Click on the user\n4. Click "Reset Password" or "Update User"\n5. Set password: ${finalPassword}\n6. ✅ Ensure "Email Confirmed" is checked\n7. Add/Update User Metadata:\n   - name: ${userData.name}\n   - role: ${userData.role}\n   - department: ${userData.department}\n\nAfter updating in Dashboard, user can login immediately!`;
      
      alert(instructionText);
      setError('Password update must be done via Supabase Dashboard. See alert for instructions.');
      return false;
      
    } catch (error) {
      console.error('❌ Unexpected error in password update:', error);
      setError(`Unexpected error updating password: ${error}`);
      return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-md max-h-[90vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 shrink-0">
          <CardTitle className="text-base sm:text-lg">{editUser ? 'Edit User' : 'Add New User'}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="overflow-y-auto flex-1 p-4 sm:p-6 pt-0 sm:pt-0">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            {!editUser && (
              <>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!editUser && !formData.useDefaultPassword}
                      placeholder="Minimum 6 characters"
                      disabled={formData.useDefaultPassword}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={formData.useDefaultPassword}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required={!editUser && !formData.useDefaultPassword}
                      placeholder="Confirm your password"
                      disabled={formData.useDefaultPassword}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={formData.useDefaultPassword}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="useDefaultPassword"
                    checked={formData.useDefaultPassword}
                    onChange={(e) => setFormData({ ...formData, useDefaultPassword: e.target.checked })}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <Label htmlFor="useDefaultPassword" className="text-sm text-gray-700">
                    Use default password (user123)
                  </Label>
                </div>
              </>
            )}

            {/* Password Update Section for Editing */}
            {editUser && (
              <>
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      id="updatePassword"
                      checked={formData.updatePassword}
                      onChange={(e) => setFormData({ ...formData, updatePassword: e.target.checked })}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <Label htmlFor="updatePassword" className="text-sm font-medium text-gray-700">
                      Update Password
                    </Label>
                  </div>
                  
                  {formData.updatePassword && (
                    <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                      <div>
                        <Label htmlFor="editPassword">New Password</Label>
                        <div className="relative">
                          <Input
                            id="editPassword"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required={formData.updatePassword && !formData.useDefaultPassword}
                            placeholder="Minimum 6 characters"
                            disabled={formData.useDefaultPassword}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={formData.useDefaultPassword}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="editConfirmPassword">Confirm New Password</Label>
                        <div className="relative">
                          <Input
                            id="editConfirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            required={formData.updatePassword && !formData.useDefaultPassword}
                            placeholder="Confirm new password"
                            disabled={formData.useDefaultPassword}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            disabled={formData.useDefaultPassword}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="editUseDefaultPassword"
                          checked={formData.useDefaultPassword}
                          onChange={(e) => setFormData({ ...formData, useDefaultPassword: e.target.checked })}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <Label htmlFor="editUseDefaultPassword" className="text-sm text-gray-700">
                          Use default password (user123)
                        </Label>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getRoleOptions().map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.role === UserRole.STUDENT && (
              <div>
                <Label htmlFor="registerId">Register ID</Label>
                <Input
                  id="registerId"
                  value={formData.registerId}
                  onChange={(e) => setFormData({ ...formData, registerId: e.target.value })}
                  placeholder="e.g., 23NT1A0552"
                />
              </div>
            )}

            {(formData.role === UserRole.FACULTY || formData.role === UserRole.GUEST) && (
              <div>
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  placeholder="e.g., EMP001"
                />
              </div>
            )}

            <div>
              <Label htmlFor="department">Department</Label>
              <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value as Department })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departmentList.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+91 9876543210"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {editUser ? 'Update User' : 'Create User'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserForm;






