
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Book, Users, AlertTriangle, Calendar, Search, TrendingUp, BookOpen, Clock } from 'lucide-react';
import { databaseService } from '../../services/databaseService';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../contexts/AuthContext';

interface BookIssue {
  id: string;
  studentName: string;
  registerId: string;
  bookTitle: string;
  issueDate: string;
  dueDate: string;
  status: 'ISSUED' | 'OVERDUE' | 'RETURNED';
  daysOverdue?: number;
  fine: number;
}

const LibrarianDashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [libraryStats, setLibraryStats] = useState({
    totalBooks: 0,
    issuedBooks: 0,
    overdueBooks: 0,
    availableBooks: 0,
    totalFines: 0,
    activeUsers: 0
  });
  const [recentIssues, setRecentIssues] = useState<BookIssue[]>([]);
  const [overdueBooks, setOverdueBooks] = useState<BookIssue[]>([]);
  const [alerts, setAlerts] = useState<Array<{ type: string; message: string; count: number }>>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadLibraryData();
  }, []);

  const loadLibraryData = async () => {
    try {
      setLoading(true);
      
      // Load all books
      const books = await databaseService.getAllBooks();
      const totalBooks = books.reduce((sum, book) => sum + (book.total_copies || book.totalCopies || 0), 0);
      const availableBooks = books.reduce((sum, book) => sum + (book.available_copies || book.availableCopies || 0), 0);

      // Load all book issues
      const { data: issuesData, error: issuesError } = await supabase
        .from('book_issues')
        .select(`
          *,
          books!inner(id, title, author, isbn),
          students!inner(id, name, register_id)
        `)
        .order('issued_at', { ascending: false });

      if (issuesError) {
        console.error('Error loading book issues:', issuesError);
        return;
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const mappedIssues: BookIssue[] = (issuesData || []).map((issue: any) => {
        const dueDate = new Date(issue.due_date);
        const status = issue.status === 'RETURNED' ? 'RETURNED' : 
                      dueDate < now ? 'OVERDUE' : 'ISSUED';
        const daysOverdue = status === 'OVERDUE' ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        
        return {
          id: issue.id,
          bookTitle: issue.books?.title || 'Unknown',
          studentName: issue.students?.name || 'Unknown',
          registerId: issue.students?.register_id || 'N/A',
          issueDate: new Date(issue.issued_at).toISOString().split('T')[0],
          dueDate: issue.due_date,
          status: status,
          daysOverdue: daysOverdue,
          fine: parseFloat(issue.fine_amount || 0)
        };
      });

      // Calculate stats
      const activeIssues = mappedIssues.filter(issue => issue.status !== 'RETURNED');
      const overdueIssues = mappedIssues.filter(issue => issue.status === 'OVERDUE');
      const totalFines = mappedIssues.reduce((sum, issue) => sum + issue.fine, 0);
      
      // Get unique active users (students who have issued books)
      const activeUserIds = new Set(activeIssues.map(issue => {
        const issueData = issuesData?.find((i: any) => i.id === issue.id);
        return issueData?.student_id;
      }).filter(Boolean));
      
      // Recent issues (last 10)
      const recent = mappedIssues
        .filter(issue => issue.status !== 'RETURNED')
        .slice(0, 10);
      
      // Overdue books
      const overdue = overdueIssues;

      // Calculate alerts
      const dueToday = mappedIssues.filter(issue => {
        if (issue.status === 'RETURNED') return false;
        const due = new Date(issue.dueDate);
        const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
        return dueDateOnly.getTime() === today.getTime();
      }).length;

      const outOfStock = books.filter(book => (book.available_copies || book.availableCopies || 0) === 0).length;

      setLibraryStats({
        totalBooks,
        issuedBooks: activeIssues.length,
        overdueBooks: overdueIssues.length,
        availableBooks,
        totalFines,
        activeUsers: activeUserIds.size
      });

      setRecentIssues(recent);
      setOverdueBooks(overdue);

      setAlerts([
        { type: 'overdue', message: `${overdueIssues.length} books are overdue for return`, count: overdueIssues.length },
        { type: 'due', message: `${dueToday} books are due for return today`, count: dueToday },
        { type: 'stock', message: `${outOfStock} books are out of stock`, count: outOfStock },
        { type: 'fine', message: `₹${totalFines} total fine amount pending`, count: totalFines }
      ]);
    } catch (error) {
      console.error('Error loading library data:', error);
      toast({
        title: "Error",
        description: "Failed to load library data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReturned = async (issueId: string) => {
    try {
      const { error } = await supabase
        .from('book_issues')
        .update({ 
          status: 'RETURNED',
          returned_at: new Date().toISOString(),
          received_by: user?.id
        })
        .eq('id', issueId);

      if (error) throw error;
      
      await loadLibraryData();
      
      toast({
        title: "Book Returned",
        description: "Book has been marked as returned successfully.",
      });
    } catch (error) {
      console.error('Error marking book as returned:', error);
      toast({
        title: "Error",
        description: "Failed to mark book as returned.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ISSUED': return 'bg-blue-100 text-blue-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      case 'RETURNED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Library Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Welcome back, Library Manager</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <Input
            placeholder="Search books, students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <p>Loading library data...</p>
        </div>
      ) : (
        <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{libraryStats.totalBooks}</p>
                <p className="text-sm text-gray-600">Total Books</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{libraryStats.issuedBooks}</p>
                <p className="text-sm text-gray-600">Issued Books</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{libraryStats.overdueBooks}</p>
                <p className="text-sm text-gray-600">Overdue Books</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">{libraryStats.availableBooks}</p>
                <p className="text-sm text-gray-600">Available</p>
              </div>
              <Book className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-600">₹{libraryStats.totalFines}</p>
                <p className="text-sm text-gray-600">Total Fines</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-teal-600">{libraryStats.activeUsers}</p>
                <p className="text-sm text-gray-600">Active Users</p>
              </div>
              <TrendingUp className="h-8 w-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>Important Alerts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {alerts.map((alert, index) => (
              <div key={index} className="p-4 border rounded-lg bg-red-50 border-red-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">{alert.message}</p>
                  </div>
                  <Badge variant="destructive" className="ml-2">
                    {alert.count}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Recent Book Issues</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentIssues.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <p>No recent book issues</p>
                </div>
              ) : (
                recentIssues.map((issue) => (
                <div key={issue.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{issue.bookTitle}</h4>
                      <p className="text-sm text-gray-600">{issue.studentName} ({issue.registerId})</p>
                    </div>
                    <Badge className={getStatusColor(issue.status)}>
                      {issue.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Issue Date: </span>
                      <span className="font-medium">{issue.issueDate}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Due Date: </span>
                      <span className="font-medium">{issue.dueDate}</span>
                    </div>
                  </div>
                </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Overdue Books */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>Overdue Books</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overdueBooks.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <p>No overdue books</p>
                </div>
              ) : (
                overdueBooks.map((book) => (
                <div key={book.id} className="p-4 border rounded-lg bg-red-50 border-red-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{book.bookTitle}</h4>
                      <p className="text-sm text-gray-600">{book.studentName} ({book.registerId})</p>
                    </div>
                    <Badge variant="destructive">
                      {book.daysOverdue} days overdue
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Due Date: </span>
                      <span className="font-medium">{book.dueDate}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Fine: </span>
                      <span className="font-medium text-red-600">₹{book.fine}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline">
                        Send Reminder
                      </Button>
                      <Button size="sm" onClick={() => handleMarkReturned(book.id)}>
                        Mark Returned
                      </Button>
                    </div>
                  </div>
                </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
        </>
      )}
    </div>
  );
};

export default LibrarianDashboard;
