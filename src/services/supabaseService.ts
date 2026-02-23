import { supabase } from '../lib/supabase'
import { Department, UserRole } from '../types/user'
import { StudentData } from './studentService'
import { databaseService } from './databaseService'

export class SupabaseService {
  // Student operations
  async getAllStudents(): Promise<StudentData[]> {
    try {
      const students = await databaseService.getAllStudents()
      return students as StudentData[] || []
    } catch (error) {
      console.error('❌ Error in getAllStudents:', error)
      return []
    }
  }

  async getStudentsByDepartment(department: Department): Promise<StudentData[]> {
    try {
      const students = await databaseService.getStudentsByDepartment(department)
      return students as StudentData[] || []
    } catch (error) {
      console.error('Error in getStudentsByDepartment:', error)
      return []
    }
  }

  async getStudentById(id: string): Promise<StudentData | null> {
    try {
      const student = await databaseService.getStudentById(id)
      return student as StudentData | null
    } catch (error) {
      console.error('Error in getStudentById:', error)
      return null
    }
  }

  async getStudentByRegisterId(registerId: string): Promise<StudentData | null> {
    try {
      const student = await databaseService.getStudentByRegisterId(registerId)
      return student as StudentData | null
    } catch (error) {
      console.error('Error in getStudentByRegisterId:', error)
      return null
    }
  }

  async getStudentByUserId(userId: string): Promise<StudentData | null> {
    try {
      const student = await databaseService.getStudentByUserId(userId)
      return student as StudentData | null
    } catch (error) {
      console.error('❌ Error in getStudentByUserId:', error)
      return null
    }
  }

  async getStudentByEmail(email: string): Promise<StudentData | null> {
    try {
      const student = await databaseService.getStudentByEmail(email)
      return student as StudentData | null
    } catch (error) {
      console.error('❌ Error in getStudentByEmail:', error)
      return null
    }
  }

  async addStudent(studentData: Omit<StudentData, 'id' | 'createdAt' | 'updatedAt'>): Promise<StudentData | null> {
    try {
      const student = await databaseService.createStudent(studentData as any);
      return student as StudentData | null;
    } catch (error) {
      console.error('❌ Error in addStudent:', error);
      return null;
    }
  }

  async updateStudent(studentId: string, updates: Partial<StudentData>): Promise<StudentData | null> {
    try {
      const student = await databaseService.updateStudent(studentId, updates as any)
      return student as StudentData | null
    } catch (error) {
      console.error('Error in updateStudent:', error)
      return null
    }
  }

  async deleteStudent(studentId: string): Promise<boolean> {
    try {
      return await databaseService.deleteStudent(studentId)
    } catch (error) {
      console.error('Error in deleteStudent:', error)
      return false
    }
  }

  // User operations
  async getUserById(id: string) {
    try {
      return await databaseService.getUserById(id)
    } catch (error) {
      console.error('Error in getUserById:', error)
      return null
    }
  }

  async getUserByEmail(email: string) {
    try {
      return await databaseService.getUserByEmail(email)
    } catch (error) {
      console.error('Error in getUserByEmail:', error)
      return null
    }
  }

  async createUser(userData: { id: string; email: string; name: string; role: string; department?: string; profile_picture?: string; is_active?: boolean }) {
    try {
      const user = await databaseService.createUser(userData as any)
      return user
    } catch (error) {
      console.error('SupabaseService: Error in createUser:', error)
      return null
    }
  }

  async updateUser(userId: string, updates: Partial<{ email: string; name: string; role: string; department?: string }>) {
    try {
      return await databaseService.updateUser(userId, updates as any)
    } catch (error) {
      console.error('Error in updateUser:', error)
      return null
    }
  }

  // Search students
  async searchStudents(searchTerm: string): Promise<StudentData[]> {
    try {
      const students = await databaseService.searchStudents(searchTerm)
      return students as StudentData[] || []
    } catch (error) {
      console.error('Error in searchStudents:', error)
      return []
    }
  }
}

export const supabaseService = new SupabaseService()

// Test database connection
export const testDatabaseConnection = async () => {
  try {
    // Try a simple query to check if tables exist
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Database connection test failed:', error);
      
      // If it's a permission error, try to disable RLS
      if (error.code === '42501') {
        return false;
      }
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Database connection test error:', error);
    return false;
  }
}; 