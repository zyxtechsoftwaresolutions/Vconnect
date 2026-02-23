import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  Calendar, 
  BookOpen, 
  Clock,
  Trash2,
  Plus,
  File
} from 'lucide-react';
import { UserRole, Department } from '../../types/user';
import { useAuth } from '../../contexts/AuthContext';

interface CurriculumDocument {
  id: string;
  name: string;
  type: string;
  fileName: string;
  fileSize: string;
  uploadedBy: string;
  uploadedAt: Date;
  department: Department;
  downloadCount: number;
  lastAccessed?: Date;
}

interface AcademicCurriculumProps {
  userRole: UserRole;
  userDepartment?: Department;
}

const AcademicCurriculum: React.FC<AcademicCurriculumProps> = ({ userRole, userDepartment }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<CurriculumDocument[]>([]);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('');
  const [documentName, setDocumentName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [userRole, userDepartment]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      // TODO: Load curriculum documents from database when the table is created
      // For now, we'll use an empty array
      setDocuments([]);
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const canUpload = userRole === UserRole.HOD || userRole === UserRole.ADMIN;

  const getDocumentIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('syllabus') || lowerType.includes('curriculum')) {
      return <BookOpen className="h-5 w-5 text-blue-600" />;
    } else if (lowerType.includes('timetable') || lowerType.includes('schedule')) {
      return <Clock className="h-5 w-5 text-green-600" />;
    } else if (lowerType.includes('calendar')) {
      return <Calendar className="h-5 w-5 text-purple-600" />;
    } else {
      return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'syllabus':
        return 'Syllabus';
      case 'mid1_timetable':
        return 'Mid-1 Timetable';
      case 'academic_calendar':
        return 'Academic Calendar';
      default:
        return 'Document';
    }
  };

  const getDocumentTypeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('syllabus') || lowerType.includes('curriculum')) {
      return 'bg-blue-100 text-blue-800';
    } else if (lowerType.includes('timetable') || lowerType.includes('schedule')) {
      return 'bg-green-100 text-green-800';
    } else if (lowerType.includes('calendar')) {
      return 'bg-purple-100 text-purple-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      alert('Please select a PDF file');
    }
  };

  const handleUpload = () => {
    if (!selectedFile || !documentName.trim()) {
      alert('Please select a file and enter a document name');
      return;
    }

    const newDocument: CurriculumDocument = {
      id: Date.now().toString(),
      name: documentName,
      type: documentType,
      fileName: selectedFile.name,
      fileSize: `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
      uploadedBy: `${user?.name} (${user?.role})`,
      uploadedAt: new Date(),
      department: userDepartment || Department.CSE,
      downloadCount: 0
    };

         setDocuments(prev => [newDocument, ...prev]);
     setSelectedFile(null);
     setDocumentName('');
     setDocumentType('');
     setIsUploadDialogOpen(false);
  };

  const handleDocumentAction = (document: CurriculumDocument, action: 'download' | 'view') => {
    // Check if document was previously accessed
    const isFirstTime = !document.lastAccessed;
    
    if (action === 'download' || isFirstTime) {
      // Simulate download
      console.log(`Downloading ${document.fileName}`);
      // Update download count and last accessed
      setDocuments(prev => prev.map(doc => 
        doc.id === document.id 
          ? { ...doc, downloadCount: doc.downloadCount + 1, lastAccessed: new Date() }
          : doc
      ));
      
      // Create a mock download link with actual file content
      const blob = new Blob(['Mock PDF content for ' + document.fileName], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = document.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Open document directly (simulate PDF viewer)
      console.log(`Opening ${document.fileName} directly`);
      // Update last accessed
      setDocuments(prev => prev.map(doc => 
        doc.id === document.id 
          ? { ...doc, lastAccessed: new Date() }
          : doc
      ));
      
      // Create a mock PDF viewer window
      const blob = new Blob(['Mock PDF content for ' + document.fileName], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      if (newWindow) {
        newWindow.onload = () => {
          URL.revokeObjectURL(url);
        };
      }
    }
  };

  const handleDeleteDocument = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Academic Curriculum</span>
          </CardTitle>
          {canUpload && (
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Upload Document</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Academic Document</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="documentName">Document Name</Label>
                    <Input
                      id="documentName"
                      value={documentName}
                      onChange={(e) => setDocumentName(e.target.value)}
                      placeholder="Enter document name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="documentType">Document Type</Label>
                    <Input
                      id="documentType"
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      placeholder="Enter document type (e.g., Syllabus, Timetable, Calendar)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="file">Select PDF File</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                    />
                  </div>
                  {selectedFile && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800">
                        Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
                      </p>
                    </div>
                  )}
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                      Cancel
                    </Button>
                                         <Button onClick={handleUpload} disabled={!selectedFile || !documentName.trim() || !documentType.trim()}>
                       Upload
                     </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Loading academic documents...</p>
          </div>
        ) : documents.length > 0 ? (
          <div className="space-y-4">
            {documents.map((document) => (
              <div
                key={document.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-muted rounded-lg">
                    {getDocumentIcon(document.type)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{document.name}</h4>
                      <Badge className={getDocumentTypeColor(document.type)}>
                        {getDocumentTypeLabel(document.type)}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-x-4">
                      <span>{document.fileName}</span>
                      <span>•</span>
                      <span>{document.fileSize}</span>
                      <span>•</span>
                      <span>Uploaded by {document.uploadedBy}</span>
                      <span>•</span>
                      <span>{formatDate(document.uploadedAt)}</span>
                      {document.lastAccessed && (
                        <>
                          <span>•</span>
                          <span>Last accessed: {formatDate(document.lastAccessed)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">
                    {document.downloadCount} downloads
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDocumentAction(document, document.lastAccessed ? 'view' : 'download')}
                    className="flex items-center space-x-1"
                  >
                    {document.lastAccessed ? (
                      <>
                        <Eye className="h-4 w-4" />
                        <span>View</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        <span>Download</span>
                      </>
                    )}
                  </Button>
                  {canUpload && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteDocument(document.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <File className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>No academic documents available</p>
            {canUpload && (
              <p className="text-sm mt-2">Upload documents to get started</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AcademicCurriculum; 