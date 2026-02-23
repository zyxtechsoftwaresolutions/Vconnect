import { Department } from '../types/user';
import { databaseService } from './databaseService';

export interface TechNews {
  id: string;
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  category: string;
  source: 'api' | 'custom';
  department: Department;
  imageUrl?: string;
  author?: string;
}

// Department-specific search keywords
const departmentKeywords: Record<Department, string[]> = {
  [Department.CSE]: ['artificial intelligence', 'machine learning', 'software development', 'programming'],
  [Department.ECE]: ['electronics', 'communication', '5G technology', 'IoT', 'semiconductor'],
  [Department.EEE]: ['electrical engineering', 'power systems', 'renewable energy', 'smart grid'],
  [Department.CIVIL]: ['civil engineering', 'construction', 'infrastructure', 'smart cities'],
  [Department.MECH]: ['mechanical engineering', 'manufacturing', 'robotics', 'automation'],
  [Department.AME]: ['aerospace engineering', 'aviation', 'space technology', 'propulsion'],
  [Department.MBA]: ['business technology', 'digital transformation', 'fintech', 'business analytics'],
  [Department.MCA]: ['computer applications', 'software engineering', 'database management'],
  [Department.DIPLOMA]: ['technical skills', 'practical engineering', 'industrial automation'],
  [Department.BBA]: ['business administration', 'management technology', 'business analytics'],
  [Department.BCA]: ['computer applications', 'application development', 'software development'],
  [Department.BSH]: ['basic sciences', 'humanities', 'engineering fundamentals', 'first year', 'foundation courses']
};

export class NewsService {
  private static instance: NewsService;
  private customNews: TechNews[] = [];
  private lastFetchTime: Record<Department, number> = {} as Record<Department, number>;
  private cachedNews: Record<Department, TechNews[]> = {} as Record<Department, TechNews[]>;
  private readonly CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

  private constructor() {
    this.initializeCustomNews();
  }

  public static getInstance(): NewsService {
    if (!NewsService.instance) {
      NewsService.instance = new NewsService();
    }
    return NewsService.instance;
  }

  private initializeCustomNews(): void {
    this.customNews = [
      {
        id: 'custom-1',
        title: 'VIET College Tech Innovation Lab Launch',
        description: 'Our college is launching a new state-of-the-art technology innovation lab for students.',
        url: '#',
        publishedAt: new Date().toISOString(),
        category: 'College News',
        source: 'custom',
        department: Department.CSE,
        author: 'Principal'
      }
    ];
  }

  public async getDepartmentNews(department: Department): Promise<TechNews[]> {
    try {
      // Get news from database first
      const dbNews = await databaseService.getTechNewsByDepartment(department);
      const customNews = dbNews.map(news => ({
        id: news.id,
        title: news.title,
        description: news.description,
        url: news.url || '#',
        publishedAt: news.created_at,
        category: news.category || 'General',
        source: 'custom' as const,
        department: news.department,
        imageUrl: news.image_url,
        author: news.author
      }));

      // If we have database news, return it
      if (customNews.length > 0) {
        return customNews;
      }

      // Fallback to cached API news
      const now = Date.now();
      const lastFetch = this.lastFetchTime[department] || 0;

      if (now - lastFetch < this.CACHE_DURATION && this.cachedNews[department]) {
        return this.combineNews(this.cachedNews[department], this.getCustomNews(department));
      }

      const apiNews = await this.fetchNewsFromAPI(department);
      this.cachedNews[department] = apiNews;
      this.lastFetchTime[department] = now;
      return this.combineNews(apiNews, this.getCustomNews(department));
    } catch (error) {
      console.error('Failed to fetch news:', error);
      return this.getCustomNews(department);
    }
  }

