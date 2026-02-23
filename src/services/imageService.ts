import { CampusImage } from '../types/carousel';

// In a real application, this would be replaced with actual API calls
export class ImageService {
  private static instance: ImageService;
  private images: CampusImage[] = [];

  private constructor() {
    // Initialize with mock data
    this.images = [
      {
        id: '1',
        url: '/src/assets/viet-college.jpg',
        title: 'VIET College Main Campus',
        uploadedBy: 'Principal',
        uploadedAt: '2024-01-15',
        department: 'ALL'
      },
      {
        id: '2',
        url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=400&fit=crop',
        title: 'Computer Science Laboratory',
        uploadedBy: 'HOD CSE',
        uploadedAt: '2024-01-14',
        department: 'CSE'
      },
      {
        id: '3',
        url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=400&fit=crop',
        title: 'Central Library & Learning Center',
        uploadedBy: 'Librarian',
        uploadedAt: '2024-01-13',
        department: 'ALL'
      },
      {
        id: '4',
        url: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&h=400&fit=crop',
        title: 'Mechanical Engineering Workshop',
        uploadedBy: 'HOD MECH',
        uploadedAt: '2024-01-12',
        department: 'MECH'
      },
      {
        id: '5',
        url: 'https://images.unsplash.com/photo-1487887235947-a955ef187fcc?w=800&h=400&fit=crop',
        title: 'Innovation & Research Center',
        uploadedBy: 'HOD ECE',
        uploadedAt: '2024-01-11',
        department: 'ECE'
      },
      {
        id: '6',
        url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=400&fit=crop',
        title: 'Student Activity Center',
        uploadedBy: 'HOD EEE',
        uploadedAt: '2024-01-10',
        department: 'EEE'
      },
      {
        id: '7',
        url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=400&fit=crop',
        title: 'Civil Engineering Lab',
        uploadedBy: 'HOD CIVIL',
        uploadedAt: '2024-01-09',
        department: 'CIVIL'
      },
      {
        id: '8',
        url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop',
        title: 'Aeronautical Engineering Facility',
        uploadedBy: 'HOD AME',
        uploadedAt: '2024-01-08',
        department: 'AME'
      }
    ];
  }

  public static getInstance(): ImageService {
    if (!ImageService.instance) {
      ImageService.instance = new ImageService();
    }
    return ImageService.instance;
  }

  // Get all images
  public async getAllImages(): Promise<CampusImage[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return [...this.images];
  }

  // Get images by department
  public async getImagesByDepartment(department: string): Promise<CampusImage[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.images.filter(img => img.department === department || img.department === 'ALL');
  }

  // Upload new image
  public async uploadImage(imageData: Omit<CampusImage, 'id' | 'uploadedAt'>): Promise<CampusImage> {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate upload time
    
    const newImage: CampusImage = {
      ...imageData,
      id: Date.now().toString(),
      uploadedAt: new Date().toISOString().split('T')[0]
    };

    this.images.push(newImage);
    return newImage;
  }

  // Delete image
  public async deleteImage(imageId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const index = this.images.findIndex(img => img.id === imageId);
    if (index !== -1) {
      this.images.splice(index, 1);
      return true;
    }
    return false;
  }

  // Get random images (for carousel display)
  public async getRandomImages(count: number = 5): Promise<CampusImage[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (this.images.length <= count) {
      return [...this.images];
    }
    
    const shuffled = [...this.images].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  // Convert file to base64
  public async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Validate file
  public validateFile(file: File): { isValid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return { isValid: false, error: 'Please select an image file' };
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { isValid: false, error: 'File size should be less than 5MB' };
    }

    return { isValid: true };
  }
}

export default ImageService.getInstance(); 