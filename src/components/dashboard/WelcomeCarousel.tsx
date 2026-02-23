import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Upload, X, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/user';
import { CampusImage } from '../../types/carousel';
import imageService from '../../services/imageService';
import vietCollege from '../../assets/viet-college.jpg';

interface WelcomeCarouselProps {
  userName: string;
  userRole: string;
}

const WelcomeCarousel: React.FC<WelcomeCarouselProps> = ({ userName, userRole }) => {
  const { user } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [campusImages, setCampusImages] = useState<CampusImage[]>([]);
  const [displayedImages, setDisplayedImages] = useState<CampusImage[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cycleCount = useRef(0);

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return `${greeting}, ${userName}!`;
  };

  const getTagline = () => {
    const taglines = [
      "Excellence in Education, Innovation in Learning",
      "Shaping Tomorrow's Leaders Today",
      "Where Knowledge Meets Innovation",
      "Building Bridges to Success",
      "Empowering Minds, Transforming Lives"
    ];
    return taglines[Math.floor(Math.random() * taglines.length)];
  };

  // Load images from service
  useEffect(() => {
    const loadImages = async () => {
      try {
        setIsLoading(true);
        const images = await imageService.getAllImages();
        setCampusImages(images);
      } catch (error) {
        console.error('Failed to load images:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadImages();
  }, []);

  // Update displayed images when campus images change
  useEffect(() => {
    if (campusImages.length > 0) {
      const loadRandomImages = async () => {
        const randomImages = await imageService.getRandomImages(5);
        setDisplayedImages(randomImages);
      };
      loadRandomImages();
    }
  }, [campusImages]);

  // Welcome message cycle
  useEffect(() => {
    const welcomeTimer = setTimeout(() => {
      setShowWelcome(false);
    }, 5000);

    return () => clearTimeout(welcomeTimer);
  }, []);

  // Carousel cycling logic
  useEffect(() => {
    if (!showWelcome && displayedImages.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => {
          const nextSlide = (prev + 1) % displayedImages.length;
          
          // If we've completed a full cycle of photos, show welcome message
          if (nextSlide === 0) {
            cycleCount.current += 1;
            // After every 2 cycles of photos, show welcome message
            if (cycleCount.current % 2 === 0) {
              setShowWelcome(true);
              // Select new random images for next cycle
              const loadNewRandomImages = async () => {
                const newRandomImages = await imageService.getRandomImages(5);
                setDisplayedImages(newRandomImages);
              };
              loadNewRandomImages();
              setTimeout(() => setShowWelcome(false), 5000);
              return 0;
            }
          }
          
          return nextSlide;
        });
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [showWelcome, displayedImages.length, campusImages]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % displayedImages.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + displayedImages.length) % displayedImages.length);
  };

  const canUploadImages = user?.role === UserRole.HOD || user?.role === UserRole.PRINCIPAL || user?.role === UserRole.ADMIN;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validation = imageService.validateFile(file);
      if (!validation.isValid) {
        alert(validation.error);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadTitle.trim()) {
      alert('Please select a file and enter a title');
      return;
    }

    setIsUploading(true);

    try {
      const base64Url = await imageService.fileToBase64(selectedFile);
      const newImage = await imageService.uploadImage({
        url: base64Url,
        title: uploadTitle.trim(),
        uploadedBy: user?.name || 'Unknown',
        department: user?.department || 'ALL'
      });

      setCampusImages(prev => [...prev, newImage]);
      setShowUploadDialog(false);
      setUploadTitle('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (window.confirm('Are you sure you want to delete this image?')) {
      try {
        const success = await imageService.deleteImage(imageId);
        if (success) {
          setCampusImages(prev => prev.filter(img => img.id !== imageId));
        }
      } catch (error) {
        console.error('Delete failed:', error);
        alert('Failed to delete image. Please try again.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="relative h-48 bg-gradient-to-r from-muted via-muted/90 to-muted/80 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (showWelcome) {
    return (
      <div className="relative h-48 bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground rounded-lg overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex flex-col justify-center h-full px-4 sm:px-6 lg:px-8">
          <div className="animate-fade-in">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">{getWelcomeMessage()}</h1>
            <p className="text-sm sm:text-base lg:text-lg text-primary-foreground/90 mb-3">{getTagline()}</p>
            <p className="text-xs sm:text-sm lg:text-base text-primary-foreground/80">
              Welcome to V Connect Portal. You are logged in as {userRole}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (displayedImages.length === 0) {
    return (
      <div className="relative h-48 bg-gradient-to-r from-muted via-muted/90 to-muted/80 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No campus images uploaded yet</p>
          {canUploadImages && (
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setShowUploadDialog(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Images
            </Button>
          )}
        </div>
      </div>
    );
  }

  const currentImage = displayedImages[currentSlide];

  return (
    <>
      <div className="relative h-48 rounded-lg overflow-hidden group">
        <div className="absolute inset-0">
          <img
            src={currentImage.url}
            alt={currentImage.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent"></div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 lg:p-6 text-white">
          <h3 className="text-base sm:text-lg lg:text-xl font-semibold mb-1">{currentImage.title}</h3>
          <p className="text-xs sm:text-sm text-white/80">
            Uploaded by {currentImage.uploadedBy} • {new Date(currentImage.uploadedAt).toLocaleDateString()}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={prevSlide}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={nextSlide}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        <div className="absolute bottom-2 right-2 flex space-x-1">
          {displayedImages.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentSlide ? 'bg-white' : 'bg-white/50'
              }`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>

        {canUploadImages && (
          <div className="absolute top-2 right-2 flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setShowUploadDialog(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleDeleteImage(currentImage.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Upload Campus Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image-title">Image Title</Label>
              <Input
                id="image-title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Enter image title..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="image-file">Select Image</Label>
              <Input
                id="image-file"
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
              {selectedFile && (
                <p className="text-sm text-gray-600">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowUploadDialog(false);
                  setUploadTitle('');
                  setSelectedFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpload}
                disabled={!selectedFile || !uploadTitle.trim() || isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WelcomeCarousel;