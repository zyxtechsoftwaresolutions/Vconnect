import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Book, Calendar, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface IssuedBook {
  id: string;
  title: string;
  author: string;
  issueDate: string;
  dueDate: string;
  status: 'ISSUED' | 'OVERDUE';
  fine: number;
}

const LibrarySection: React.FC = () => {
  const { user } = useAuth();
  const [issuedBooks, setIssuedBooks] = useState<IssuedBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIssuedBooks();
  }, [user]);

  const loadIssuedBooks = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // First, get the student record for this user
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (studentError || !studentData) {
        setIssuedBooks([]);
        setLoading(false);
        return;
      }

      // Get book issues for this student (excluding returned books)
      const { data: issuesData, error: issuesError } = await supabase
        .from('book_issues')
        .select(`
          *,
          books!inner(id, title, author, isbn)
        `)
        .eq('student_id', studentData.id)
        .neq('status', 'RETURNED')
        .order('issued_at', { ascending: false });

      if (issuesError) {
        console.error('Error loading issued books:', issuesError);
        setIssuedBooks([]);
      } else {
        const mappedBooks: IssuedBook[] = (issuesData || []).map((issue: any) => {
          const dueDate = new Date(issue.due_date);
          const now = new Date();
          const status = dueDate < now ? 'OVERDUE' : 'ISSUED';
          
          return {
            id: issue.id,
            title: issue.books?.title || 'Unknown',
            author: issue.books?.author || 'Unknown',
            issueDate: new Date(issue.issued_at).toISOString().split('T')[0],
            dueDate: issue.due_date,
            status: status,
            fine: parseFloat(issue.fine_amount || 0)
          };
        });
        setIssuedBooks(mappedBooks);
      }
    } catch (error) {
      console.error('Error loading issued books:', error);
      setIssuedBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'ISSUED': return 'bg-blue-100 text-blue-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalFine = issuedBooks.reduce((sum, book) => sum + book.fine, 0);
  const overdueCount = issuedBooks.filter(book => book.status === 'OVERDUE').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Book className="h-5 w-5" />
          <span>My Library</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{issuedBooks.length}</p>
              <p className="text-sm text-gray-600">Books Issued</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
              <p className="text-sm text-gray-600">Overdue</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">₹{totalFine}</p>
              <p className="text-sm text-gray-600">Total Fine</p>
            </div>
          </div>

          {/* Books List */}
          {loading ? (
            <div className="text-center py-6 text-gray-500">
              <p>Loading...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {issuedBooks.map((book) => (
              <div key={book.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-sm">{book.title}</h4>
                    <p className="text-xs text-gray-600">{book.author}</p>
                  </div>
                  <Badge className={getStatusColor(book.status)}>
                    {book.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Issue: </span>
                    <span>{book.issueDate}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Due: </span>
                    <span>{book.dueDate}</span>
                  </div>
                </div>
                {book.fine > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <span className="text-red-600 text-xs font-medium">Fine: ₹{book.fine}</span>
                  </div>
                )}
              </div>
              ))}
            </div>
          )}

          {!loading && issuedBooks.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <Book className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No books currently issued</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LibrarySection;