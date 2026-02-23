import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { ExternalLink, TrendingUp, Plus, RefreshCw, X } from 'lucide-react';
import { Department } from '../../types/user';
import { UserRole } from '../../types/user';
import { useAuth } from '../../contexts/AuthContext';
import { TechNews } from '../../services/newsService';
import newsService from '../../services/newsService';

interface DepartmentTechNewsProps {
  department: Department;
}

const DepartmentTechNews: React.FC<DepartmentTechNewsProps> = ({ department }) => {
  const { user } = useAuth();
  const [news, setNews] = useState<TechNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const canUploadNews = user?.role === UserRole.HOD || user?.role === UserRole.PRINCIPAL || user?.role === UserRole.ADMIN;

  // Load news on component mount and department change
  useEffect(() => {
    loadNews();
  }, [department]);

  // Set up auto-refresh every 12 hours
  useEffect(() => {
    const interval = setInterval(() => {
      loadNews(true); // Silent refresh
    }, 12 * 60 * 60 * 1000); // 12 hours

    return () => clearInterval(interval);
  }, [department]);

  const loadNews = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    
    try {
      const departmentNews = await newsService.getDepartmentNews(department);
      setNews(departmentNews);
    } catch (error) {
      console.error('Failed to load news:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await newsService.refreshNews(department);
      await loadNews();
    } catch (error) {
      console.error('Failed to refresh news:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadTitle.trim() || !uploadDescription.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setIsUploading(true);
    try {
      await newsService.addCustomNews({
        title: uploadTitle.trim(),
        description: uploadDescription.trim(),
        url: uploadUrl.trim() || '#',
        publishedAt: new Date().toISOString(),
        category: uploadCategory.trim() || 'General',
        department: department,
        author: user?.name || 'Unknown'
      });

      setShowUploadDialog(false);
      setUploadTitle('');
      setUploadDescription('');
      setUploadUrl('');
      setUploadCategory('');
      
      // Reload news to show the new item
      await loadNews();
    } catch (error) {
      console.error('Failed to upload news:', error);
      alert('Failed to upload news. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteNews = async (newsId: string) => {
    if (window.confirm('Are you sure you want to delete this news item?')) {
      try {
        await newsService.deleteCustomNews(newsId);
        await loadNews();
      } catch (error) {
        console.error('Failed to delete news:', error);
        alert('Failed to delete news. Please try again.');
      }
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Tech News</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card>
      <CardHeader>
          <div className="flex items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>{department} Tech News</span>
        </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              {canUploadNews && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUploadDialog(true)}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
            {news.length > 0 ? (
              news.map((item) => (
            <div
              key={item.id}
                  className="p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer relative group"
              onClick={() => window.open(item.url, '_blank')}
            >
              <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-sm leading-tight pr-8">{item.title}</h4>
                <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0 ml-2" />
              </div>
              <p className="text-xs text-muted-foreground mb-2">{item.description}</p>
              <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs">
                  {item.category}
                </Badge>
                      {item.source === 'custom' && (
                        <Badge variant="outline" className="text-xs">
                          Custom
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatTimeAgo(item.publishedAt)}</span>
                  </div>
                  
                  {/* Delete button for custom news */}
                  {canUploadNews && item.source === 'custom' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNews(item.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No tech news available</p>
                {canUploadNews && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setShowUploadDialog(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add News
                  </Button>
                )}
              </div>
            )}
        </div>
      </CardContent>
    </Card>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Tech News</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="news-title">Title *</Label>
              <Input
                id="news-title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Enter news title..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="news-description">Description *</Label>
              <Textarea
                id="news-description"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Enter news description..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="news-url">URL (optional)</Label>
              <Input
                id="news-url"
                value={uploadUrl}
                onChange={(e) => setUploadUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="news-category">Category (optional)</Label>
              <Input
                id="news-category"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                placeholder="e.g., AI/ML, Web Dev, Hardware"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowUploadDialog(false);
                  setUploadTitle('');
                  setUploadDescription('');
                  setUploadUrl('');
                  setUploadCategory('');
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpload}
                disabled={!uploadTitle.trim() || !uploadDescription.trim() || isUploading}
              >
                {isUploading ? 'Adding...' : 'Add News'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DepartmentTechNews;