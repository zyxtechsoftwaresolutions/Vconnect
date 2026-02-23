import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  X, BookOpen, AlertTriangle, IndianRupee, Clock,
  CheckCircle, Loader2,
} from 'lucide-react';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { useToast } from '../../hooks/use-toast';

const db = supabaseAdmin || supabase;

const FINE_PER_DAY = 2; // ₹2 per day overdue

interface StudentInfo {
  userId: string;
  name: string;
  email: string;
  department: string;
  registerId: string;
  studentClass: string;
  profilePicture?: string;
}

interface IssuedBook {
  issueId: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  issuedAt: string;
  dueDate: string;
  status: 'ISSUED' | 'OVERDUE' | 'RETURNED';
  daysOverdue: number;
  fineAmount: number;
  finePaid: boolean;
}

interface Props {
  userId: string;
  onClose: () => void;
  onIssueBook: (studentId: string, registerId: string, studentName: string) => void;
  onRefresh: () => void;
}

const StudentLibraryProfile: React.FC<Props> = ({ userId, onClose, onIssueBook, onRefresh }) => {
  const { toast } = useToast();
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [books, setBooks] = useState<IssuedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentDbId, setStudentDbId] = useState<string>('');

  useEffect(() => {
    loadStudentProfile();
  }, [userId]);

  const loadStudentProfile = async () => {
    setLoading(true);
    try {
      // Try by user ID first
      let userRec: any = null;
      let studentRec: any = null;

      const { data: uData } = await db
        .from('users')
        .select('id, name, email, department, profile_picture')
        .eq('id', userId)
        .maybeSingle();

      if (uData) {
        userRec = uData;
        const { data: sData } = await db
          .from('students')
          .select('id, register_id, class, department, name')
          .eq('user_id', userId)
          .maybeSingle();
        studentRec = sData;
      } else {
        // Try by register_id
        const { data: sData } = await db
          .from('students')
          .select('id, user_id, register_id, class, department, name, email')
          .or(`register_id.ilike.${userId},email.ilike.${userId}`)
          .maybeSingle();
        if (sData) {
          studentRec = sData;
          if (sData.user_id) {
            const { data: u2 } = await db
              .from('users')
              .select('id, name, email, department, profile_picture')
              .eq('id', sData.user_id)
              .maybeSingle();
            userRec = u2;
          }
        }
      }

      if (!studentRec && !userRec) {
        toast({ title: 'Not Found', description: 'Student not found. Please try again.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const sId = studentRec?.id || '';
      setStudentDbId(sId);

      setStudent({
        userId: userRec?.id || studentRec?.user_id || '',
        name: userRec?.name || studentRec?.name || 'Unknown',
        email: userRec?.email || studentRec?.email || '',
        department: userRec?.department || studentRec?.department || '',
        registerId: studentRec?.register_id || '',
        studentClass: studentRec?.class || '',
        profilePicture: userRec?.profile_picture || undefined,
      });

      // Load issued books
      if (sId) {
        const { data: issues } = await db
          .from('book_issues')
          .select('id, book_id, issued_at, due_date, status, fine_amount, fine_paid, books!inner(title, author)')
          .eq('student_id', sId)
          .order('issued_at', { ascending: false });

        const now = new Date();
        const mapped: IssuedBook[] = (issues || []).map((i: any) => {
          const due = new Date(i.due_date);
          const isOverdue = i.status !== 'RETURNED' && due < now;
          const daysOver = isOverdue ? Math.floor((now.getTime() - due.getTime()) / 86400000) : 0;
          const autoFine = isOverdue ? daysOver * FINE_PER_DAY : 0;
          const fineAmt = Math.max(parseFloat(i.fine_amount || 0), autoFine);

          return {
            issueId: i.id,
            bookId: i.book_id,
            bookTitle: i.books?.title || 'Unknown',
            bookAuthor: i.books?.author || '',
            issuedAt: new Date(i.issued_at).toLocaleDateString('en-IN'),
            dueDate: i.due_date,
            status: i.status === 'RETURNED' ? 'RETURNED' : isOverdue ? 'OVERDUE' : 'ISSUED',
            daysOverdue: daysOver,
            fineAmount: fineAmt,
            finePaid: !!i.fine_paid,
          };
        });

        // Auto-update fines for overdue books in DB
        for (const b of mapped) {
          if (b.status === 'OVERDUE' && b.fineAmount > 0) {
            await db
              .from('book_issues')
              .update({ fine_amount: b.fineAmount, status: 'OVERDUE' })
              .eq('id', b.issueId);
          }
        }

        setBooks(mapped);
      }
    } catch (err) {
      console.error('Error loading student profile:', err);
      toast({ title: 'Error', description: 'Failed to load student data.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (issueId: string, bookId: string) => {
    try {
      await db
        .from('book_issues')
        .update({ status: 'RETURNED', returned_at: new Date().toISOString() })
        .eq('id', issueId);

      // Increment available copies
      const { data: book } = await db.from('books').select('available_copies').eq('id', bookId).single();
      if (book) {
        await db.from('books').update({ available_copies: (book.available_copies || 0) + 1 }).eq('id', bookId);
      }

      toast({ title: 'Returned', description: 'Book marked as returned.' });
      loadStudentProfile();
      onRefresh();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to return book.', variant: 'destructive' });
    }
  };

  const handleCollectFine = async (issueId: string, amount: number) => {
    try {
      await db
        .from('book_issues')
        .update({ fine_paid: true })
        .eq('id', issueId);

      toast({ title: 'Fine Collected', description: `₹${amount} fine collected successfully.` });
      loadStudentProfile();
      onRefresh();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to collect fine.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <Card className="border-blue-200">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
          Loading student profile...
        </CardContent>
      </Card>
    );
  }

  if (!student) {
    return (
      <Card className="border-red-200">
        <CardContent className="text-center py-8 text-red-600">
          Student not found.
          <Button variant="ghost" size="sm" className="ml-2" onClick={onClose}>Close</Button>
        </CardContent>
      </Card>
    );
  }

  const activeBooks = books.filter(b => b.status !== 'RETURNED');
  const overdueBooks = books.filter(b => b.status === 'OVERDUE');
  const totalPendingFine = books
    .filter(b => b.fineAmount > 0 && !b.finePaid)
    .reduce((sum, b) => sum + b.fineAmount, 0);

  return (
    <Card className="border-blue-300 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Student Library Profile</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Student info */}
        <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
          <Avatar className="h-16 w-16 border-2 border-white shadow">
            <AvatarImage src={student.profilePicture} alt={student.name} />
            <AvatarFallback className="text-lg bg-blue-200 text-blue-800">
              {student.name?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-lg">{student.name}</h3>
            <p className="text-sm text-gray-600 font-mono">{student.registerId}</p>
            <p className="text-xs text-gray-500">{student.department} &bull; {student.studentClass} &bull; {student.email}</p>
          </div>
          <Button size="sm" onClick={() => onIssueBook(studentDbId, student.registerId, student.name)}>
            <BookOpen className="h-4 w-4 mr-1" />
            Issue Book
          </Button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-2">
          <StatTile icon={BookOpen} label="Active" value={activeBooks.length} color="blue" />
          <StatTile icon={AlertTriangle} label="Overdue" value={overdueBooks.length} color="red" />
          <StatTile icon={IndianRupee} label="Fine Due" value={`₹${totalPendingFine}`} color="orange" />
          <StatTile icon={CheckCircle} label="Returned" value={books.filter(b => b.status === 'RETURNED').length} color="green" />
        </div>

        {/* Active books */}
        {activeBooks.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Currently Issued ({activeBooks.length})</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {activeBooks.map(b => (
                <div
                  key={b.issueId}
                  className={`p-3 rounded-lg border ${b.status === 'OVERDUE' ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{b.bookTitle}</p>
                      <p className="text-xs text-gray-500">{b.bookAuthor}</p>
                      <p className="text-xs mt-1">
                        <span className="text-gray-500">Issued: {b.issuedAt}</span>
                        <span className="mx-1">&bull;</span>
                        <span className={b.status === 'OVERDUE' ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                          Due: {b.dueDate}
                        </span>
                      </p>
                      {b.status === 'OVERDUE' && (
                        <p className="text-xs text-red-600 font-semibold mt-0.5">
                          {b.daysOverdue} days overdue &bull; Fine: ₹{b.fineAmount}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 ml-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={b.status === 'OVERDUE' ? 'border-red-300 text-red-700 text-[10px]' : 'text-[10px]'}
                      >
                        {b.status}
                      </Badge>
                      <Button size="sm" className="h-7 text-xs" onClick={() => handleReturn(b.issueId, b.bookId)}>
                        Return
                      </Button>
                      {b.status === 'OVERDUE' && b.fineAmount > 0 && !b.finePaid && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-orange-700 border-orange-300 hover:bg-orange-50"
                          onClick={() => handleCollectFine(b.issueId, b.fineAmount)}
                        >
                          Collect ₹{b.fineAmount}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeBooks.length === 0 && (
          <div className="text-center py-4 text-sm text-gray-500">
            No books currently issued to this student.
          </div>
        )}

        {/* Return history */}
        {books.filter(b => b.status === 'RETURNED').length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-gray-600 mb-1">
              Return History ({books.filter(b => b.status === 'RETURNED').length})
            </summary>
            <div className="space-y-1 max-h-32 overflow-y-auto mt-1">
              {books.filter(b => b.status === 'RETURNED').map(b => (
                <div key={b.issueId} className="flex justify-between items-center py-1 px-2 bg-gray-50 rounded text-xs">
                  <span className="truncate">{b.bookTitle}</span>
                  <span className="text-gray-400 shrink-0 ml-2">{b.issuedAt}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
};

const StatTile: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
}> = ({ icon: Icon, label, value, color }) => (
  <div className={`text-center p-2 rounded-lg bg-${color}-50 border border-${color}-100`}>
    <Icon className={`h-4 w-4 mx-auto text-${color}-600 mb-0.5`} />
    <p className={`text-lg font-bold text-${color}-700`}>{value}</p>
    <p className="text-[10px] text-gray-500">{label}</p>
  </div>
);

export default StudentLibraryProfile;
