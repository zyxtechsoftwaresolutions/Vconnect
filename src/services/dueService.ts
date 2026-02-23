import { supabase } from '../lib/supabase';

export type ApproverRole = 'HOD' | 'LIBRARIAN' | 'ACCOUNTANT' | 'PRINCIPAL';

export interface NoDueRequest {
  id: string;
  student_id: string;
  applicant_id: string;
  hod_approved: boolean;
  librarian_approved: boolean;
  accountant_approved: boolean;
  principal_approved: boolean;
  created_at: string;
  form_generated_at?: string | null;
}

export const dueService = {
  async getByStudent(studentId: string): Promise<NoDueRequest | null> {
    const { data, error } = await supabase
      .from('no_due_requests')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (error) return null;
    return data as NoDueRequest;
  },

  async create(studentId: string, applicantId: string) {
    const payload = {
      student_id: studentId,
      applicant_id: applicantId,
      hod_approved: false,
      librarian_approved: false,
      accountant_approved: false,
      principal_approved: false,
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from('no_due_requests').insert(payload).select().single();
    if (error) throw error;
    return data as NoDueRequest;
  },

  async approve(requestId: string, role: ApproverRole, approverId: string) {
    const column = {
      HOD: 'hod_approved',
      LIBRARIAN: 'librarian_approved',
      ACCOUNTANT: 'accountant_approved',
      PRINCIPAL: 'principal_approved'
    }[role];

    const updates: any = {};
    updates[column] = true;

    const { data, error } = await supabase
      .from('no_due_requests')
      .update(updates)
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;
    return data as NoDueRequest;
  },

  subscribeToStudentRequests(studentId: string, cb: (req: NoDueRequest | null) => void) {
    const channel = supabase
      .channel(`no_due_requests_student_${studentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'no_due_requests', filter: `student_id=eq.${studentId}` }, (payload) => {
        cb(payload.new as NoDueRequest);
      })
      .subscribe();

    // Return unsubscribe function
    return () => { try { channel.unsubscribe(); } catch (_) {} };
  },

  async markFormGenerated(requestId: string) {
    const { data, error } = await supabase
      .from('no_due_requests')
      .update({ form_generated_at: new Date().toISOString() })
      .eq('id', requestId)
      .select()
      .single();
    if (error) throw error;
    return data as NoDueRequest;
  }
};

export default dueService;
