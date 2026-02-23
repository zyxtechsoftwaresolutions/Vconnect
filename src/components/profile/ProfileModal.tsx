import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import ProfilePictureUpload from './ProfilePictureUpload';

const db = supabaseAdmin || supabase;

interface ProfileModalProps {
  onClose: () => void;
  user: any;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ onClose, user }) => {
  const { toast } = useToast();
  const { updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
  });

  useEffect(() => {
    const loadPhone = async () => {
      if (!user) { setLoading(false); return; }
      try {
        const isStudent = user.role === 'STUDENT' || user.role === 'CR';
        const table = isStudent ? 'students' : 'users';
        const phoneCol = isStudent ? 'phone_number' : 'phone_number';
        const matchCol = isStudent ? 'user_id' : 'id';

        const { data } = await db
          .from(table)
          .select(phoneCol)
          .eq(matchCol, user.id)
          .maybeSingle();

        if (data && data[phoneCol]) {
          setProfileData(prev => ({ ...prev, phone: data[phoneCol] }));
        }
      } catch (err) {
        console.error('Error loading phone:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPhone();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error: userError } = await db
        .from('users')
        .update({
          name: profileData.name,
          email: profileData.email,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (userError) throw userError;

      const isStudent = user.role === 'STUDENT' || user.role === 'CR';
      if (isStudent) {
        const { error: studentError } = await db
          .from('students')
          .update({
            name: profileData.name,
            email: profileData.email,
            phone_number: profileData.phone || null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (studentError) {
          console.error('Error updating student phone:', studentError);
        }
      }

      updateUser({ name: profileData.name, email: profileData.email });

      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully.",
      });
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <ProfilePictureUpload />

          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <div className="p-2 bg-gray-50 rounded border">
                  <span className="font-medium text-blue-600">{user?.role}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileModal;
