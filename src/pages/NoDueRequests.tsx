import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dueService, NoDueRequest as NoDueRequestType } from '../services/dueService';
import { supabase, supabaseAdmin } from '../lib/supabase';
import NoDueRequest from '../components/due/NoDueRequest';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';
import { generateNoDueCertificateHTML } from '../utils/noDueCertificateTemplate';

const db = supabaseAdmin || supabase;

const NoDueRequestsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<NoDueRequestType[]>([]);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'STUDENT' || user.role === 'CR') return; // handled below
    // Approver view: query recent requests (simple SQL from client)
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await db
          .from('no_due_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (!error && data) {
          setRequests(data as NoDueRequestType[]);
          const studentIds = Array.from(new Set((data as NoDueRequestType[]).map(r => r.student_id)));
          if (studentIds.length) {
            const map: Record<string, string> = {};

            // Fetch names from users table
            const { data: users } = await db
              .from('users')
              .select('id, name')
              .in('id', studentIds);
            if (users) {
              for (const u of users) {
                if (u.name) map[u.id] = u.name;
              }
            }

            // For any IDs still missing, try the students table (user_id -> name)
            const missing = studentIds.filter(id => !map[id]);
            if (missing.length) {
              const { data: studs } = await db
                .from('students')
                .select('user_id, name, register_id')
                .in('user_id', missing);
              if (studs) {
                for (const s of studs) {
                  if (s.user_id && s.name) {
                    map[s.user_id] = `${s.name}${s.register_id ? ' (' + s.register_id + ')' : ''}`;
                  }
                }
              }
            }

            setStudentNames(map);
          }
        }
      } catch (err: any) {
        console.error(err);
        toast({ title: 'Error', description: err.message || 'Failed to load requests', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  // Only allow approval for the user's own role
  const approverRole = user && ['HOD','LIBRARIAN','ACCOUNTANT','PRINCIPAL'].includes(user.role) ? user.role : null;

  const handleApprove = async (requestId: string, role: string) => {
    if (!user) return;
    if (!approverRole || role !== approverRole) return;
    try {
      await dueService.approve(requestId, role as any, user.id);
      toast({ title: 'Approved', description: `Marked ${role} approval`, });
      const { data } = await db.from('no_due_requests').select('*').order('created_at', { ascending: false }).limit(50);
      if (data) setRequests(data as NoDueRequestType[]);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message || 'Approve failed', variant: 'destructive' });
    }
  };

  // Student/CR view: show raise request and progress
  if (user && (user.role === 'STUDENT' || user.role === 'CR')) {
    return (
      <div className="container mx-auto p-6 max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>No Due Certificate Request</CardTitle>
          </CardHeader>
          <CardContent>
            <NoDueRequest studentId={user.id} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Approver/admin view: list all requests
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>No Due Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <div>Loading...</div>}
          {!loading && requests.length === 0 && <div className="text-sm text-gray-500">No requests found.</div>}
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="p-3 border rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">Student: {studentNames[r.student_id] || r.student_id}</div>
                  <div className="text-sm text-gray-500">Created: {new Date(r.created_at).toLocaleString()}</div>
                  <div className="text-xs sm:text-sm flex flex-wrap gap-x-2 gap-y-1">
                    <span>HOD: {r.hod_approved ? '✅' : '❌'}</span>
                    <span>Librarian: {r.librarian_approved ? '✅' : '❌'}</span>
                    <span>Accountant: {r.accountant_approved ? '✅' : '❌'}</span>
                    <span>Principal: {r.principal_approved ? '✅' : '❌'}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Only show approve button for the approver's own role */}
                  {approverRole === 'HOD' && !r.hod_approved && (
                    <Button size="sm" onClick={() => handleApprove(r.id, 'HOD')}>HOD Approve</Button>
                  )}
                  {approverRole === 'LIBRARIAN' && !r.librarian_approved && (
                    <Button size="sm" onClick={() => handleApprove(r.id, 'LIBRARIAN')}>Librarian</Button>
                  )}
                  {approverRole === 'ACCOUNTANT' && !r.accountant_approved && (
                    <Button size="sm" onClick={() => handleApprove(r.id, 'ACCOUNTANT')}>Accountant</Button>
                  )}
                  {approverRole === 'PRINCIPAL' && !r.principal_approved && (
                    <Button size="sm" onClick={() => handleApprove(r.id, 'PRINCIPAL')}>Principal</Button>
                  )}
                  {r.hod_approved && r.librarian_approved && r.accountant_approved && r.principal_approved && (
                    <Button size="sm" onClick={async () => {
                      const { data: userRec } = await db
                        .from('users')
                        .select('name, department, email')
                        .eq('id', r.student_id)
                        .single();

                      const { data: studentRec } = await db
                        .from('students')
                        .select('register_id, class, department, name')
                        .eq('user_id', r.student_id)
                        .maybeSingle();

                      const html = generateNoDueCertificateHTML({
                        studentName: userRec?.name || studentRec?.name || '',
                        registerId: studentRec?.register_id || '-',
                        department: userRec?.department || studentRec?.department || '-',
                        studentClass: studentRec?.class || '-',
                        email: userRec?.email || '-',
                        hodApproved: !!r.hod_approved,
                        librarianApproved: !!r.librarian_approved,
                        accountantApproved: !!r.accountant_approved,
                        principalApproved: !!r.principal_approved,
                        logoUrl: `${window.location.origin}/viet-logo.png`,
                      });

                      const w = window.open('', '_blank');
                      if (w) {
                        w.document.write(html);
                        w.document.close();
                        dueService.markFormGenerated(r.id).catch(() => {});
                      }
                    }}>Generate</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NoDueRequestsPage;
