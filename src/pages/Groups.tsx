import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import {
  MessageSquare, Users, Send, Paperclip, Plus, Settings2, Trash2,
  ShieldCheck, FileText, Image as ImageIcon, Film, Music, Download, Loader2,
  Video, Phone, CalendarClock, ExternalLink,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/user';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useToast } from '../hooks/use-toast';
import CreateGroupModal from '../components/groups/CreateGroupModal';
import ManageMembersModal from '../components/groups/ManageMembersModal';
import Loader from '../components/ui/loader';
import { databaseService } from '../services/databaseService';
import { createMeetingUrl } from '../services/groupCallsService';

const db = supabaseAdmin || supabase;
const FILE_BUCKET = 'group-files';
const MAX_FILE_SIZE_MB = 25;

interface GroupDisplay {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  members: string[];
  admins: string[];
  department: string | null;
  created_by: string;
  is_private: boolean;
  students_can_send: boolean;
}

interface DisplayMessage {
  id: string;
  sender: string;
  senderId: string;
  message: string;
  timestamp: string;
  type: 'announcement' | 'message' | 'update' | 'file' | 'call';
  reactions: Record<string, string[]>;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  messageType?: string;
}

interface GroupCallRow {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  call_type: 'video' | 'audio';
  status: 'active' | 'scheduled' | 'ended';
  meeting_url: string;
  started_at: string;
  scheduled_at: string | null;
  ended_at: string | null;
  message_id: string | null;
  created_at: string;
}

/** Auto-end active calls that nobody joined within this time (ms). */
const CALL_EXPIRE_MS = 5 * 60 * 1000; // 5 minutes

function isActiveCallExpired(call: GroupCallRow): boolean {
  if (call.status !== 'active') return false;
  const started = new Date(call.started_at).getTime();
  return Date.now() - started > CALL_EXPIRE_MS;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name?: string) {
  if (!name) return FileText;
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return ImageIcon;
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return Film;
  if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext)) return Music;
  return FileText;
}

