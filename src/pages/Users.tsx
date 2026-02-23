
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { UserPlus, Search, Edit, Trash2, Eye, Upload } from 'lucide-react';
import { UserRole } from '../types/user';
import UserForm from '../components/forms/UserForm';
import BulkUserUpload from '../components/forms/BulkUserUpload';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { databaseService } from '../services/databaseService';

const db = supabaseAdmin || supabase;

const FACULTY_ROLES = ['FACULTY', 'HOD', 'COORDINATOR'];

const Users: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserForm, setShowUserForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canBulkAdd = user?.role === UserRole.ADMIN || user?.role === UserRole.PRINCIPAL || user?.role === UserRole.HOD;

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data: dbUsers, error: fetchError } = await db
        .from('users')
        .select('*')
        .order('name');

      if (fetchError) {
        console.error('Error fetching users:', fetchError);
        setError('Failed to load users');
        return;
      }

      const mapped = (dbUsers || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        status: u.is_active !== false ? 'Active' : 'Inactive'
      }));

      setUsers(mapped);
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddUser = async (userData: any) => {
    try {
      setError('');

      const password = userData.useDefaultPassword ? 'user123' : (userData.password || 'user123');
      let userId: string | null = null;
      let authUserCreated = false;

      // Step 1: Check if user already exists in public.users
      let existingDbUser = null;
      try {
        const { data } = await db.from('users').select('id, email').eq('email', userData.email).maybeSingle();
        existingDbUser = data;
      } catch (e) {
        console.warn('Could not check existing user, continuing...', e);
      }
      
      if (existingDbUser) {
        // User already exists, will update after auth creation
      }

      // Step 2: Create user in auth.users using Edge Function (server-side)
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Supabase URL or Anon Key not configured');
        }

        // Call Edge Function to create user
        const functionUrl = `${supabaseUrl}/functions/v1/create-user`;
        
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'apikey': supabaseAnonKey
          },
          body: JSON.stringify({
            email: userData.email,
            password: password,
            name: userData.name,
            role: userData.role,
            department: userData.department
          })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || `Failed to create user: ${response.statusText}`);
        }

        userId = result.userId;
        authUserCreated = result.authUserCreated;

      } catch (authErr: any) {
        console.error('❌ Error with auth user creation:', authErr);
        
        // If Edge Function fails, check if it's because function doesn't exist
        if (authErr.message?.includes('404') || authErr.message?.includes('Not Found')) {
          setError(`Edge Function not deployed. Please deploy the 'create-user' Edge Function first. See DEPLOY_EDGE_FUNCTION.md for instructions.`);
          return;
        }
        
        // If user already exists, try to continue with database creation
        if (authErr.message?.includes('already') || authErr.message?.includes('exists')) {
          console.warn('⚠️ User might already exist, continuing with database creation...');
          // We'll create in database with a new UUID, user can sync later
          if (!userId) {
            userId = crypto.randomUUID();
          }
        } else {
          setError(`Failed to create authentication user: ${authErr.message}. Please deploy the Edge Function or create user manually in Supabase Dashboard.`);
          return;
        }
      }

      // Step 3: If user exists in public.users, delete it first (to recreate with correct ID)
      if (existingDbUser && userId) {
        try {
          await db.from('users').delete().eq('email', userData.email);
        } catch (deleteError: any) {
          console.warn('⚠️ Could not delete existing user:', deleteError);
        }
      }

      // Step 4: Create/update user in public.users with the ID from auth.users
      if (userId) {

        const { data: createdUser, error: dbError } = await db
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
          }, {
            onConflict: 'email'
          })
          .select()
          .single();

        if (dbError) {
          console.error('❌ Failed to create user in database:', dbError);
          setError(`Failed to create user in database: ${dbError.message}`);
          return;
        }

        // Step 5: Create student record if role is STUDENT
        if (userData.role === 'STUDENT') {
          const deptCode = userData.department === 'CSE' ? '05' :
            userData.department === 'ECE' ? '04' :
              userData.department === 'EEE' ? '03' :
                userData.department === 'CIVIL' ? '01' :
                  userData.department === 'MECH' ? '02' : '05';

          const registerId = `23NT1A${deptCode}${Math.floor(Math.random() * 9000) + 1000}`;

          try {
            // Delete existing student record if any
            try {
              await db.from('students').delete().eq('email', userData.email);
            } catch (deleteErr) {
              // Ignore delete errors
            }
            
            await db.from('students').insert([{
              user_id: userId,
              name: userData.name,
              register_id: registerId,
              regulation: 'R23',
              email: userData.email,
              class: '',
              department: userData.department || 'CSE',
              attendance: 'Present',
              phone_number: userData.phoneNumber || '+91 9999999999',
              role: 'STUDENT',
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
          } catch (studentError: any) {
            console.error('⚠️ Failed to create student record:', studentError);
            // Don't fail the entire operation if student record creation fails
          }
        }

        // Step 5b: Create faculty record if role is FACULTY, HOD, or COORDINATOR
        if (FACULTY_ROLES.includes(userData.role)) {
          try {
            const ok = await databaseService.createFacultyRecordIfNeeded(userId, userData.department || 'CSE');
            if (!ok) console.warn('⚠️ Faculty record not created (may already exist)');
          } catch (facultyError: any) {
            console.error('⚠️ Failed to create faculty record:', facultyError);
          }
        }

        await loadUsers();
        setShowUserForm(false);
        
        alert(`✅ User created successfully!\n\n📧 Email: ${userData.email}\n🔑 Password: ${password}\n👤 Role: ${userData.role}\n📂 Department: ${userData.department}\n\n✅ User can login immediately!`);
      } else {
        setError('Failed to create authentication user. User cannot login. Please check console for details.');
      }
    } catch (error: any) {
      console.error('❌ Error creating user:', error);
      setError(`Failed to create user: ${error.message || 'Unknown error'}`);
    }
  };

  const handleEditUser = async (userData: any) => {
    try {
      setError('');

      // For database users, proceed with database update

      // If password was updated, we need to handle it specially
      if (userData.updatePassword) {
        const { data: updatedUser, error: updateError } = await db
          .from('users')
          .update({
            name: userData.name,
            email: userData.email,
            role: userData.role,
            department: userData.department,
            updated_at: new Date().toISOString()
          })
          .eq('id', userData.id)
          .select()
          .single();

        if (updateError) {
          setError(`Failed to update user in database: ${updateError.message}`);
          return;
        }

        // Sync role change to the students table
        if (userData.role === 'CR' || userData.role === 'STUDENT') {
          await db.from('students')
            .update({ role: userData.role, updated_at: new Date().toISOString() })
            .eq('user_id', userData.id);
        }
        if (FACULTY_ROLES.includes(userData.role)) {
          await databaseService.createFacultyRecordIfNeeded(userData.id, userData.department || 'CSE');
        }

        // Update local state
        setUsers(users.map(u => u.id === userData.id ? {
          ...u,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          department: userData.department
        } : u));
        
        setEditingUser(null);
        
        // Show success message about password update
        alert(`User updated successfully! ${userData.useDefaultPassword ? 'Password has been reset to default (user123).' : 'Password has been updated with the new value.'}`);
      } else {
        const { data: updatedUser, error: updateError } = await db
          .from('users')
          .update({
            name: userData.name,
            email: userData.email,
            role: userData.role,
            department: userData.department,
            updated_at: new Date().toISOString()
          })
          .eq('id', userData.id)
          .select()
          .single();

        if (updateError) {
          setError(`Failed to update user in database: ${updateError.message}`);
          return;
        }

        // Sync role change to the students table
        if (userData.role === 'CR' || userData.role === 'STUDENT') {
          await db.from('students')
            .update({ role: userData.role, updated_at: new Date().toISOString() })
            .eq('user_id', userData.id);
        }
        if (FACULTY_ROLES.includes(userData.role)) {
          await databaseService.createFacultyRecordIfNeeded(userData.id, userData.department || 'CSE');
        }

        // Update local state
        setUsers(users.map(u => u.id === userData.id ? {
          ...u,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          department: userData.department
        } : u));
        
        setEditingUser(null);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setError(`Failed to update user: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    db
      .from('users')
      .delete()
      .eq('id', userId)
      .then(({ error }) => {
        if (error) {
          setError(`Failed to delete user: ${error.message}`);
          return;
        }
        setUsers(users.filter(u => u.id !== userId));
      });
  };

  const getRoleColor = (role: UserRole) => {
    const colors = {
      [UserRole.ADMIN]: 'bg-red-100 text-red-800',
      [UserRole.HOD]: 'bg-purple-100 text-purple-800',
      [UserRole.COORDINATOR]: 'bg-blue-100 text-blue-800',
      [UserRole.CR]: 'bg-green-100 text-green-800',
      [UserRole.FACULTY]: 'bg-orange-100 text-orange-800',
      [UserRole.GUEST]: 'bg-gray-100 text-gray-800',
      [UserRole.STUDENT]: 'bg-indigo-100 text-indigo-800'
    };
    return colors[role];
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-xs sm:text-sm text-gray-600">Manage all users in the system</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {canBulkAdd && (
            <Button 
              variant="outline"
              className="flex items-center space-x-2"
              onClick={() => setShowBulkUpload(true)}
            >
              <Upload className="h-4 w-4" />
              <span>Bulk Add Users</span>
            </Button>
          )}
          <Button 
            className="flex items-center space-x-2"
            onClick={() => setShowUserForm(true)}
          >
            <UserPlus className="h-4 w-4" />
            <span>Add New User</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">All Users ({filteredUsers.length})</CardTitle>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          {/* Mobile card view */}
          <div className="block sm:hidden space-y-3">
            {filteredUsers.map((userData) => (
              <div key={userData.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{userData.name}</p>
                    <p className="text-xs text-gray-500 truncate">{userData.email}</p>
                  </div>
                  <Badge className={`${getRoleColor(userData.role)} text-[10px] shrink-0`}>
                    {userData.role}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-blue-600 text-[10px]">
                    {userData.department || 'N/A'}
                  </Badge>
                  <Badge variant="outline" className="text-green-600 text-[10px]">
                    {userData.status}
                  </Badge>
                </div>
                <div className="flex gap-2 pt-1 border-t">
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" title="View Details">
                    <Eye className="h-3 w-3 mr-1" /> View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" title="Edit"
                    onClick={() => { setEditingUser(userData); setShowUserForm(true); }}>
                    <Edit className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs text-red-600 hover:text-red-700" title="Delete"
                    onClick={() => handleDeleteUser(userData.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm">Name</th>
                  <th className="text-left p-3 text-sm">Email</th>
                  <th className="text-left p-3 text-sm">Role</th>
                  <th className="text-left p-3 text-sm">Department</th>
                  <th className="text-left p-3 text-sm">Status</th>
                  <th className="text-left p-3 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((userData) => (
                  <tr key={userData.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium text-sm">{userData.name}</td>
                    <td className="p-3 text-gray-600 text-sm">{userData.email}</td>
                    <td className="p-3">
                      <Badge className={getRoleColor(userData.role)}>{userData.role}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-blue-600">{userData.department || 'N/A'}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-green-600">{userData.status}</Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" title="Edit User"
                          onClick={() => { setEditingUser(userData); setShowUserForm(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" title="Delete User"
                          onClick={() => handleDeleteUser(userData.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showUserForm && (
        <UserForm
          onSubmit={editingUser ? handleEditUser : handleAddUser}
          onClose={() => {
            setShowUserForm(false);
            setEditingUser(null);
          }}
          editUser={editingUser}
          userRole={user?.role || UserRole.ADMIN}
        />
      )}

      {showBulkUpload && (
        <BulkUserUpload
          onClose={() => setShowBulkUpload(false)}
          onComplete={loadUsers}
          userRole={user?.role || UserRole.ADMIN}
        />
      )}
    </div>
  );
};

export default Users;
