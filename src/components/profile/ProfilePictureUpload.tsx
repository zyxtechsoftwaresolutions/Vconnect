import React, { useRef, useState } from 'react';
import { Camera, Trash2, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../lib/supabase';

const BUCKET = 'profile-pictures';
const MAX_SIZE_MB = 2;
const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif';

const ProfilePictureUpload: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const storagePath = (userId: string) => `${userId}/avatar`;

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast({ title: 'File too large', description: `Maximum size is ${MAX_SIZE_MB} MB.`, variant: 'destructive' });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image file.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const path = storagePath(user.id);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: dbError } = await supabase
        .from('users')
        .update({ profile_picture: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (dbError) throw dbError;

      updateUser({ profilePicture: publicUrl });

      toast({ title: 'Photo updated', description: 'Your profile picture has been updated.' });
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({ title: 'Upload failed', description: err.message || 'Could not upload the image.', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const path = storagePath(user.id);

      await supabase.storage.from(BUCKET).remove([path]);

      const { error: dbError } = await supabase
        .from('users')
        .update({ profile_picture: '', updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (dbError) throw dbError;

      updateUser({ profilePicture: undefined });

      toast({ title: 'Photo removed', description: 'Your profile picture has been removed.' });
    } catch (err: any) {
      console.error('Delete error:', err);
      toast({ title: 'Delete failed', description: err.message || 'Could not remove the image.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const hasPhoto = !!user?.profilePicture;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className="h-28 w-28 border-4 border-white shadow-lg">
          <AvatarImage src={user?.profilePicture} alt={user?.name} />
          <AvatarFallback className="text-3xl bg-blue-100 text-blue-700">
            {user?.name?.charAt(0)?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <button
          type="button"
          onClick={handleFileSelect}
          disabled={uploading}
          className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED}
        onChange={handleUpload}
        className="hidden"
      />

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleFileSelect}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Uploading...
            </>
          ) : hasPhoto ? (
            <>
              <Camera className="h-4 w-4 mr-1" />
              Change Photo
            </>
          ) : (
            <>
              <Camera className="h-4 w-4 mr-1" />
              Upload Photo
            </>
          )}
        </Button>

        {hasPhoto && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-1" />
            )}
            Remove
          </Button>
        )}
      </div>

      <p className="text-xs text-gray-500">JPG, PNG, WebP or GIF. Max {MAX_SIZE_MB} MB.</p>
    </div>
  );
};

export default ProfilePictureUpload;