  private async fetchNewsFromAPI(department: Department): Promise<TechNews[]> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate API response with department-specific news
    const mockNews = this.getMockNewsForDepartment(department);
    return mockNews.map((article, index) => ({
      id: `api-${department}-${Date.now()}-${index}`,
      title: article.title,
      description: article.description,
      url: article.url,
      publishedAt: article.publishedAt,
      category: this.categorizeNews(article.title, department),
      source: 'api' as const,
      department,
      imageUrl: article.imageUrl,
      author: article.author
    }));
  }

  private getMockNewsForDepartment(department: Department) {
    const mockData = {
      [Department.CSE]: [
        {
          title: 'OpenAI Releases GPT-5 with Enhanced Capabilities',
          description: 'Latest AI model shows significant improvements in reasoning and creativity.',
          url: 'https://example.com/gpt5-release',
          publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400',
          author: 'Tech Reporter'
        },
        {
          title: 'React 19 Beta Released with Concurrent Features',
          description: 'Major performance improvements and new concurrent rendering capabilities.',
          url: 'https://example.com/react19-beta',
          publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          imageUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400',
          author: 'Web Dev Team'
        }
      ],
      [Department.ECE]: [
        {
          title: '6G Network Research Accelerates Globally',
          description: 'Next-generation wireless technology development picks up pace.',
          url: 'https://example.com/6g-research',
          publishedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400',
          author: 'Network Engineer'
        },
        {
          title: 'Advanced Chip Manufacturing Breakthrough',
          description: 'New 2nm process technology announced by leading semiconductor company.',
          url: 'https://example.com/2nm-chips',
          publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400',
          author: 'Chip Designer'
        }
      ]
    };

    return mockData[department] || mockData[Department.CSE];
  }

  private categorizeNews(title: string, department: Department): string {
    const titleLower = title.toLowerCase();
    
    const categoryMap: Partial<Record<Department, Record<string, string[]>>> = {
      [Department.CSE]: {
        'AI/ML': ['ai', 'artificial intelligence', 'machine learning'],
        'Web Dev': ['web', 'react', 'javascript'],
        'Mobile': ['mobile', 'app', 'ios', 'android'],
        'Cybersecurity': ['security', 'cyber', 'hack']
      },
      [Department.ECE]: {
        '5G/IoT': ['5g', 'iot', 'wireless'],
        'Hardware': ['chip', 'semiconductor', 'hardware'],
        'DSP': ['signal', 'dsp', 'processing']
      }
    };

    const categories = categoryMap[department] || categoryMap[Department.CSE];
    if (!categories) return 'General';
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => titleLower.includes(keyword))) {
        return category;
      }
    }

    return 'General';
  }

  private getCustomNews(department: Department): TechNews[] {
    return this.customNews.filter(news => 
      news.department === department || news.department === Department.CSE
    );
  }

  private combineNews(apiNews: TechNews[], customNews: TechNews[]): TechNews[] {
    const combined = [...customNews, ...apiNews];
    return combined.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  public async addCustomNews(newsData: Omit<TechNews, 'id' | 'source'>): Promise<TechNews> {
    try {
      const dbNewsData = {
        title: newsData.title,
        description: newsData.description,
        url: newsData.url,
        category: newsData.category,
        department: newsData.department,
        image_url: newsData.imageUrl,
        author: newsData.author,
        created_by: 'system' // This should be the actual user ID
      };

      const newNews = await databaseService.createTechNews(dbNewsData);
      if (!newNews) {
        throw new Error('Failed to create news in database');
      }

      return {
        id: newNews.id,
        title: newNews.title,
        description: newNews.description,
        url: newNews.url || '#',
        publishedAt: newNews.created_at,
        category: newNews.category || 'General',
        source: 'custom' as const,
        department: newNews.department,
        imageUrl: newNews.image_url,
        author: newNews.author
      };
    } catch (error) {
      console.error('Error adding custom news:', error);
      // Fallback to in-memory storage
      const newNews: TechNews = {
        ...newsData,
        id: `custom-${Date.now()}`,
        source: 'custom'
      };
      this.customNews.push(newNews);
      return newNews;
    }
  }

  public async deleteCustomNews(newsId: string): Promise<boolean> {
    try {
      const result = await databaseService.deleteTechNews(newsId);
      if (result) {
        return true;
      }
    } catch (error) {
      console.error('Error deleting news from database:', error);
    }

    // Fallback to in-memory deletion
    const index = this.customNews.findIndex(news => news.id === newsId);
    if (index !== -1) {
      this.customNews.splice(index, 1);
      return true;
    }
    return false;
  }

  public async refreshNews(department: Department): Promise<TechNews[]> {
    this.lastFetchTime[department] = 0;
    return this.getDepartmentNews(department);
  }
}

export default NewsService.getInstance(); 