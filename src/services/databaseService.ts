import { supabase, supabaseAdmin } from '../lib/supabase'

const db = supabaseAdmin || supabase;
import { Department, UserRole, User, Student, Faculty, Class, AttendanceRecord, Meeting, Book, FeeStructure, StudentFeeRecord, PaymentTransaction } from '../types/user'
import type { ClassTimetable, Day, TimetableSlot } from '../types/timetable'
import { DAYS } from '../types/timetable'

/** Show short employee id (e.g. emp1097) instead of long EMP-xxxxxxxxxxxx in UI. */
function formatEmployeeIdForDisplay(raw: string): string {
  if (!raw) return '';
  const upper = raw.toUpperCase();
  if (upper.startsWith('EMP-') && raw.length > 10) {
    return 'emp' + raw.slice(-4).toLowerCase();
  }
  if (upper.startsWith('EMP')) return raw.toLowerCase();
  if (/^\d+$/.test(raw)) return 'emp' + raw;
  return raw;
}

export class DatabaseService {
  // User Operations
  async getAllUsers(): Promise<User[]> {
    try {
      const { data, error } = await db
        .from('users')
        .select('*')
        .order('name')
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching all users:', error)
      return []
    }
  }

  async getUsersByDepartment(department: Department): Promise<User[]> {
    try {
      const { data, error } = await db
        .from('users')
        .select('*')
        .eq('department', department)
        .order('name')
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching users by department:', error)
      return []
    }
  }