const Groups: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [selectedGroup, setSelectedGroup] = useState<string>(searchParams.get('group') || '');
  const [message, setMessage] = useState('');
  const [groups, setGroups] = useState<GroupDisplay[]>([]);
  const [groupMessages, setGroupMessages] = useState<Record<string, DisplayMessage[]>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [groupCalls, setGroupCalls] = useState<GroupCallRow[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ date: '', time: '14:00', title: '', callType: 'video' as 'video' | 'audio' });
  const [callLoading, setCallLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedGroupRef = useRef(selectedGroup);

  useEffect(() => { selectedGroupRef.current = selectedGroup; }, [selectedGroup]);
  useEffect(() => { loadGroups(); }, [user]);
  useEffect(() => { if (selectedGroup) loadMessages(selectedGroup); }, [selectedGroup]);
  useEffect(() => { if (selectedGroup) loadGroupCalls(selectedGroup); }, [selectedGroup]);

  // Auto-expire active calls that nobody joined within 5 minutes (check every 60s)
  useEffect(() => {
    if (!selectedGroup) return;
    const interval = setInterval(() => {
      setGroupCalls(prev => {
        const expired = prev.filter(isActiveCallExpired);
        expired.forEach(c => {
          databaseService.updateGroupCallStatus(c.id, 'ended', new Date().toISOString());
        });
        if (expired.length === 0) return prev;
        return prev.filter(c => !isActiveCallExpired(c));
      });
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedGroup]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [groupMessages[selectedGroup]]);

  // --- Realtime subscription ---
  useEffect(() => {
    if (!selectedGroup) return;
    const channel = supabase
      .channel(`group-messages-${selectedGroup}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${selectedGroup}` },
        async (payload) => {
          const row = payload.new as any;
          if (row.sender_id === user?.id) return;
          const { data: senderData } = await db.from('users').select('name, role').eq('id', row.sender_id).single();
          const isFile = ['FILE', 'IMAGE', 'VIDEO', 'AUDIO'].includes(row.message_type);
          const msg: DisplayMessage = {
            id: row.id,
            sender: `${senderData?.name || 'Unknown'} (${senderData?.role || ''})`,
            senderId: row.sender_id,
            message: row.content,
            timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: row.message_type === 'CALL' ? 'call' : isFile ? 'file' : (row.message_type?.toLowerCase() === 'announcement' ? 'announcement' : 'message'),
            reactions: {},
            fileUrl: row.file_url || undefined,
            fileName: row.file_name || undefined,
            fileSize: row.file_size || undefined,
            messageType: row.message_type,
          };
          setGroupMessages(prev => {
            const gid = selectedGroupRef.current;
            if (gid !== row.group_id) return prev;
            const existing = prev[gid] || [];
            if (existing.some(m => m.id === row.id)) return prev;
            return { ...prev, [gid]: [...existing, msg] };
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedGroup, user?.id]);

  // --- Data loading ---
  const loadGroups = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = db.from('groups').select('*');
      if (user.role === UserRole.STUDENT || user.role === UserRole.CR) {
        query = query.contains('members', [user.id]);
      } else if (user.role === UserRole.FACULTY) {
        query = query.or(`members.cs.{${user.id}},department.eq.${user.department}`);
      } else if (user.department && (user.role === UserRole.HOD || user.role === UserRole.COORDINATOR)) {
        query = query.or(`department.eq.${user.department},members.cs.{${user.id}}`);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) { console.error('Groups load error:', error); setGroups([]); return; }

      const list: GroupDisplay[] = (data || []).map((g: any) => ({
        id: g.id, name: g.name, description: g.description,
        memberCount: Array.isArray(g.members) ? g.members.length : 0,
        members: g.members || [], admins: g.admins || [],
        department: g.department, created_by: g.created_by,
        is_private: g.is_private, students_can_send: g.students_can_send !== false,
      }));
      setGroups(list);
      const preselect = searchParams.get('group');
      if (preselect && list.some(g => g.id === preselect)) setSelectedGroup(preselect);
      else if (list.length > 0 && !list.some(g => g.id === selectedGroup)) setSelectedGroup(list[0].id);
    } catch { setGroups([]); }
    finally { setLoading(false); }
  };

  const loadGroupCalls = async (groupId: string) => {
    try {
      const calls = await databaseService.getGroupCalls(groupId);
      const expired: GroupCallRow[] = [];
      const stillValid = calls.filter((c: GroupCallRow) => {
        if (isActiveCallExpired(c)) {
          expired.push(c);
          return false;
        }
        return true;
      });
      for (const c of expired) {
        await databaseService.updateGroupCallStatus(c.id, 'ended', new Date().toISOString());
      }
      setGroupCalls(stillValid);
    } catch {
      setGroupCalls([]);
    }
  };

  const loadMessages = async (groupId: string) => {
    try {
      const { data, error } = await db
        .from('messages')
        .select('id, content, created_at, sender_id, message_type, file_url, file_name, file_size, users!sender_id(name, role)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) { console.error('Messages load error:', error); setGroupMessages(prev => ({ ...prev, [groupId]: [] })); return; }

      const msgIds = (data || []).map(m => m.id);
      let reactionsMap: Record<string, Record<string, string[]>> = {};
      if (msgIds.length > 0) {
        const { data: rxData } = await db
          .from('message_reactions').select('message_id, user_id, reaction_type').in('message_id', msgIds);
        for (const rx of rxData || []) {
          if (!reactionsMap[rx.message_id]) reactionsMap[rx.message_id] = {};
          if (!reactionsMap[rx.message_id][rx.reaction_type]) reactionsMap[rx.message_id][rx.reaction_type] = [];
          reactionsMap[rx.message_id][rx.reaction_type].push(rx.user_id);
        }
      }

      const messages: DisplayMessage[] = (data || []).reverse().map(msg => {
        const isFile = ['FILE', 'IMAGE', 'VIDEO', 'AUDIO'].includes(msg.message_type || '');
        return {
          id: msg.id,
          sender: `${(msg as any).users?.name || 'Unknown'} (${(msg as any).users?.role || ''})`,
          senderId: msg.sender_id,
          message: msg.content,
          timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: msg.message_type === 'CALL' ? 'call' as const : isFile ? 'file' as const : (msg.message_type?.toLowerCase() === 'announcement' ? 'announcement' as const : 'message' as const),
          reactions: reactionsMap[msg.id] || {},
          fileUrl: msg.file_url || undefined,
          fileName: msg.file_name || undefined,
          fileSize: msg.file_size || undefined,
          messageType: msg.message_type || undefined,
        };
      });
      setGroupMessages(prev => ({ ...prev, [groupId]: messages }));
    } catch {
      setGroupMessages(prev => ({ ...prev, [groupId]: [] }));
    }
  };

  // --- Actions ---
  const handleSendMessage = async () => {
    if (!message.trim() || !canSendInCurrentGroup() || !selectedGroup || !user) return;
    try {
      const { data, error } = await db
        .from('messages')
        .insert([{ group_id: selectedGroup, sender_id: user.id, content: message, message_type: 'TEXT' }])
        .select('id, content, created_at, sender_id, message_type')
        .single();
      if (error) throw error;
      const newMsg: DisplayMessage = {
        id: data.id, sender: `${user.name} (${user.role})`, senderId: user.id,
        message: data.content,
        timestamp: new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'message', reactions: {},
      };
      setGroupMessages(prev => ({ ...prev, [selectedGroup]: [...(prev[selectedGroup] || []), newMsg] }));
      setMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !canSendInCurrentGroup() || !selectedGroup || !user) return;
    event.target.value = '';

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({ title: 'File too large', description: `Maximum size is ${MAX_FILE_SIZE_MB} MB.`, variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const storagePath = `${selectedGroup}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const storageClient = supabaseAdmin || supabase;
      const { error: uploadErr } = await storageClient.storage
        .from(FILE_BUCKET)
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = storageClient.storage.from(FILE_BUCKET).getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      const msgType = file.type.startsWith('image/') ? 'IMAGE'
        : file.type.startsWith('video/') ? 'VIDEO'
        : file.type.startsWith('audio/') ? 'AUDIO' : 'FILE';

      const { data, error } = await db
        .from('messages')
        .insert([{
          group_id: selectedGroup,
          sender_id: user.id,
          content: file.name,
          message_type: msgType,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
        }])
        .select('id, content, created_at, sender_id, message_type, file_url, file_name, file_size')
        .single();

      if (error) throw error;

      const newMsg: DisplayMessage = {
        id: data.id, sender: `${user.name} (${user.role})`, senderId: user.id,
        message: data.content,
        timestamp: new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'file', reactions: {},
        fileUrl: data.file_url, fileName: data.file_name, fileSize: data.file_size,
        messageType: data.message_type,
      };
      setGroupMessages(prev => ({ ...prev, [selectedGroup]: [...(prev[selectedGroup] || []), newMsg] }));
      toast({ title: 'File shared', description: file.name });
    } catch (err: any) {
      console.error('File upload error:', err);
      toast({ title: 'Upload failed', description: err.message || 'Could not upload file', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;
    const msgs = groupMessages[selectedGroup] || [];
    const msg = msgs.find(m => m.id === messageId);
    if (!msg) return;
    const alreadyReacted = msg.reactions[emoji]?.includes(user.id);
    if (alreadyReacted) {
      await db.from('message_reactions').delete()
        .eq('message_id', messageId).eq('user_id', user.id).eq('reaction_type', emoji);
      setGroupMessages(prev => ({
        ...prev,
        [selectedGroup]: (prev[selectedGroup] || []).map(m => {
          if (m.id !== messageId) return m;
          const r = { ...m.reactions };
          r[emoji] = (r[emoji] || []).filter(uid => uid !== user.id);
          if (r[emoji].length === 0) delete r[emoji];
          return { ...m, reactions: r };
        }),
      }));
    } else {
      const { error } = await db.from('message_reactions').upsert(
        { message_id: messageId, user_id: user.id, reaction_type: emoji },
        { onConflict: 'message_id,user_id,reaction_type' }
      );
      if (error) return;
      setGroupMessages(prev => ({
        ...prev,
        [selectedGroup]: (prev[selectedGroup] || []).map(m => {
          if (m.id !== messageId) return m;
          const r = { ...m.reactions };
          if (!r[emoji]) r[emoji] = [];
          if (!r[emoji].includes(user.id)) r[emoji] = [...r[emoji], user.id];
          return { ...m, reactions: r };
        }),
      }));
    }
  }, [user, selectedGroup, groupMessages]);

  const startInstantCall = async (callType: 'video' | 'audio') => {
    if (!selectedGroup || !user || !currentGroup) return;
    setCallLoading(true);
    try {
      const meetingUrl = await createMeetingUrl({
        groupId: selectedGroup,
        groupName: currentGroup.name,
        callType,
        title: `${currentGroup.name} - ${callType} call`,
      });
      const call = await databaseService.createGroupCall({
        group_id: selectedGroup,
        created_by: user.id,
        title: `${currentGroup.name} - ${callType} call`,
        call_type: callType,
        status: 'active',
        meeting_url: meetingUrl,
      });
      if (!call) throw new Error('Failed to create call');

      const { data: msgData, error: msgErr } = await db
        .from('messages')
        .insert([{
          group_id: selectedGroup,
          sender_id: user.id,
          content: meetingUrl,
          message_type: 'CALL',
        }])
        .select('id, content, created_at, sender_id, message_type')
        .single();
      if (msgErr) throw msgErr;

      const newMsg: DisplayMessage = {
        id: msgData.id,
        sender: `${user.name} (${user.role})`,
        senderId: user.id,
        message: msgData.content,
        timestamp: new Date(msgData.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'call',
        reactions: {},
      };
      setGroupMessages(prev => ({ ...prev, [selectedGroup]: [...(prev[selectedGroup] || []), newMsg] }));
      setGroupCalls(prev => [{ ...call, scheduled_at: null, ended_at: null, message_id: msgData.id }, ...prev]);
      window.open(meetingUrl, '_blank', 'noopener,noreferrer');
      toast({ title: `${callType === 'video' ? 'Video' : 'Audio'} call started`, description: 'Meeting link posted in chat.' });
    } catch (err: any) {
      console.error('Start call error:', err);
      toast({ title: 'Could not start call', description: err.message || 'Try again.', variant: 'destructive' });
    } finally {
      setCallLoading(false);
    }
  };

  const scheduleCall = async () => {
    if (!selectedGroup || !user || !currentGroup) return;
    const { date, time, title, callType } = scheduleForm;
    if (!date || !time) {
      toast({ title: 'Pick date and time', variant: 'destructive' });
      return;
    }
    setCallLoading(true);
    try {
      const scheduledAt = new Date(`${date}T${time}`).toISOString();
      const meetingUrl = await createMeetingUrl({
        groupId: selectedGroup,
        groupName: currentGroup.name,
        callType: callType as 'video' | 'audio',
        title: title || `${currentGroup.name} - ${callType} call`,
        scheduledAt,
      });
      const call = await databaseService.createGroupCall({
        group_id: selectedGroup,
        created_by: user.id,
        title: title || `${currentGroup.name} - ${callType} call`,
        call_type: callType as 'video' | 'audio',
        status: 'scheduled',
        meeting_url: meetingUrl,
        scheduled_at: scheduledAt,
      });
      if (!call) throw new Error('Failed to create scheduled call');

      const { data: msgData, error: msgErr } = await db
        .from('messages')
        .insert([{
          group_id: selectedGroup,
          sender_id: user.id,
          content: meetingUrl,
          message_type: 'CALL',
        }])
        .select('id, content, created_at, sender_id, message_type')
        .single();
      if (msgErr) throw msgErr;

      const newMsg: DisplayMessage = {
        id: msgData.id,
        sender: `${user.name} (${user.role})`,
        senderId: user.id,
        message: msgData.content,
        timestamp: new Date(msgData.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'call',
        reactions: {},
      };
      setGroupMessages(prev => ({ ...prev, [selectedGroup]: [...(prev[selectedGroup] || []), newMsg] }));
      await loadGroupCalls(selectedGroup);
      setShowScheduleModal(false);
      setScheduleForm({ date: '', time: '14:00', title: '', callType: 'video' });
      toast({
        title: 'Call scheduled',
        description: `Scheduled for ${new Date(scheduledAt).toLocaleString()}. Link posted in chat.`,
      });
    } catch (err: any) {
      console.error('Schedule call error:', err);
      toast({ title: 'Could not schedule call', description: err.message || 'Try again.', variant: 'destructive' });
    } finally {
      setCallLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    const grp = getCurrentGroup();
    if (!grp || grp.created_by !== user?.id) return;
    if (!window.confirm(`Delete group "${grp.name}"? All messages will be lost.`)) return;
    try {
      await db.from('messages').delete().eq('group_id', grp.id);
      const { error } = await db.from('groups').delete().eq('id', grp.id);
      if (error) throw error;
      toast({ title: 'Group deleted' });
      setSelectedGroup('');
      loadGroups();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleStudentsSend = async (value: boolean) => {
    const grp = getCurrentGroup();
    if (!grp) return;
    const { error } = await db.from('groups').update({ students_can_send: value }).eq('id', grp.id);
    if (error) {
      if (error.message?.includes('students_can_send') || error.code === '42703') {
        toast({ title: 'Column missing', description: 'Run: ALTER TABLE groups ADD COLUMN students_can_send BOOLEAN DEFAULT true;', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
      return;
    }
    setGroups(prev => prev.map(g => g.id === grp.id ? { ...g, students_can_send: value } : g));
    toast({ title: value ? 'Students can now send messages' : 'Students can only react & view' });
  };

  // --- Helpers ---
  const getCurrentGroup = () => groups.find(g => g.id === selectedGroup);
  const getCurrentMessages = () => groupMessages[selectedGroup] || [];
  const isStaffRole = (role?: string) =>
    [UserRole.HOD, UserRole.COORDINATOR, UserRole.FACULTY, UserRole.CR, UserRole.ADMIN, UserRole.PRINCIPAL].includes(role as UserRole);
  const canSendInCurrentGroup = () => {
    if (!user) return false;
    if (isStaffRole(user.role)) return true;
    const grp = getCurrentGroup();
    return grp?.students_can_send === true;
  };
  const canManageGroups = () =>
    [UserRole.HOD, UserRole.ADMIN, UserRole.PRINCIPAL].includes(user?.role as UserRole);
  const isGroupAdmin = () => {
    const grp = getCurrentGroup();
    return grp && user && (grp.admins?.includes(user.id) || grp.created_by === user.id);
  };

  const currentGroup = getCurrentGroup();

  // --- File message renderer ---
  const renderFileMessage = (msg: DisplayMessage) => {
    const Icon = getFileIcon(msg.fileName);
    const isImage = msg.messageType === 'IMAGE' || msg.fileName?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);

    return (
      <div className="space-y-2">
        {isImage && msg.fileUrl && (
          <img
            src={msg.fileUrl}
            alt={msg.fileName || 'Image'}
            className="max-w-xs max-h-48 rounded-lg object-cover border cursor-pointer"
            onClick={() => window.open(msg.fileUrl, '_blank')}
          />
        )}
        <div className="flex items-center gap-3 p-2 bg-white rounded-lg border">
          <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{msg.fileName || msg.message}</p>
            {msg.fileSize ? <p className="text-xs text-gray-400">{formatFileSize(msg.fileSize)}</p> : null}
          </div>
          {msg.fileUrl && (
            <a
              href={msg.fileUrl}
              download={msg.fileName || 'file'}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800" title="Download">
                <Download className="h-4 w-4" />
              </Button>
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Groups</h1>
          <p className="text-sm text-gray-600">Communicate with your class and faculty</p>
        </div>
        {canManageGroups() && (
          <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /><span>Create Group</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6" style={{ minHeight: '500px' }}>
        {/* Groups List */}
        <Card className="lg:col-span-1 flex flex-col max-h-[35vh] lg:max-h-none">
          <CardHeader className="py-3 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-5 w-5" /><span>Groups ({groups.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {loading ? (
              <Loader size="sm" text="Loading groups..." />
            ) : groups.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                {canManageGroups() ? 'No groups yet. Create your first group!' : 'No groups available.'}
              </div>
            ) : (
              <div className="divide-y">
                {groups.map(g => (
                  <div
                    key={g.id}
                    onClick={() => { setSelectedGroup(g.id); setMessage(''); }}
                    className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${selectedGroup === g.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm truncate">{g.name}</h3>
                        {g.description && <p className="text-xs text-gray-500 truncate">{g.description}</p>}
                        <div className="flex items-center gap-1 mt-1">
                          {g.department && <Badge variant="secondary" className="text-[10px]">{g.department}</Badge>}
                          {!g.students_can_send && <Badge variant="outline" className="text-[10px]">Read-only</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                        <Users className="h-3 w-3" /><span>{g.memberCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-2 flex flex-col">
          {currentGroup ? (
            <>
              <CardHeader className="py-3 px-4 border-b">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base truncate">{currentGroup.name}</h3>
                    {currentGroup.description && <p className="text-xs text-gray-500 truncate">{currentGroup.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Video / Audio call" disabled={callLoading}>
                          {callLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => startInstantCall('video')} disabled={callLoading}>
                          <Video className="h-4 w-4 mr-2" /> Start Instant Video Call
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => startInstantCall('audio')} disabled={callLoading}>
                          <Phone className="h-4 w-4 mr-2" /> Start Instant Audio Call
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setScheduleForm(f => ({ ...f, callType: 'video' })); setShowScheduleModal(true); }}>
                          <CalendarClock className="h-4 w-4 mr-2" /> Schedule Video Call
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setScheduleForm(f => ({ ...f, callType: 'audio' })); setShowScheduleModal(true); }}>
                          <CalendarClock className="h-4 w-4 mr-2" /> Schedule Audio Call
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Badge variant="outline" className="flex items-center gap-1 text-xs">
                      <Users className="h-3 w-3" />{currentGroup.memberCount}
                    </Badge>
                    {isGroupAdmin() && (
                      <>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Group Settings" onClick={() => setShowSettings(s => !s)}>
                          <ShieldCheck className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Manage Members" onClick={() => setShowManage(true)}>
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        {currentGroup.created_by === user?.id && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700" title="Delete Group" onClick={handleDeleteGroup}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {showSettings && isGroupAdmin() && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> Group Settings</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">Students can send messages</Label>
                        <p className="text-xs text-gray-500">If off, students can only view and react</p>
                      </div>
                      <Switch checked={currentGroup.students_can_send} onCheckedChange={handleToggleStudentsSend} />
                    </div>
                  </div>
                )}
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
                {/* Active & Scheduled calls (active calls expire after 5 min if nobody joined) */}
                {(() => {
                  const visibleCalls = groupCalls.filter(c => !isActiveCallExpired(c));
                  return visibleCalls.length > 0 && (
                  <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-blue-800 dark:text-blue-200">
                      <Video className="h-4 w-4" /> Calls
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {visibleCalls.map(call => (
                        <div key={call.id} className="flex items-center gap-2 flex-wrap bg-white dark:bg-gray-900 rounded-lg p-2 border border-blue-100 dark:border-blue-900">
                          <span className="text-xs font-medium">{call.title}</span>
                          <Badge variant="outline" className="text-[10px]">{call.status}</Badge>
                          {call.scheduled_at && (
                            <span className="text-xs text-gray-500">
                              {new Date(call.scheduled_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          )}
                          <Button
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => window.open(call.meeting_url, '_blank', 'noopener,noreferrer')}
                          >
                            <ExternalLink className="h-3 w-3" /> Join Call
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  );
                })()}
                <div className="flex-1 overflow-y-auto space-y-3 mb-3" style={{ minHeight: '200px', maxHeight: '400px' }}>
                  {getCurrentMessages().length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-10">No messages yet. Start the conversation!</p>
                  ) : (
                    getCurrentMessages().map(msg => (
                      <div key={msg.id} className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-blue-600">{msg.sender}</span>
                          <span className="text-xs text-gray-400">{msg.timestamp}</span>
                          {msg.type === 'announcement' && <Badge variant="secondary" className="text-[10px]">Announcement</Badge>}
                          {msg.type === 'file' && <Badge variant="outline" className="text-[10px]">File</Badge>}
                          {msg.type === 'call' && <Badge variant="secondary" className="text-[10px]">Call</Badge>}
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          {msg.type === 'call' ? (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                              <p className="text-sm text-gray-600 flex-1 break-all">{msg.message}</p>
                              <Button
                                size="sm"
                                className="gap-1 shrink-0"
                                onClick={() => window.open(msg.message, '_blank', 'noopener,noreferrer')}
                              >
                                <Video className="h-4 w-4" /> Join Call
                              </Button>
                            </div>
                          ) : msg.type === 'file' ? renderFileMessage(msg) : <p className="text-sm">{msg.message}</p>}

                          {/* Reactions */}
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                              const myReaction = user ? userIds.includes(user.id) : false;
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(msg.id, emoji)}
                                  className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full border text-xs transition-colors ${
                                    myReaction ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white hover:bg-gray-100'
                                  }`}
                                >
                                  <span>{emoji}</span><span>{userIds.length}</span>
                                </button>
                              );
                            })}
                            <div className="flex gap-0.5 ml-1">
                              {['👍', '❤️', '👏'].map(e => {
                                const alreadyUsed = msg.reactions[e]?.includes(user?.id || '');
                                return (
                                  <Button key={e} variant="ghost" size="sm"
                                    className={`text-xs p-0.5 h-6 w-6 ${alreadyUsed ? 'bg-blue-50' : ''}`}
                                    onClick={() => handleReaction(msg.id, e)}>{e}</Button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="border-t pt-3">
                  {canSendInCurrentGroup() ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1"
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                      />
                      <label>
                        <Button
                          variant="outline" size="icon"
                          className="h-9 w-9 shrink-0"
                          title="Attach File"
                          asChild
                          disabled={uploading}
                        >
                          <span>
                            {uploading
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Paperclip className="h-4 w-4" />
                            }
                          </span>
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={uploading}
                        />
                      </label>
                      <Button onClick={handleSendMessage} disabled={!message.trim() || uploading} size="icon" className="h-9 w-9 shrink-0">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        {user?.role === UserRole.STUDENT || user?.role === UserRole.CR
                          ? 'Only admins can send messages in this group. You can react to messages.'
                          : 'You can view and react to messages in this group.'}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <p className="text-gray-400 text-sm">{groups.length > 0 ? 'Select a group to start chatting.' : 'No groups available.'}</p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Modals */}
      <CreateGroupModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={loadGroups} />
      {showManage && currentGroup && (
        <ManageMembersModal
          open={showManage}
          onClose={() => setShowManage(false)}
          group={currentGroup}
          onUpdated={() => { loadGroups(); setShowManage(false); }}
        />
      )}
      {/* Schedule Call modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowScheduleModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-4 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CalendarClock className="h-5 w-5" /> Schedule Call
            </h3>
            <div className="grid gap-3">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={scheduleForm.date}
                  onChange={e => setScheduleForm(f => ({ ...f, date: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Time</Label>
                <Input
                  type="time"
                  value={scheduleForm.time}
                  onChange={e => setScheduleForm(f => ({ ...f, time: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Title (optional)</Label>
                <Input
                  placeholder={`${currentGroup?.name || 'Group'} - ${scheduleForm.callType} call`}
                  value={scheduleForm.title}
                  onChange={e => setScheduleForm(f => ({ ...f, title: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button variant={scheduleForm.callType === 'video' ? 'default' : 'outline'} size="sm" onClick={() => setScheduleForm(f => ({ ...f, callType: 'video' }))}>
                  <Video className="h-4 w-4 mr-1" /> Video
                </Button>
                <Button variant={scheduleForm.callType === 'audio' ? 'default' : 'outline'} size="sm" onClick={() => setScheduleForm(f => ({ ...f, callType: 'audio' }))}>
                  <Phone className="h-4 w-4 mr-1" /> Audio
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowScheduleModal(false); setScheduleForm({ date: '', time: '14:00', title: '', callType: 'video' }); }}>
                Cancel
              </Button>
              <Button onClick={scheduleCall} disabled={callLoading || !scheduleForm.date || !scheduleForm.time}>
                {callLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Schedule
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
