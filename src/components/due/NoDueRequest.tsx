import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { dueService, NoDueRequest as NoDueRequestType, ApproverRole } from '../../services/dueService';
import { Button } from '../ui/button';

const roleToLabel: Record<ApproverRole, string> = {
  HOD: 'HOD',
  LIBRARIAN: 'Librarian',
  ACCOUNTANT: 'Accountant',
  PRINCIPAL: 'Principal'
};

const NoDueRequest: React.FC<{ studentId: string }> = ({ studentId }) => {
  const { user } = useAuth();
  const [request, setRequest] = useState<NoDueRequestType | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    const load = async () => {
      const r = await dueService.getByStudent(studentId);
      setRequest(r);
      unsub = dueService.subscribeToStudentRequests(studentId, (updated) => {
        setRequest(updated || null);
      });
    };
    load();
    return () => { if (unsub) unsub(); };
  }, [studentId]);

  const canApply = !!user && (user.role === 'CR' || user.role === 'STUDENT') && user.id === user.id;

  const handleApply = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const created = await dueService.create(studentId, user.id);
      setRequest(created);
    } catch (err) {
      console.error(err);
      alert('Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (role: ApproverRole) => {
    if (!user || !request) return;
    setLoading(true);
    try {
      const updated = await dueService.approve(request.id, role, user.id);
      setRequest(updated);
    } catch (err) {
      console.error(err);
      alert('Approve failed');
    } finally {
      setLoading(false);
    }
  };

  const allApproved = request && request.hod_approved && request.librarian_approved && request.accountant_approved && request.principal_approved;

  const handleGenerate = async () => {
    if (!request) return;
    const { supabase } = await import('../../lib/supabase');
    const { supabaseAdmin } = await import('../../lib/supabase');
    const { generateNoDueCertificateHTML } = await import('../../utils/noDueCertificateTemplate');
    const dbClient = supabaseAdmin || supabase;

    const { data: userRec } = await dbClient
      .from('users')
      .select('name, department, email')
      .eq('id', request.student_id)
      .single();

    const { data: studentRec } = await dbClient
      .from('students')
      .select('register_id, class, department, name')
      .eq('user_id', request.student_id)
      .maybeSingle();

    const html = generateNoDueCertificateHTML({
      studentName: userRec?.name || studentRec?.name || '',
      registerId: studentRec?.register_id || '-',
      department: userRec?.department || studentRec?.department || '-',
      studentClass: studentRec?.class || '-',
      email: userRec?.email || '-',
      hodApproved: !!request.hod_approved,
      librarianApproved: !!request.librarian_approved,
      accountantApproved: !!request.accountant_approved,
      principalApproved: !!request.principal_approved,
      logoUrl: `${window.location.origin}/viet-logo.png`,
    });

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      dueService.markFormGenerated(request.id).catch(() => {});
    }
  };

  return (
    <div className="mt-3 border-t pt-3">
      <h4 className="text-sm font-medium text-gray-700 mb-2">No Due Certificate</h4>
      {!request ? (
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-500">No request filed.</p>
          {canApply && (
            <Button size="sm" onClick={handleApply} disabled={loading}>{loading ? 'Applying...' : 'Apply'}</Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {(['HOD', 'LIBRARIAN', 'ACCOUNTANT', 'PRINCIPAL'] as ApproverRole[]).map((role) => {
            const approved = (request as any)[`${role.toLowerCase()}_approved`];
            return (
              <div key={role} className="flex items-center gap-3">
                <input type="checkbox" checked={!!approved} readOnly />
                <div className={approved ? 'text-gray-400 line-through' : 'text-gray-900'}>
                  {roleToLabel[role]} {approved ? ' — Approved' : ' — Pending'}
                </div>
                {!approved && user && user.role === role && (
                  <Button size="sm" onClick={() => handleApprove(role)} disabled={loading}>Approve</Button>
                )}
              </div>
            );
          })}

          <div className="mt-2">
            {allApproved ? (
              <Button size="sm" onClick={handleGenerate}>Generate No Due Form</Button>
            ) : (
              <p className="text-xs text-gray-500">Waiting for all approvals to generate the form.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NoDueRequest;