  /** Get faculty users (FACULTY, HOD, COORDINATOR) for assignment dropdowns - from DB so created faculty appear */
  async getFacultyUsers(department?: Department): Promise<{ id: string; name: string; department: Department }[]> {
    try {
      let query = db
        .from('users')
        .select('id, name, department')
        .in('role', ['FACULTY', 'HOD', 'COORDINATOR'])
        .order('name')
      if (department) {
        query = query.eq('department', department)
      }
      const { data, error } = await query
      if (error) throw error
      return (data || []).map((u: any) => ({
        id: u.id,
        name: u.name || 'Unknown',
        department: u.department || Department.CSE
      }))
    } catch (error) {
      console.error('Error fetching faculty users:', error)
      return []
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const { data, error } = await db
        .from('users')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching user by ID:', error)
      return null
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const { data, error } = await db
        .from('users')
        .select('*')
        .eq('email', email)
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching user by email:', error)
      return null
    }
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User | null> {
    try {
      const { data, error } = await db
        .from('users')
        .insert([userData])
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating user:', error)
      return null
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    try {
      const { data, error } = await db
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating user:', error)
      return null
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      const { error } = await db
        .from('users')
        .delete()
        .eq('id', userId)
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting user:', error)
      return false
    }
  }

  // Student Operations
  async getAllStudents(): Promise<any[]> {
    try {
      const { data, error } = await db
        .from('students')
        .select('*')
        .order('name')
      
      if (error) throw error
      
      // Map database response back to frontend format
      if (data) {
        return data.map(student => ({
          ...student,
          registerId: student.register_id,
          phoneNumber: student.phone_number,
          fatherName: student.father_name,
          fatherOccupation: student.father_occupation,
          fatherMobile: student.father_mobile,
          motherName: student.mother_name,
          motherOccupation: student.mother_occupation,
          motherMobile: student.mother_mobile,
          apaarId: student.apaar_id,
          aadharId: student.aadhar_id,
          healthIssues: student.health_issues,
          seatQuota: student.seat_quota,
          isActive: student.is_active,
          attendancePercentage: student.attendance_percentage,
          bloodGroup: student.blood_group,
          dateOfBirth: student.date_of_birth,
          emergencyContact: student.emergency_contact,
          isHostler: student.is_hostler,
          hostelDetails: student.hostel_details,
          transportDetails: student.transport_details,
          careerGoals: student.career_goals,
          placementStatus: student.placement_status,
          placementDetails: student.placement_details,
          mentorId: student.mentor_id,
          createdAt: student.created_at,
          updatedAt: student.updated_at
        }));
      }
      
      return data || []
    } catch (error) {
      console.error('Error fetching all students:', error)
      return []
    }
  }

  async getMenteeCountByMentor(mentorId: string): Promise<number> {
    try {
      const { count, error } = await db.from('students').select('*', { count: 'exact', head: true }).eq('mentor_id', mentorId);
      if (error) throw error;
      return count ?? 0;
    } catch (error) {
      console.error('Error fetching mentee count:', error);
      return 0;
    }
  }

  async getMenteesByMentor(mentorId: string): Promise<any[]> {
    try {
      const { data, error } = await db
        .from('students')
        .select('*')
        .eq('mentor_id', mentorId)
        .order('name');
      if (error) throw error;
      if (!data) return [];
      return data.map((s: any) => ({
        ...s,
        registerId: s.register_id,
        phoneNumber: s.phone_number,
        mentorId: s.mentor_id,
        attendancePercentage: s.attendance_percentage,
      }));
    } catch (error) {
      console.error('Error fetching mentees by mentor:', error);
      return [];
    }
  }

  /** Fetches mentor profile (for MentorDetails) by mentor user_id. Used when loading a student who has mentor_id. */
  async getMentorProfileForStudent(mentorUserId: string): Promise<{
    id: string; name: string; email: string; phoneNumber: string; employeeId: string;
    department: string; designation: string; officeLocation: string; officeHours: string;
    subjects: string[]; profilePicture?: string;
  } | null> {
    try {
      const { data: userData, error: userError } = await db
        .from('users')
        .select('id, name, email, department, profile_picture')
        .eq('id', mentorUserId)
        .single();
      if (userError || !userData) return null;
      const { data: facultyData } = await db
        .from('faculty')
        .select('employee_id, designation, office_location, office_hours, phone_number, subjects')
        .eq('user_id', mentorUserId)
        .maybeSingle();
      const rawEmpId = facultyData?.employee_id ?? userData.id.slice(0, 8);
      const employeeIdDisplay = formatEmployeeIdForDisplay(rawEmpId);
      return {
        id: userData.id,
        name: userData.name ?? '',
        email: userData.email ?? '',
        phoneNumber: facultyData?.phone_number ?? '',
        employeeId: employeeIdDisplay,
        department: userData.department ?? '',
        designation: facultyData?.designation ?? 'Faculty',
        officeLocation: facultyData?.office_location ?? '',
        officeHours: facultyData?.office_hours ?? '',
        subjects: Array.isArray(facultyData?.subjects) ? facultyData.subjects : [],
        profilePicture: (userData.profile_picture && String(userData.profile_picture).trim()) || undefined,
      };
    } catch (error) {
      console.error('Error fetching mentor profile:', error);
      return null;
    }
  }

  async createNotification(params: {
    userId: string;
    title: string;
    message: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    actionUrl?: string;
  }): Promise<boolean> {
    try {
      const { error } = await db.from('notifications').insert([{
        user_id: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        ...(params.actionUrl && { action_url: params.actionUrl }),
      }]);
      return !error;
    } catch (error) {
      console.error('Error creating notification:', error);
      return false;
    }
  }

  async getNotificationsByUser(userId: string, limit = 50): Promise<{ id: string; title: string; message: string; type: string; is_read: boolean; created_at: string; action_url?: string }[]> {
    try {
      const { data, error } = await db
        .from('notifications')
        .select('id, title, message, type, is_read, created_at, action_url')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  async markNotificationRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await db.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', notificationId);
      return !error;
    } catch (error) {
      console.error('Error marking notification read:', error);
      return false;
    }
  }

  async markAllNotificationsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await db.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('user_id', userId);
      return !error;
    } catch (error) {
      console.error('Error marking all notifications read:', error);
      return false;
    }
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    try {
      const { count, error } = await db.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false);
      if (error) throw error;
      return count ?? 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  async createLeaveRequest(params: {
    studentId: string;
    mentorId: string;
    type: 'SICK' | 'CASUAL' | 'EMERGENCY' | 'OTHER';
    startDate: string;
    endDate: string;
    reason: string;
  }): Promise<{ id: string } | null> {
    try {
      const { data, error } = await db
        .from('leave_requests')
        .insert([{
          student_id: params.studentId,
          mentor_id: params.mentorId,
          type: params.type,
          start_date: params.startDate,
          end_date: params.endDate,
          reason: params.reason,
          status: 'PENDING',
        }])
        .select('id')
        .single();
      if (error) throw error;
      if (data?.id) {
        const { data: studentRow } = await db.from('students').select('name').eq('id', params.studentId).single();
        const studentName = (studentRow as any)?.name || 'A student';
        this.createNotification({
          userId: params.mentorId,
          title: 'Leave request',
          message: `${studentName} applied for ${params.type} leave (${params.startDate} to ${params.endDate}). Reason: ${params.reason.slice(0, 80)}${params.reason.length > 80 ? '...' : ''}`,
          type: 'INFO',
        });
      }
      return data ? { id: data.id } : null;
    } catch (error) {
      console.error('Error creating leave request:', error);
      return null;
    }
  }

  async createPermissionRequest(params: {
    studentId: string;
    mentorId: string;
    type: 'LATE' | 'EARLY' | 'ABSENT' | 'OTHER';
    requestDate: string;
    reason: string;
  }): Promise<{ id: string } | null> {
    try {
      const { data, error } = await db
        .from('permission_requests')
        .insert([{
          student_id: params.studentId,
          mentor_id: params.mentorId,
          type: params.type,
          request_date: params.requestDate,
          reason: params.reason,
          status: 'PENDING',
        }])
        .select('id')
        .single();
      if (error) throw error;
      if (data?.id) {
        const { data: studentRow } = await db.from('students').select('name').eq('id', params.studentId).single();
        const studentName = (studentRow as any)?.name || 'A student';
        this.createNotification({
          userId: params.mentorId,
          title: 'Permission request',
          message: `${studentName} requested ${params.type} permission for ${params.requestDate}. Reason: ${params.reason.slice(0, 80)}${params.reason.length > 80 ? '...' : ''}`,
          type: 'INFO',
        });
      }
      return data ? { id: data.id } : null;
    } catch (error) {
      console.error('Error creating permission request:', error);
      return null;
    }
  }

  async updateLeaveRequestStatus(id: string, status: 'APPROVED' | 'REJECTED', remarks?: string): Promise<boolean> {
    try {
      const { data: req, error: fetchErr } = await db.from('leave_requests').select('student_id').eq('id', id).single();
      if (fetchErr || !req) return false;
      const { error: updateErr } = await db.from('leave_requests').update({
        status,
        processed_at: new Date().toISOString(),
        ...(remarks != null && { remarks }),
      }).eq('id', id);
      if (updateErr) return false;
      const { data: studentRow } = await db.from('students').select('user_id').eq('id', (req as any).student_id).single();
      const studentUserId = (studentRow as any)?.user_id;
      if (studentUserId) {
        this.createNotification({
          userId: studentUserId,
          title: status === 'APPROVED' ? 'Leave granted' : 'Leave rejected',
          message: status === 'APPROVED' ? 'Your leave request has been approved by your mentor.' : (remarks || 'Your leave request has been rejected by your mentor.'),
          type: status === 'APPROVED' ? 'SUCCESS' : 'WARNING',
        });
      }
      return true;
    } catch (error) {
      console.error('Error updating leave request:', error);
      return false;
    }
  }

  async updatePermissionRequestStatus(id: string, status: 'APPROVED' | 'REJECTED', remarks?: string): Promise<boolean> {
    try {
      const { data: req, error: fetchErr } = await db.from('permission_requests').select('student_id').eq('id', id).single();
      if (fetchErr || !req) return false;
      const { error: updateErr } = await db.from('permission_requests').update({
        status,
        processed_at: new Date().toISOString(),
        ...(remarks != null && { remarks }),
      }).eq('id', id);
      if (updateErr) return false;
      const { data: studentRow } = await db.from('students').select('user_id').eq('id', (req as any).student_id).single();
      const studentUserId = (studentRow as any)?.user_id;
      if (studentUserId) {
        this.createNotification({
          userId: studentUserId,
          title: status === 'APPROVED' ? 'Permission granted' : 'Permission rejected',
          message: status === 'APPROVED' ? 'Your permission request has been approved by your mentor.' : (remarks || 'Your permission request has been rejected by your mentor.'),
          type: status === 'APPROVED' ? 'SUCCESS' : 'WARNING',
        });
      }
      return true;
    } catch (error) {
      console.error('Error updating permission request:', error);
      return false;
    }
  }

  async getLeaveRequestsByMentor(mentorUserId: string): Promise<any[]> {
    try {
      const { data, error } = await db
        .from('leave_requests')
        .select('*, students!inner(name, register_id)')
        .eq('mentor_id', mentorUserId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((r: any) => ({ ...r, studentName: r.students?.name, registerId: r.students?.register_id }));
    } catch (error) {
      console.error('Error fetching leave requests by mentor:', error);
      return [];
    }
  }

  async getPermissionRequestsByMentor(mentorUserId: string): Promise<any[]> {
    try {
      const { data, error } = await db
        .from('permission_requests')
        .select('*, students!inner(name, register_id)')
        .eq('mentor_id', mentorUserId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((r: any) => ({ ...r, studentName: r.students?.name, registerId: r.students?.register_id }));
    } catch (error) {
      console.error('Error fetching permission requests by mentor:', error);
      return [];
    }
  }

  async getLeaveRequestsByStudent(studentId: string): Promise<any[]> {
    try {
      const { data, error } = await db.from('leave_requests').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching leave requests by student:', error);
      return [];
    }
  }

  async getPermissionRequestsByStudent(studentId: string): Promise<any[]> {
    try {
      const { data, error } = await db.from('permission_requests').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching permission requests by student:', error);
      return [];
    }
  }

  async getAttendanceByStudent(studentId: string, fromDate?: string, toDate?: string): Promise<any[]> {
    try {
      let query = db.from('attendance_records').select('*').eq('student_id', studentId).order('date', { ascending: false }).order('period', { ascending: true });
      if (fromDate) query = query.gte('date', fromDate);
      if (toDate) query = query.lte('date', toDate);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching attendance by student:', error);
      return [];
    }
  }

  // ---------- Exam Seating Generator ----------
  async getExamRooms(): Promise<any[]> {
    try {
      const { data, error } = await db.from('exam_rooms').select('*').order('department').order('name');
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('getExamRooms:', e);
      return [];
    }
  }

  async getExamRoomsByDepartment(department: string): Promise<any[]> {
    try {
      const { data, error } = await db.from('exam_rooms').select('*').eq('department', department).order('name');
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('getExamRoomsByDepartment:', e);
      return [];
    }
  }

  async createExamRoom(room: { name: string; department: string; rows: number; cols: number }): Promise<any> {
    try {
      const { data, error } = await db.from('exam_rooms').insert([room]).select().single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('createExamRoom:', e);
      return null;
    }
  }

  async updateExamRoom(id: string, updates: { name?: string; department?: string; rows?: number; cols?: number }): Promise<boolean> {
    try {
      const { error } = await db.from('exam_rooms').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
      return !error;
    } catch (e) {
      console.error('updateExamRoom:', e);
      return false;
    }
  }

  async deleteExamRoom(id: string): Promise<boolean> {
    try {
      const { error } = await db.from('exam_rooms').delete().eq('id', id);
      return !error;
    } catch (e) {
      console.error('deleteExamRoom:', e);
      return false;
    }
  }

  async getExamSessions(): Promise<any[]> {
    try {
      const { data, error } = await db.from('exam_sessions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('getExamSessions:', e);
      return [];
    }
  }

  async createExamSession(session: { name: string; exam_date?: string; subject?: string }): Promise<any> {
    try {
      const { data, error } = await db.from('exam_sessions').insert([session]).select().single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('createExamSession:', e);
      return null;
    }
  }

  async getOccupiedRoomIdsForSession(sessionId: string): Promise<Set<string>> {
    try {
      const { data, error } = await db.from('exam_seating_allocations').select('room_id').eq('session_id', sessionId);
      if (error) throw error;
      const ids = new Set<string>();
      (data || []).forEach((r: any) => ids.add(r.room_id));
      return ids;
    } catch (e) {
      console.error('getOccupiedRoomIdsForSession:', e);
      return new Set();
    }
  }

  async deleteExamAllocationsForSessionAndRoom(sessionId: string, roomId: string): Promise<boolean> {
    try {
      const { error } = await db.from('exam_seating_allocations').delete().eq('session_id', sessionId).eq('room_id', roomId);
      return !error;
    } catch (e) {
      console.error('deleteExamAllocationsForSessionAndRoom:', e);
      return false;
    }
  }

  async saveExamSeatingAllocations(
    sessionId: string,
    roomId: string,
    allocations: { student_id: string; row_num: number; col_num: number; bench_index: number }[]
  ): Promise<boolean> {
    try {
      await db.from('exam_seating_allocations').delete().eq('session_id', sessionId).eq('room_id', roomId);
      if (allocations.length === 0) return true;
      const rows = allocations.map((a) => ({
        session_id: sessionId,
        room_id: roomId,
        student_id: a.student_id,
        row_num: a.row_num,
        col_num: a.col_num,
        bench_index: a.bench_index,
      }));
      const { error } = await db.from('exam_seating_allocations').insert(rows);
      return !error;
    } catch (e) {
      console.error('saveExamSeatingAllocations:', e);
      return false;
    }
  }

  async getExamSeatingForSession(sessionId: string): Promise<any[]> {
    try {
      const { data, error } = await db
        .from('exam_seating_allocations')
        .select('*')
        .eq('session_id', sessionId)
        .order('room_id')
        .order('row_num')
        .order('col_num');
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error('getExamSeatingForSession:', e);
      return [];
    }
  }

  async getStudentsByDepartment(department: Department): Promise<any[]> {
    try {
      const { data, error } = await db
        .from('students')
        .select('*')
        .eq('department', department)
        .order('name')
      
      if (error) throw error
      
      // Map database response back to frontend format
      if (data) {
        return data.map(student => ({
          ...student,
          registerId: student.register_id,
          phoneNumber: student.phone_number,
          fatherName: student.father_name,
          fatherOccupation: student.father_occupation,
          fatherMobile: student.father_mobile,
          motherName: student.mother_name,
          motherOccupation: student.mother_occupation,
          motherMobile: student.mother_mobile,
          apaarId: student.apaar_id,
          aadharId: student.aadhar_id,
          healthIssues: student.health_issues,
          seatQuota: student.seat_quota,
          isActive: student.is_active,
          attendancePercentage: student.attendance_percentage,
          bloodGroup: student.blood_group,
          dateOfBirth: student.date_of_birth,
          emergencyContact: student.emergency_contact,
          isHostler: student.is_hostler,
          hostelDetails: student.hostel_details,
          transportDetails: student.transport_details,
          careerGoals: student.career_goals,
          placementStatus: student.placement_status,
          placementDetails: student.placement_details,
          mentorId: student.mentor_id,
          createdAt: student.created_at,
          updatedAt: student.updated_at
        }));
      }
      
      return data || []
    } catch (error) {
      console.error('Error fetching students by department:', error)
      return []
    }
  }

  async getStudentById(id: string): Promise<any> {
    try {
      const { data, error } = await db
        .from('students')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      
      // Map database response back to frontend format
      if (data) {
        const mappedData = {
          ...data,
          registerId: data.register_id,
          phoneNumber: data.phone_number,
          fatherName: data.father_name,
          fatherOccupation: data.father_occupation,
          fatherMobile: data.father_mobile,
          motherName: data.mother_name,
          motherOccupation: data.mother_occupation,
          motherMobile: data.mother_mobile,
          apaarId: data.apaar_id,
          aadharId: data.aadhar_id,
          healthIssues: data.health_issues,
          seatQuota: data.seat_quota,
          isActive: data.is_active,
          attendancePercentage: data.attendance_percentage,
          bloodGroup: data.blood_group,
          dateOfBirth: data.date_of_birth,
          emergencyContact: data.emergency_contact,
          isHostler: data.is_hostler,
          hostelDetails: data.hostel_details,
          transportDetails: data.transport_details,
          careerGoals: data.career_goals,
          placementStatus: data.placement_status,
          placementDetails: data.placement_details,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
        return mappedData;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching student by ID:', error)
      return null
    }
  }

  async getStudentByEmail(email: string): Promise<any> {
    try {
      const { data, error } = await db
        .from('students')
        .select('*')
        .eq('email', email)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      
      // Map database response back to frontend format
      if (data) {
        const mappedData: any = {
          ...data,
          registerId: data.register_id,
          phoneNumber: data.phone_number,
          fatherName: data.father_name,
          fatherOccupation: data.father_occupation,
          fatherMobile: data.father_mobile,
          motherName: data.mother_name,
          motherOccupation: data.mother_occupation,
          motherMobile: data.mother_mobile,
          apaarId: data.apaar_id,
          aadharId: data.aadhar_id,
          healthIssues: data.health_issues,
          seatQuota: data.seat_quota,
          isActive: data.is_active,
          attendancePercentage: data.attendance_percentage,
          bloodGroup: data.blood_group,
          dateOfBirth: data.date_of_birth,
          emergencyContact: data.emergency_contact,
          isHostler: data.is_hostler,
          hostelDetails: data.hostel_details,
          transportDetails: data.transport_details,
          careerGoals: data.career_goals,
          placementStatus: data.placement_status,
          placementDetails: data.placement_details,
          mentorId: data.mentor_id,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
        if (data.mentor_id) {
          mappedData.mentor = await this.getMentorProfileForStudent(data.mentor_id);
        }
        return mappedData;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching student by email:', error)
      return null
    }
  }

  async getStudentByUserId(userId: string): Promise<any> {
    try {

      const { data, error } = await db
        .from('students')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('❌ Database error in getStudentByUserId:', error);
        throw error;
      }
      
      // Map database response back to frontend format
      if (data) {
        const mappedData: any = {
          ...data,
          registerId: data.register_id,
          phoneNumber: data.phone_number,
          fatherName: data.father_name,
          fatherOccupation: data.father_occupation,
          fatherMobile: data.father_mobile,
          motherName: data.mother_name,
          motherOccupation: data.mother_occupation,
          motherMobile: data.mother_mobile,
          apaarId: data.apaar_id,
          aadharId: data.aadhar_id,
          healthIssues: data.health_issues,
          seatQuota: data.seat_quota,
          isActive: data.is_active,
          attendancePercentage: data.attendance_percentage,
          bloodGroup: data.blood_group,
          dateOfBirth: data.date_of_birth,
          emergencyContact: data.emergency_contact,
          isHostler: data.is_hostler,
          hostelDetails: data.hostel_details,
          transportDetails: data.transport_details,
          careerGoals: data.career_goals,
          placementStatus: data.placement_status,
          placementDetails: data.placement_details,
          mentorId: data.mentor_id,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
        if (data.mentor_id) {
          mappedData.mentor = await this.getMentorProfileForStudent(data.mentor_id);
        }
        return mappedData;
      }
      
      return data;
    } catch (error) {
      console.error('❌ Exception in getStudentByUserId:', error);
      return null;
    }
  }

  async getStudentByRegisterId(registerId: string): Promise<any> {
    try {
      const { data, error } = await db
        .from('students')
        .select('*')
        .eq('register_id', registerId)
        .single()
      
      if (error) throw error
      
      // Map database response back to frontend format
      if (data) {
        const mappedData = {
          ...data,
          registerId: data.register_id,
          phoneNumber: data.phone_number,
          fatherName: data.father_name,
          fatherOccupation: data.father_occupation,
          fatherMobile: data.father_mobile,
          motherName: data.mother_name,
          motherOccupation: data.mother_occupation,
          motherMobile: data.mother_mobile,
          apaarId: data.apaar_id,
          aadharId: data.aadhar_id,
          healthIssues: data.health_issues,
          seatQuota: data.seat_quota,
          isActive: data.is_active,
          attendancePercentage: data.attendance_percentage,
          bloodGroup: data.blood_group,
          dateOfBirth: data.date_of_birth,
          emergencyContact: data.emergency_contact,
          isHostler: data.is_hostler,
          hostelDetails: data.hostel_details,
          transportDetails: data.transport_details,
          careerGoals: data.career_goals,
          placementStatus: data.placement_status,
          placementDetails: data.placement_details,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
        return mappedData;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching student by register ID:', error)
      return null
    }
  }

  async createStudent(studentData: any): Promise<any> {
    try {

      const emptyToNull = (v: any) => (v === '' ? null : v);
      const dbData: any = {};
      
      if (studentData.userId !== undefined) dbData.user_id = studentData.userId;
      if (studentData.name !== undefined) dbData.name = studentData.name;
      if (studentData.registerId !== undefined) dbData.register_id = studentData.registerId;
      if (studentData.regulation !== undefined) dbData.regulation = studentData.regulation;
      if (studentData.email !== undefined) dbData.email = studentData.email;
      if (studentData.class !== undefined) dbData.class = studentData.class;
      if (studentData.department !== undefined) dbData.department = emptyToNull(studentData.department);
      if (studentData.attendance !== undefined) dbData.attendance = studentData.attendance;
      if (studentData.phoneNumber !== undefined) dbData.phone_number = studentData.phoneNumber;
      if (studentData.fatherName !== undefined) dbData.father_name = studentData.fatherName;
      if (studentData.fatherOccupation !== undefined) dbData.father_occupation = studentData.fatherOccupation;
      if (studentData.fatherMobile !== undefined) dbData.father_mobile = studentData.fatherMobile;
      if (studentData.motherName !== undefined) dbData.mother_name = studentData.motherName;
      if (studentData.motherOccupation !== undefined) dbData.mother_occupation = studentData.motherOccupation;
      if (studentData.motherMobile !== undefined) dbData.mother_mobile = studentData.motherMobile;
      if (studentData.apaarId !== undefined) dbData.apaar_id = studentData.apaarId;
      if (studentData.aadharId !== undefined) dbData.aadhar_id = studentData.aadharId;
      if (studentData.address !== undefined) dbData.address = studentData.address;
      if (studentData.healthIssues !== undefined) dbData.health_issues = studentData.healthIssues;
      if (studentData.seatQuota !== undefined) dbData.seat_quota = emptyToNull(studentData.seatQuota);
      if (studentData.caste !== undefined) dbData.caste = studentData.caste;
      if (studentData.role !== undefined) dbData.role = studentData.role;
      if (studentData.isActive !== undefined) dbData.is_active = studentData.isActive;
      if (studentData.attendancePercentage !== undefined) dbData.attendance_percentage = emptyToNull(studentData.attendancePercentage);
      if (studentData.bloodGroup !== undefined) dbData.blood_group = emptyToNull(studentData.bloodGroup);
      if (studentData.dateOfBirth !== undefined) dbData.date_of_birth = emptyToNull(studentData.dateOfBirth);
      if (studentData.gender !== undefined) dbData.gender = emptyToNull(studentData.gender);
      if (studentData.emergencyContact !== undefined) dbData.emergency_contact = studentData.emergencyContact;
      if (studentData.isHostler !== undefined) dbData.is_hostler = studentData.isHostler;
      if (studentData.hostelDetails !== undefined) dbData.hostel_details = studentData.hostelDetails;
      if (studentData.transportDetails !== undefined) dbData.transport_details = studentData.transportDetails;
      if (studentData.skills !== undefined) dbData.skills = studentData.skills;
      if (studentData.languages !== undefined) dbData.languages = studentData.languages;
      if (studentData.hobbies !== undefined) dbData.hobbies = studentData.hobbies;
      if (studentData.careerGoals !== undefined) dbData.career_goals = studentData.careerGoals;
      if (studentData.placementStatus !== undefined) dbData.placement_status = emptyToNull(studentData.placementStatus);
      if (studentData.placementDetails !== undefined) dbData.placement_details = studentData.placementDetails;
      if (studentData.achievements !== undefined) dbData.achievements = studentData.achievements;
      if (studentData.supplies !== undefined) dbData.supplies = studentData.supplies;

      const { data, error } = await db
        .from('students')
        .insert([dbData])
        .select()
        .single()
      
      if (error) {
        console.error('❌ Database error creating student:', error);
        throw error;
      }
      
      // Map database response back to frontend format
      if (data) {
        const mappedData = {
          ...data,
          registerId: data.register_id,
          phoneNumber: data.phone_number,
          fatherName: data.father_name,
          fatherOccupation: data.father_occupation,
          fatherMobile: data.father_mobile,
          motherName: data.mother_name,
          motherOccupation: data.mother_occupation,
          motherMobile: data.mother_mobile,
          apaarId: data.apaar_id,
          aadharId: data.aadhar_id,
          healthIssues: data.health_issues,
          seatQuota: data.seat_quota,
          isActive: data.is_active,
          attendancePercentage: data.attendance_percentage,
          bloodGroup: data.blood_group,
          dateOfBirth: data.date_of_birth,
          emergencyContact: data.emergency_contact,
          isHostler: data.is_hostler,
          hostelDetails: data.hostel_details,
          transportDetails: data.transport_details,
          careerGoals: data.career_goals,
          placementStatus: data.placement_status,
          placementDetails: data.placement_details,
          achievements: data.achievements,
          supplies: data.supplies,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
        return mappedData;
      }
      
      return data;
    } catch (error) {
      console.error('Error creating student:', error)
      return null
    }
  }

  async updateStudent(studentId: string, updates: any): Promise<any> {
    try {
      const emptyToNull = (v: any) => (v === '' ? null : v);

      const dbUpdates: any = {};
      
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.registerId !== undefined) dbUpdates.register_id = updates.registerId;
      if (updates.regulation !== undefined) dbUpdates.regulation = updates.regulation;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.class !== undefined) dbUpdates.class = updates.class;
      if (updates.department !== undefined) dbUpdates.department = emptyToNull(updates.department);
      if (updates.attendance !== undefined) dbUpdates.attendance = updates.attendance;
      if (updates.phoneNumber !== undefined) dbUpdates.phone_number = updates.phoneNumber;
      if (updates.fatherName !== undefined) dbUpdates.father_name = updates.fatherName;
      if (updates.fatherOccupation !== undefined) dbUpdates.father_occupation = updates.fatherOccupation;
      if (updates.fatherMobile !== undefined) dbUpdates.father_mobile = updates.fatherMobile;
      if (updates.motherName !== undefined) dbUpdates.mother_name = updates.motherName;
      if (updates.motherOccupation !== undefined) dbUpdates.mother_occupation = updates.motherOccupation;
      if (updates.motherMobile !== undefined) dbUpdates.mother_mobile = updates.motherMobile;
      if (updates.apaarId !== undefined) dbUpdates.apaar_id = updates.apaarId;
      if (updates.aadharId !== undefined) dbUpdates.aadhar_id = updates.aadharId;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.healthIssues !== undefined) dbUpdates.health_issues = updates.healthIssues;
      if (updates.seatQuota !== undefined) dbUpdates.seat_quota = emptyToNull(updates.seatQuota);
      if (updates.caste !== undefined) dbUpdates.caste = updates.caste;
      if (updates.role !== undefined) dbUpdates.role = updates.role;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.attendancePercentage !== undefined) dbUpdates.attendance_percentage = emptyToNull(updates.attendancePercentage);
      if (updates.bloodGroup !== undefined) dbUpdates.blood_group = emptyToNull(updates.bloodGroup);
      if (updates.dateOfBirth !== undefined) dbUpdates.date_of_birth = emptyToNull(updates.dateOfBirth);
      if (updates.gender !== undefined) dbUpdates.gender = emptyToNull(updates.gender);
      if (updates.emergencyContact !== undefined) dbUpdates.emergency_contact = updates.emergencyContact;
      if (updates.isHostler !== undefined) dbUpdates.is_hostler = updates.isHostler;
      if (updates.hostelDetails !== undefined) dbUpdates.hostel_details = updates.hostelDetails;
      if (updates.transportDetails !== undefined) dbUpdates.transport_details = updates.transportDetails;
      if (updates.skills !== undefined) dbUpdates.skills = updates.skills;
      if (updates.languages !== undefined) dbUpdates.languages = updates.languages;
      if (updates.hobbies !== undefined) dbUpdates.hobbies = updates.hobbies;
      if (updates.careerGoals !== undefined) dbUpdates.career_goals = updates.careerGoals;
      if (updates.placementStatus !== undefined) dbUpdates.placement_status = emptyToNull(updates.placementStatus);
      if (updates.placementDetails !== undefined) dbUpdates.placement_details = updates.placementDetails;
      if (updates.achievements !== undefined) dbUpdates.achievements = updates.achievements;
      if (updates.supplies !== undefined) dbUpdates.supplies = updates.supplies;
      if (updates.mentorId !== undefined) dbUpdates.mentor_id = emptyToNull(updates.mentorId);
      
      dbUpdates.updated_at = new Date().toISOString();

      const { data, error } = await db
        .from('students')
        .update(dbUpdates)
        .eq('id', studentId)
        .select()
        .single()
      
      if (error) throw error
      
      // Map database response back to frontend format
      if (data) {
        const mappedData = {
          ...data,
          registerId: data.register_id,
          phoneNumber: data.phone_number,
          fatherName: data.father_name,
          fatherOccupation: data.father_occupation,
          fatherMobile: data.father_mobile,
          motherName: data.mother_name,
          motherOccupation: data.mother_occupation,
          motherMobile: data.mother_mobile,
          apaarId: data.apaar_id,
          aadharId: data.aadhar_id,
          healthIssues: data.health_issues,
          seatQuota: data.seat_quota,
          isActive: data.is_active,
          attendancePercentage: data.attendance_percentage,
          bloodGroup: data.blood_group,
          dateOfBirth: data.date_of_birth,
          emergencyContact: data.emergency_contact,
          isHostler: data.is_hostler,
          hostelDetails: data.hostel_details,
          transportDetails: data.transport_details,
          careerGoals: data.career_goals,
          placementStatus: data.placement_status,
          placementDetails: data.placement_details,
          achievements: data.achievements,
          supplies: data.supplies,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
        return mappedData;
      }
      
      return data;
    } catch (error) {
      console.error('Error updating student:', error)
      return null
    }
  }

  async deleteStudent(studentId: string): Promise<boolean> {
    try {
      const { error } = await db
        .from('students')
        .delete()
        .eq('id', studentId)
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting student:', error)
      return false
    }
  }

  // Search students
  async searchStudents(searchTerm: string): Promise<any[]> {
    try {
      const { data, error } = await db
        .from('students')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,register_id.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .order('name')
      
      if (error) throw error
      
      // Map database response back to frontend format
      if (data) {
        return data.map(student => ({
          ...student,
          registerId: student.register_id,
          phoneNumber: student.phone_number,
          fatherName: student.father_name,
          fatherOccupation: student.father_occupation,
          fatherMobile: student.father_mobile,
          motherName: student.mother_name,
          motherOccupation: student.mother_occupation,
          motherMobile: student.mother_mobile,
          apaarId: student.apaar_id,
          aadharId: student.aadhar_id,
          healthIssues: student.health_issues,
          seatQuota: student.seat_quota,
          isActive: student.is_active,
          attendancePercentage: student.attendance_percentage,
          bloodGroup: student.blood_group,
          dateOfBirth: student.date_of_birth,
          emergencyContact: student.emergency_contact,
          isHostler: student.is_hostler,
          hostelDetails: student.hostel_details,
          transportDetails: student.transport_details,
          careerGoals: student.career_goals,
          placementStatus: student.placement_status,
          placementDetails: student.placement_details,
          createdAt: student.created_at,
          updatedAt: student.updated_at
        }));
      }
      
      return data || []
    } catch (error) {
      console.error('Error searching students:', error)
      return []
    }
  }

  // Search users
  async searchUsers(searchTerm: string): Promise<User[]> {
    try {
      const { data, error } = await db
        .from('users')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,department.ilike.%${searchTerm}%`)
        .order('name')
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error searching users:', error)
      return []
    }
  }

  // Faculty Operations
  /** Create a row in faculty table when a user with role FACULTY/HOD/COORDINATOR is created. Idempotent by user_id. */
  async createFacultyRecordIfNeeded(userId: string, department: string): Promise<boolean> {
    try {
      const { data: existing } = await db.from('faculty').select('id').eq('user_id', userId).maybeSingle()
      if (existing) return true
      const employeeId = `EMP-${userId.replace(/-/g, '').slice(0, 12)}`
      const { error } = await db.from('faculty').insert([{
        user_id: userId,
        employee_id: employeeId,
        department: department || 'CSE',
        is_active: true,
      }])
      if (error) {
        console.error('Error creating faculty record:', error)
        return false
      }
      return true
    } catch (error) {
      console.error('Error creating faculty record:', error)
      return false
    }
  }

  async getAllFaculty(): Promise<Faculty[]> {
    try {
      const { data, error } = await db
        .from('faculty')
        .select('*')
        .order('department')
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching all faculty:', error)
      return []
    }
  }

  async getFacultyByDepartment(department: Department): Promise<Faculty[]> {
    try {
      const { data, error } = await db
        .from('faculty')
        .select('*')
        .eq('department', department)
        .order('name')
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching faculty by department:', error)
      return []
    }
  }

  // Class & Academic Management
  async getAllClasses(): Promise<Class[]> {
    try {
      const { data, error } = await db
        .from('classes')
        .select('*')
        .order('name')
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching all classes:', error)
      return []
    }
  }

  async getClassesByDepartment(department: Department): Promise<Class[]> {
    try {
      const { data, error } = await db
        .from('classes')
        .select('*')
        .eq('department', department)
        .order('name')
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching classes by department:', error)
      return []
    }
  }

  async createClass(classData: Omit<Class, 'id' | 'createdAt' | 'updatedAt'>): Promise<Class | null> {
    try {
      const { data, error } = await db
        .from('classes')
        .insert([classData])
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating class:', error)
      return null
    }
  }

  async updateClass(classId: string, updates: Partial<Class>): Promise<Class | null> {
    try {
      const { data, error } = await db
        .from('classes')
        .update(updates)
        .eq('id', classId)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating class:', error)
      return null
    }
  }

  async deleteClass(classId: string): Promise<boolean> {
    try {
      const { error } = await db
        .from('classes')
        .delete()
        .eq('id', classId)
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting class:', error)
      return false
    }
  }

  // Attendance Management
  async getAttendanceRecords(): Promise<AttendanceRecord[]> {
    try {
      const { data, error } = await db
        .from('attendance_records')
        .select(`
          *,
          students!inner(*)
        `)
        .order('date', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching attendance records:', error)
      return []
    }
  }

  async getAttendanceByClass(classId: string, date?: string): Promise<AttendanceRecord[]> {
    try {
      let query = db
        .from('attendance_records')
        .select(`
          *,
          students!inner(*)
        `)
        .eq('class_id', classId)
      
      if (date) {
        query = query.eq('date', date)
      }
      
      const { data, error } = await query.order('date', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching attendance by class:', error)
      return []
    }
  }

  async markAttendance(attendanceData: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AttendanceRecord | null> {
    try {
      const { data, error } = await db
        .from('attendance_records')
        .insert([attendanceData])
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error marking attendance:', error)
      return null
    }
  }

  async updateAttendance(attendanceId: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord | null> {
    try {
      const { data, error } = await db
        .from('attendance_records')
        .update(updates)
        .eq('id', attendanceId)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating attendance:', error)
      return null
    }
  }

  // Library Management
  async getAllBooks(): Promise<Book[]> {
    try {
      const { data, error } = await db
        .from('books')
        .select('*')
        .order('title')
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching all books:', error)
      return []
    }
  }

  async getBooksByCategory(category: string): Promise<Book[]> {
    try {
      const { data, error } = await db
        .from('books')
        .select('*')
        .eq('category', category)
        .order('title')
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching books by category:', error)
      return []
    }
  }

  async searchBooks(searchTerm: string): Promise<Book[]> {
    try {
      const { data, error } = await db
        .from('books')
        .select('*')
        .or(`title.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%,isbn.ilike.%${searchTerm}%`)
        .order('title')
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error searching books:', error)
      return []
    }
  }

  async createBook(bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Promise<Book | null> {
    try {
      const { data, error } = await db
        .from('books')
        .insert([bookData])
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating book:', error)
      return null
    }
  }

  async updateBook(bookId: string, updates: Partial<Book>): Promise<Book | null> {
    try {
      const { data, error } = await db
        .from('books')
        .update(updates)
        .eq('id', bookId)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating book:', error)
      return null
    }
  }

  async deleteBook(bookId: string): Promise<boolean> {
    try {
      const { error } = await db
        .from('books')
        .delete()
        .eq('id', bookId)
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting book:', error)
      return false
    }
  }

  // Tech News & Carousel
  async getAllTechNews(): Promise<any[]> {
    try {
      const { data, error } = await db
        .from('tech_news')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching all tech news:', error)
      return []
    }
  }

  async getTechNewsByDepartment(department: Department): Promise<any[]> {
    try {
      const { data, error } = await db
        .from('tech_news')
        .select('*')
        .eq('department', department)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching tech news by department:', error)
      return []
    }
  }

  async createTechNews(newsData: any): Promise<any> {
    try {
      const { data, error } = await db
        .from('tech_news')
        .insert([newsData])
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating tech news:', error)
      return null
    }
  }

  async updateTechNews(newsId: string, updates: any): Promise<any> {
    try {
      const { data, error } = await db
        .from('tech_news')
        .update(updates)
        .eq('id', newsId)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating tech news:', error)
      return null
    }
  }

  async deleteTechNews(newsId: string): Promise<boolean> {
    try {
      const { error } = await db
        .from('tech_news')
        .delete()
        .eq('id', newsId)
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting tech news:', error)
      return false
    }
  }

  // Faculty Assignment Operations
  async getAllFacultyAssignments(): Promise<any[]> {
    try {
      const { data, error } = await db
        .from('faculty_assignments')
        .select('*')
        .order('day', { ascending: true })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching all faculty assignments:', error)
      return []
    }
  }

  async getFacultyAssignmentsByFaculty(facultyId: string): Promise<any[]> {
    try {
      const { data, error } = await db
        .from('faculty_assignments')
        .select('*')
        .eq('faculty_id', facultyId)
        .order('day', { ascending: true })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching faculty assignments by faculty:', error)
      return []
    }
  }

  async createFacultyAssignment(assignmentData: any): Promise<any> {
    try {
      const { data, error } = await db
        .from('faculty_assignments')
        .insert([assignmentData])
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating faculty assignment:', error)
      return null
    }
  }

  async updateFacultyAssignment(assignmentId: string, updates: any): Promise<any> {
    try {
      const { data, error } = await db
        .from('faculty_assignments')
        .update(updates)
        .eq('id', assignmentId)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating faculty assignment:', error)
      return null
    }
  }

  async deleteFacultyAssignment(assignmentId: string): Promise<boolean> {
    try {
      const { error } = await db
        .from('faculty_assignments')
        .delete()
        .eq('id', assignmentId)
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting faculty assignment:', error)
      return false
    }
  }

  // Group calls (video/audio – Jitsi Meet links)
  async getGroupCalls(groupId: string, activeAndScheduledOnly = true): Promise<any[]> {
    try {
      let q = db.from('group_calls').select('*').eq('group_id', groupId).order('started_at', { ascending: false })
      if (activeAndScheduledOnly) {
        q = q.in('status', ['active', 'scheduled'])
      }
      const { data, error } = await q
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching group calls:', error)
      return []
    }
  }

  async createGroupCall(row: {
    group_id: string
    created_by: string
    title: string
    call_type: 'video' | 'audio'
    status: 'active' | 'scheduled'
    meeting_url: string
    started_at?: string
    scheduled_at?: string
    message_id?: string
  }): Promise<any> {
    try {
      const { data, error } = await db.from('group_calls').insert([row]).select().single()
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating group call:', error)
      return null
    }
  }

  async updateGroupCallStatus(callId: string, status: 'active' | 'scheduled' | 'ended', endedAt?: string): Promise<boolean> {
    try {
      const updates: any = { status }
      if (status === 'ended' && endedAt) updates.ended_at = endedAt
      const { error } = await db.from('group_calls').update(updates).eq('id', callId)
      if (error) throw error
      return true
    } catch (error) {
      console.error('Error updating group call:', error)
      return false
    }
  }

  // Generated class timetables (persist to DB so visible on all devices)
  async saveClassTimetables(timetables: ClassTimetable[]): Promise<void> {
    try {
      for (const tt of timetables) {
        await db.from('timetables').delete().eq('class_id', tt.classId)
        const rows: { class_id: string; day_of_week: number; period_number: number; subject: string; faculty_id: string | null; room_number: string | null }[] = []
        for (let d = 0; d < DAYS.length; d++) {
          const day = DAYS[d]
          const slots = tt.grid[day] || []
          for (let p = 0; p < slots.length; p++) {
            const slot = slots[p]
            if (slot && (slot.subjectName || slot.subjectId)) {
              rows.push({
                class_id: tt.classId,
                day_of_week: d + 1,
                period_number: p + 1,
                subject: slot.subjectName || slot.subjectId || '',
                faculty_id: slot.facultyId || null,
                room_number: slot.room || null
              })
            }
          }
        }
        if (rows.length > 0) {
          const { error } = await db.from('timetables').insert(rows)
          if (error) throw error
        }
      }
    } catch (error) {
      console.error('Error saving class timetables:', error)
      throw error
    }
  }

  async getAllClassTimetables(): Promise<ClassTimetable[]> {
    try {
      const [ttResult, classesResult] = await Promise.all([
        db.from('timetables').select('*').order('class_id').order('day_of_week').order('period_number'),
        db.from('classes').select('id, name, department')
      ])
      if (ttResult.error) throw ttResult.error
      if (classesResult.error) throw classesResult.error
      const rows = ttResult.data || []
      const classesMap = new Map((classesResult.data || []).map((c: any) => [c.id, { name: c.name || 'Unknown', department: c.department || '' }]))
      const byClass = new Map<string, { className: string; department: string; slots: { day_of_week: number; period_number: number; subject: string; faculty_id: string | null; room_number: string | null }[] }>()
      for (const r of rows) {
        const classId = r.class_id
        if (!byClass.has(classId)) {
          const info = classesMap.get(classId) || { name: 'Unknown', department: '' }
          byClass.set(classId, { className: info.name, department: info.department, slots: [] })
        }
        byClass.get(classId)!.slots.push({
          day_of_week: r.day_of_week,
          period_number: r.period_number,
          subject: r.subject,
          faculty_id: r.faculty_id,
          room_number: r.room_number
        })
      }
      const result: ClassTimetable[] = []
      for (const [classId, { className, department, slots }] of byClass) {
        const grid = {} as Record<Day, (TimetableSlot | null)[]>
        for (const day of DAYS) {
          grid[day] = Array(7).fill(null)
        }
        for (const s of slots) {
          const day = DAYS[s.day_of_week - 1]
          const periodIndex = s.period_number - 1
          if (day && periodIndex >= 0 && periodIndex < 7) {
            grid[day][periodIndex] = {
              day,
              period: periodIndex,
              type: 'theory',
              subjectName: s.subject,
              facultyId: s.faculty_id || undefined,
              room: s.room_number || undefined
            } as TimetableSlot
          }
        }
        result.push({ classId, className, department, grid })
      }
      return result
    } catch (error) {
      console.error('Error loading class timetables:', error)
      return []
    }
  }

  async getAllCarouselImages(): Promise<any[]> {
    try {
      const { data, error } = await db
        .from('carousel_images')
        .select('*')
        .order('order_index')
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching all carousel images:', error)
      return []
    }
  }

  async getCarouselImagesByDepartment(department: Department): Promise<any[]> {
    try {
      const { data, error } = await db
        .from('carousel_images')
        .select('*')
        .eq('department', department)
        .order('order_index')
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching carousel images by department:', error)
      return []
    }
  }

  async createCarouselImage(imageData: any): Promise<any> {
    try {
      const { data, error } = await db
        .from('carousel_images')
        .insert([imageData])
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating carousel image:', error)
      return null
    }
  }

  // Dashboard Stats
  async getDashboardStats(userRole: UserRole, userDepartment?: Department): Promise<any> {
    try {
      let stats: any = {}

      // Get counts based on user role
      switch (userRole) {
        case UserRole.ADMIN:
        case UserRole.PRINCIPAL:
          // Can see all data
          const [users, students, faculty, classes, books] = await Promise.all([
            this.getAllUsers(),
            this.getAllStudents(),
            this.getAllFaculty(),
            this.getAllClasses(),
            this.getAllBooks()
          ])
          stats = {
            totalUsers: users.length,
            totalStudents: students.length,
            totalFaculty: faculty.length,
            totalClasses: classes.length,
            totalBooks: books.length
          }
          break

        case UserRole.HOD:
        case UserRole.COORDINATOR:
          // Can only see department data
          if (userDepartment) {
            const [students, faculty, classes] = await Promise.all([
              this.getStudentsByDepartment(userDepartment),
              this.getFacultyByDepartment(userDepartment),
              this.getClassesByDepartment(userDepartment)
            ])
            stats = {
              totalStudents: students.length,
              totalFaculty: faculty.length,
              totalClasses: classes.length
            }
          }
          break

        case UserRole.LIBRARIAN:
          // Library-specific stats
          const libraryBooks = await this.getAllBooks()
          stats = {
            totalBooks: libraryBooks.length
          }
          break

        default:
          stats = {}
      }

      return stats
    } catch (error) {
      console.error('Error getting dashboard stats:', error)
      return {}
    }
  }
}

export const databaseService = new DatabaseService() 