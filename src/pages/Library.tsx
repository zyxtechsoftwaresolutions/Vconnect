import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Book, Search, Plus, AlertTriangle, Users, BookOpen, CheckCircle,
  QrCode, Pencil, Trash2, IndianRupee, Loader2, ScanLine, UserPlus,
} from 'lucide-react';
import Loader from '../components/ui/loader';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { databaseService } from '../services/databaseService';
import { supabase, supabaseAdmin } from '../lib/supabase';
import QRScannerModal from '../components/library/QRScannerModal';
import StudentLibraryProfile from '../components/library/StudentLibraryProfile';

const db = supabaseAdmin || supabase;
const FINE_PER_DAY = 2;

const CATEGORIES = [
  'Computer Science', 'Electronics', 'Mechanical', 'Civil',
  'Mathematics', 'Physics', 'Chemistry', 'English',
  'Management', 'General', 'Reference', 'Other',
];

interface BookRecord {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
}

interface BookIssue {
  id: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  studentName: string;
  registerId: string;
  studentId: string;
  issueDate: string;
  dueDate: string;
  status: 'ISSUED' | 'OVERDUE' | 'RETURNED';
  daysOverdue: number;
  fineAmount: number;
  finePaid: boolean;
}

const Library: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [books, setBooks] = useState<BookRecord[]>([]);
  const [issues, setIssues] = useState<BookIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialogs
  const [showAddBook, setShowAddBook] = useState(false);
  const [editingBook, setEditingBook] = useState<BookRecord | null>(null);
  const [showIssueBook, setShowIssueBook] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Student QR profile
  const [scannedUserId, setScannedUserId] = useState<string | null>(null);

  // Issue form pre-fill from QR scan
  const [issueStudentId, setIssueStudentId] = useState('');
  const [issueRegisterId, setIssueRegisterId] = useState('');
  const [issueStudentName, setIssueStudentName] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadBooks(), loadIssues()]);
    } finally {
      setLoading(false);
    }
  };

  const loadBooks = async () => {
    const data = await databaseService.getAllBooks();
    setBooks(
      data.map((b: any) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        isbn: b.isbn,
        category: b.category,
        totalCopies: b.total_copies ?? b.totalCopies ?? 0,
        availableCopies: b.available_copies ?? b.availableCopies ?? 0,
      }))
    );
  };

  const loadIssues = async () => {
    const { data, error } = await db
      .from('book_issues')
      .select('*, books!inner(id, title, author), students!inner(id, name, register_id)')
      .order('issued_at', { ascending: false });

    if (error) { console.error(error); return; }

    const now = new Date();
    const mapped: BookIssue[] = (data || []).map((i: any) => {
      const due = new Date(i.due_date);
      const isOverdue = i.status !== 'RETURNED' && due < now;
      const daysOver = isOverdue ? Math.floor((now.getTime() - due.getTime()) / 86400000) : 0;
      const autoFine = isOverdue ? daysOver * FINE_PER_DAY : 0;
      const fine = Math.max(parseFloat(i.fine_amount || 0), autoFine);

      // Auto-update fine in DB for overdue
      if (isOverdue && fine > parseFloat(i.fine_amount || 0)) {
        db.from('book_issues').update({ fine_amount: fine, status: 'OVERDUE' }).eq('id', i.id).then(() => {});
      }

      return {
        id: i.id,
        bookId: i.books?.id,
        bookTitle: i.books?.title || 'Unknown',
        bookAuthor: i.books?.author || '',
        studentName: i.students?.name || 'Unknown',
        registerId: i.students?.register_id || '',
        studentId: i.student_id,
        issueDate: new Date(i.issued_at).toLocaleDateString('en-IN'),
        dueDate: i.due_date,
        status: i.status === 'RETURNED' ? 'RETURNED' : isOverdue ? 'OVERDUE' : 'ISSUED',
        daysOverdue: daysOver,
        fineAmount: fine,
        finePaid: !!i.fine_paid,
      };
    });
    setIssues(mapped);
  };

  // ── Book CRUD ──
  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const copies = parseInt(fd.get('copies') as string) || 1;
    try {
      const { error } = await db.from('books').insert([{
        title: fd.get('title'), author: fd.get('author'), isbn: fd.get('isbn'),
        category: fd.get('category'), total_copies: copies, available_copies: copies, added_by: user?.id,
      }]);
      if (error) throw error;
      toast({ title: 'Book Added', description: `"${fd.get('title')}" added to library.` });
      setShowAddBook(false);
      loadBooks();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to add book.', variant: 'destructive' });
    }
  };

  const handleEditBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;
    const fd = new FormData(e.target as HTMLFormElement);
    const newTotal = parseInt(fd.get('copies') as string) || editingBook.totalCopies;
    const diff = newTotal - editingBook.totalCopies;
    try {
      const { error } = await db.from('books').update({
        title: fd.get('title'), author: fd.get('author'), isbn: fd.get('isbn'),
        category: fd.get('category'), total_copies: newTotal,
        available_copies: Math.max(0, editingBook.availableCopies + diff),
      }).eq('id', editingBook.id);
      if (error) throw error;
      toast({ title: 'Book Updated' });
      setEditingBook(null);
      loadBooks();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteBook = async (bookId: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      const { error } = await db.from('books').delete().eq('id', bookId);
      if (error) throw error;
      toast({ title: 'Deleted', description: `"${title}" removed.` });
      loadBooks();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // ── Issue Book ──
  const handleIssueBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const bookId = fd.get('bookId') as string;
    let studentDbId = issueStudentId;

    if (!studentDbId) {
      const regId = (fd.get('registerId') as string).trim();
      const { data: sRec } = await db.from('students').select('id').eq('register_id', regId).maybeSingle();
      if (!sRec) {
        toast({ title: 'Student Not Found', description: 'No student with that Register ID.', variant: 'destructive' });
        return;
      }
      studentDbId = sRec.id;
    }

    const dueDays = parseInt(fd.get('dueDays') as string) || 15;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);

    try {
      const { error } = await db.from('book_issues').insert([{
        book_id: bookId, student_id: studentDbId,
        issued_by: user?.id, due_date: dueDate.toISOString().split('T')[0],
        status: 'ISSUED', fine_amount: 0, fine_paid: false,
      }]);
      if (error) throw error;

      // Decrement available copies
      const book = books.find(b => b.id === bookId);
      if (book && book.availableCopies > 0) {
        await db.from('books').update({ available_copies: book.availableCopies - 1 }).eq('id', bookId);
      }

      toast({ title: 'Book Issued', description: `Issued for ${dueDays} days.` });
      setShowIssueBook(false);
      resetIssueForm();
      loadAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleReturn = async (issueId: string, bookId: string) => {
    try {
      await db.from('book_issues')
        .update({ status: 'RETURNED', returned_at: new Date().toISOString(), received_by: user?.id })
        .eq('id', issueId);

      const book = books.find(b => b.id === bookId);
      if (book) {
        await db.from('books').update({ available_copies: book.availableCopies + 1 }).eq('id', bookId);
      }

      toast({ title: 'Returned' });
      loadAll();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleCollectFine = async (issueId: string, amount: number) => {
    try {
      await db.from('book_issues').update({ fine_paid: true }).eq('id', issueId);
      toast({ title: 'Fine Collected', description: `₹${amount} collected.` });
      loadIssues();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const resetIssueForm = () => {
    setIssueStudentId('');
    setIssueRegisterId('');
    setIssueStudentName('');
  };

  const openIssueFromProfile = (studentId: string, registerId: string, studentName: string) => {
    setIssueStudentId(studentId);
    setIssueRegisterId(registerId);
    setIssueStudentName(studentName);
    setShowIssueBook(true);
  };

  const handleQRScan = (userId: string) => {
    setShowQRScanner(false);
    setScannedUserId(userId);
  };

  // ── Stats ──
  const activeIssues = issues.filter(i => i.status !== 'RETURNED');
  const overdueIssues = issues.filter(i => i.status === 'OVERDUE');
  const pendingFines = issues.filter(i => i.fineAmount > 0 && !i.finePaid);
  const totalFineAmount = pendingFines.reduce((s, i) => s + i.fineAmount, 0);
  const totalBooks = books.reduce((s, b) => s + b.totalCopies, 0);
  const availableBooks = books.reduce((s, b) => s + b.availableCopies, 0);

  const filteredBooks = books.filter(b =>
    b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.isbn.includes(searchTerm)
  );

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Library Management</h1>
          <p className="text-gray-600">Manage books, issue/return, fines &amp; scan student IDs</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowQRScanner(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <ScanLine className="h-4 w-4 mr-1" /> Scan Student QR
          </Button>
          <Button variant="outline" onClick={() => { resetIssueForm(); setShowIssueBook(true); }}>
            <UserPlus className="h-4 w-4 mr-1" /> Issue Book
          </Button>
          <Button onClick={() => setShowAddBook(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Book
          </Button>
        </div>
      </div>

      {/* Scanned Student Profile */}
      {scannedUserId && (
        <StudentLibraryProfile
          userId={scannedUserId}
          onClose={() => setScannedUserId(null)}
          onIssueBook={openIssueFromProfile}
          onRefresh={loadAll}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={BookOpen} label="Total Books" value={totalBooks} color="blue" />
        <StatCard icon={Book} label="Available" value={availableBooks} color="green" />
        <StatCard icon={Users} label="Issued" value={activeIssues.length} color="purple" />
        <StatCard icon={AlertTriangle} label="Overdue" value={overdueIssues.length} color="red" />
        <StatCard icon={IndianRupee} label="Fine Pending" value={`₹${totalFineAmount}`} color="orange" />
        <StatCard icon={CheckCircle} label="Returned" value={issues.filter(i => i.status === 'RETURNED').length} color="teal" />
      </div>

      {/* Main content tabs */}
      <Tabs defaultValue="books" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
          <TabsTrigger value="books">Books Inventory ({books.length})</TabsTrigger>
          <TabsTrigger value="issues">
            Current Issues ({activeIssues.length})
            {overdueIssues.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 rounded-full">{overdueIssues.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="fines">
            Fines ({pendingFines.length})
          </TabsTrigger>
        </TabsList>

        {/* ═══ BOOKS TAB ═══ */}
        <TabsContent value="books" className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by title, author, or ISBN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          {loading ? (
            <Loader size="sm" text="Loading..." />
          ) : filteredBooks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No books found. Add your first book.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredBooks.map(book => (
                <Card key={book.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm truncate">{book.title}</h3>
                        <p className="text-xs text-gray-500">{book.author}</p>
                        <p className="text-[10px] text-gray-400 font-mono">ISBN: {book.isbn}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 ml-2">{book.category}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                      <div className="text-center p-1 bg-gray-50 rounded">
                        <p className="font-bold">{book.totalCopies}</p><p className="text-gray-500">Total</p>
                      </div>
                      <div className="text-center p-1 bg-green-50 rounded">
                        <p className="font-bold text-green-700">{book.availableCopies}</p><p className="text-gray-500">Available</p>
                      </div>
                      <div className="text-center p-1 bg-blue-50 rounded">
                        <p className="font-bold text-blue-700">{book.totalCopies - book.availableCopies}</p><p className="text-gray-500">Issued</p>
                      </div>
                    </div>
                    <div className="flex gap-1 mt-3">
                      <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={() => setEditingBook(book)}>
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs flex-1 text-red-600 hover:text-red-700" onClick={() => handleDeleteBook(book.id, book.title)}>
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══ ISSUES TAB ═══ */}
        <TabsContent value="issues" className="mt-4">
          {activeIssues.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No active issues.</div>
          ) : (
            <div className="space-y-2">
              {activeIssues.map(issue => (
                <div
                  key={issue.id}
                  className={`p-3 rounded-lg border flex items-center gap-3 ${
                    issue.status === 'OVERDUE' ? 'border-red-200 bg-red-50/50' : 'border-gray-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{issue.bookTitle}</p>
                    <p className="text-xs text-gray-600">{issue.studentName} ({issue.registerId})</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Issued: {issue.issueDate} &bull; Due: {issue.dueDate}
                      {issue.status === 'OVERDUE' && (
                        <span className="text-red-600 font-semibold ml-1">
                          ({issue.daysOverdue}d overdue &bull; ₹{issue.fineAmount})
                        </span>
                      )}
                    </p>
                  </div>
                  <Badge variant="outline" className={issue.status === 'OVERDUE' ? 'border-red-300 text-red-700' : ''}>
                    {issue.status}
                  </Badge>
                  <div className="flex gap-1 shrink-0">
                    {issue.status === 'OVERDUE' && issue.fineAmount > 0 && !issue.finePaid && (
                      <Button size="sm" variant="outline" className="h-7 text-xs text-orange-700" onClick={() => handleCollectFine(issue.id, issue.fineAmount)}>
                        ₹{issue.fineAmount}
                      </Button>
                    )}
                    <Button size="sm" className="h-7 text-xs" onClick={() => handleReturn(issue.id, issue.bookId)}>
                      <CheckCircle className="h-3 w-3 mr-1" /> Return
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══ FINES TAB ═══ */}
        <TabsContent value="fines" className="mt-4 space-y-3">
          <Card className="border-orange-200 bg-orange-50/50">
            <CardContent className="py-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-orange-800 text-lg">₹{totalFineAmount}</p>
                <p className="text-xs text-orange-700">Total pending fines from {pendingFines.length} issue(s)</p>
              </div>
              <IndianRupee className="h-8 w-8 text-orange-500" />
            </CardContent>
          </Card>

          <p className="text-xs text-gray-500">Fine rate: ₹{FINE_PER_DAY}/day overdue. Auto-calculated when due date passes.</p>

          {pendingFines.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">No pending fines.</div>
          ) : (
            pendingFines.map(f => (
              <div key={f.id} className="p-3 border border-orange-200 rounded-lg bg-orange-50/30 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{f.bookTitle}</p>
                  <p className="text-xs text-gray-600">{f.studentName} ({f.registerId})</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    {f.daysOverdue} days overdue &bull; Due: {f.dueDate}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-orange-700 text-lg">₹{f.fineAmount}</p>
                  <Button
                    size="sm"
                    className="h-7 text-xs mt-1 bg-orange-600 hover:bg-orange-700"
                    onClick={() => handleCollectFine(f.id, f.fineAmount)}
                  >
                    Collect Fine
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* ═══ QR Scanner Modal ═══ */}
      <QRScannerModal
        open={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRScan}
      />

      {/* ═══ Add Book Dialog ═══ */}
      <Dialog open={showAddBook} onOpenChange={setShowAddBook}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Book</DialogTitle></DialogHeader>
          <BookForm onSubmit={handleAddBook} onCancel={() => setShowAddBook(false)} />
        </DialogContent>
      </Dialog>

      {/* ═══ Edit Book Dialog ═══ */}
      <Dialog open={!!editingBook} onOpenChange={() => setEditingBook(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Book</DialogTitle></DialogHeader>
          {editingBook && (
            <BookForm
              onSubmit={handleEditBook}
              onCancel={() => setEditingBook(null)}
              initial={editingBook}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ Issue Book Dialog ═══ */}
      <Dialog open={showIssueBook} onOpenChange={(v) => { if (!v) { setShowIssueBook(false); resetIssueForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Issue Book to Student</DialogTitle></DialogHeader>
          <form onSubmit={handleIssueBook} className="space-y-4">
            {issueStudentName && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm">
                Issuing to: <strong>{issueStudentName}</strong> ({issueRegisterId})
              </div>
            )}
            <div>
              <Label>Select Book</Label>
              <Select name="bookId" required>
                <SelectTrigger><SelectValue placeholder="Choose a book" /></SelectTrigger>
                <SelectContent>
                  {books.filter(b => b.availableCopies > 0).map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.title} ({b.availableCopies} avail.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!issueStudentId && (
              <div>
                <Label>Student Register ID</Label>
                <Input
                  name="registerId"
                  required
                  placeholder="e.g., 23NT1A0552"
                  defaultValue={issueRegisterId}
                />
              </div>
            )}
            <div>
              <Label>Due in (days)</Label>
              <Input name="dueDays" type="number" defaultValue={15} min={1} max={90} />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Issue Book</Button>
              <Button type="button" variant="outline" onClick={() => { setShowIssueBook(false); resetIssueForm(); }}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Reusable Book Form ──
const BookForm: React.FC<{
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  initial?: BookRecord;
}> = ({ onSubmit, onCancel, initial }) => (
  <form onSubmit={onSubmit} className="space-y-3">
    <div>
      <Label>Title</Label>
      <Input name="title" required defaultValue={initial?.title} placeholder="Book title" />
    </div>
    <div>
      <Label>Author</Label>
      <Input name="author" required defaultValue={initial?.author} placeholder="Author name" />
    </div>
    <div>
      <Label>ISBN</Label>
      <Input name="isbn" required defaultValue={initial?.isbn} placeholder="ISBN number" />
    </div>
    <div>
      <Label>Category</Label>
      <Select name="category" required defaultValue={initial?.category}>
        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
        <SelectContent>
          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    <div>
      <Label>Number of Copies</Label>
      <Input name="copies" type="number" min={1} required defaultValue={initial?.totalCopies || 1} />
    </div>
    <div className="flex gap-2">
      <Button type="submit">{initial ? 'Update' : 'Add Book'}</Button>
      <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
    </div>
  </form>
);

// ── Stat Card ──
const StatCard: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
}> = ({ icon: Icon, label, value, color }) => (
  <Card>
    <CardContent className="p-4 flex items-center justify-between">
      <div>
        <p className={`text-xl font-bold text-${color}-600`}>{value}</p>
        <p className="text-xs text-gray-600">{label}</p>
      </div>
      <Icon className={`h-7 w-7 text-${color}-500`} />
    </CardContent>
  </Card>
);

export default Library;
