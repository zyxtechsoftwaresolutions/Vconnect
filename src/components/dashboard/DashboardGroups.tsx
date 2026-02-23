import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { MessageSquare, Users, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/user';
import { supabase, supabaseAdmin } from '../../lib/supabase';

const db = supabaseAdmin || supabase;

interface GroupPreview {
  id: string;
  name: string;
  department: string | null;
  memberCount: number;
  lastMessage: string | null;
  lastMessageTime: string | null;
}

const DashboardGroups: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMyGroups(); }, [user]);

  const loadMyGroups = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = db.from('groups').select('id, name, department, members, created_at');

      if (user.role === UserRole.STUDENT || user.role === UserRole.CR) {
        query = query.contains('members', [user.id]);
      } else if (user.role === UserRole.FACULTY) {
        query = query.or(`members.cs.{${user.id}},department.eq.${user.department}`);
      } else if (user.department && (user.role === UserRole.HOD || user.role === UserRole.COORDINATOR)) {
        query = query.or(`department.eq.${user.department},members.cs.{${user.id}}`);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(5);
      if (error || !data) { setGroups([]); return; }

      const previews: GroupPreview[] = [];
      for (const g of data) {
        let lastMessage: string | null = null;
        let lastMessageTime: string | null = null;
        const { data: msgs } = await db
          .from('messages')
          .select('content, created_at')
          .eq('group_id', g.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (msgs?.[0]) {
          lastMessage = msgs[0].content.length > 50 ? msgs[0].content.slice(0, 50) + '...' : msgs[0].content;
          lastMessageTime = new Date(msgs[0].created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
        }

        previews.push({
          id: g.id,
          name: g.name,
          department: g.department,
          memberCount: Array.isArray(g.members) ? g.members.length : 0,
          lastMessage,
          lastMessageTime,
        });
      }
      setGroups(previews);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (groups.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            My Groups
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/groups')}>
            View All <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y">
          {groups.map(g => (
            <div
              key={g.id}
              onClick={() => navigate(`/groups?group=${g.id}`)}
              className="flex items-center justify-between py-2.5 cursor-pointer hover:bg-gray-50 rounded-md px-2 -mx-2 transition-colors gap-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{g.name}</p>
                  {g.department && <Badge variant="secondary" className="text-[10px] shrink-0">{g.department}</Badge>}
                </div>
                {g.lastMessage && <p className="text-xs text-gray-500 truncate mt-0.5">{g.lastMessage}</p>}
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Users className="h-3 w-3" />
                  <span>{g.memberCount}</span>
                </div>
                {g.lastMessageTime && <p className="text-[10px] text-gray-400 mt-0.5">{g.lastMessageTime}</p>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardGroups;
