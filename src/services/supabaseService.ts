import { supabase } from '../lib/supabase'
import { Department, UserRole } from '../types/user'
import { StudentData } from './studentService'
import { databaseService } from './databaseService'

export class SupabaseService {
  // Student operations
  async getAllStudents(): Promise<StudentData[]> {
    try {
      console.log('🔍 Fetching all students from database...')
      const students = await databaseService.getAllStudents()
      console.log(`✅ Found ${students?.length || 0} students in database`)
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
      console.log(`🔍 Fetching student by user_id: ${userId}`)
      const student = await databaseService.getStudentByUserId(userId)
      if (student) {
        console.log(`✅ Found student: ${student.name || 'Unknown'}`)
      } else {
        console.log(`❌ No student found for user_id: ${userId}`)
      }
      return student as StudentData | null
    } catch (error) {
      console.error('❌ Error in getStudentByUserId:', error)
      return null
    }
  }

  async getStudentByEmail(email: string): Promise<StudentData | null> {
    try {
      console.log(`🔍 Fetching student by email: ${email}`)
      const student = await databaseService.getStudentByEmail(email)
      if (student) {
        console.log(`✅ Found student: ${student.name || 'Unknown'}`)
      } else {
        console.log(`❌ No student found for email: ${email}`)
      }
      return student as StudentData | null
    } catch (error) {
      console.error('❌ Error in getStudentByEmail:', error)
      return null
    }
  }

  async addStudent(studentData: Omit<StudentData, 'id' | 'createdAt' | 'updatedAt'>): Promise<StudentData | null> {
    try {
      console.log('📝 addStudent called with:', { 
        userId: studentData.userId, 
        name: studentData.name, 
        email: studentData.email,
        registerId: studentData.registerId 
      });
      const student = await databaseService.createStudent(studentData as any);
      if (student) {
        console.log('✅ Student created successfully:', student.id);
      } else {
        console.log('❌ Student creation returned null');
      }
      return student as StudentData | null;
    } catch (error) {
      console.error('❌ Error in addStudent:', error);
      return null;
    }
  }

  async updateStudent(studentId: string, updates: Partial<StudentData>): Promise<StudentData | null> {
    try {
      console.log('🔧 updateStudent called with:', { studentId, updates });
      const student = await databaseService.updateStudent(studentId, updates as any)
      console.log('✅ Student updated successfully:', student);
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
      console.log('SupabaseService: Creating user with data:', userData);
      const user = await databaseService.createUser(userData as any)
      console.log('SupabaseService: User created successfully:', user);
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
    console.log('Testing database connection...');
    
    // Try a simple query to check if tables exist
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Database connection test failed:', error);
      
      // If it's a permission error, try to disable RLS
      if (error.code === '42501') {
        console.log('Permission error detected. This is likely an RLS issue.');
        return false;
      }
      return false;
    }
    
    console.log('Database connection test successful:', data);
    return true;
  } catch (error) {
    console.error('Database connection test error:', error);
    return false;
  }
}; 