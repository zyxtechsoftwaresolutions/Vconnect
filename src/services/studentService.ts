import { Department, Supply } from '../types/user';
import { supabase, supabaseAdmin } from '../lib/supabase';

const db = supabaseAdmin || supabase;

export interface MentorInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: Department;
  designation: string;
  specialization: string;
}

export interface LibraryRecord {
  bookId: string;
  bookTitle: string;
  author: string;
  issueDate: string;
  returnDate: string;
  status: 'ISSUED' | 'RETURNED' | 'OVERDUE';
  fine?: number;
}

export interface Achievement {
  id: string;
  title: string;
  category: 'ACADEMIC' | 'SPORTS' | 'CULTURAL' | 'TECHNICAL' | 'LEADERSHIP';
  description: string;
  date: string;
  level: 'INSTITUTE' | 'STATE' | 'NATIONAL' | 'INTERNATIONAL';
  certificate?: string;
}

export interface AcademicRecord {
  semester: string;
  subjects: {
    name: string;
    code: string;
    credits: number;
    grade: string;
    marks: number;
  }[];
  sgpa: number;
  cgpa: number;
  totalCredits: number;
}

export interface AttendanceRecord {
  month: string;
  totalDays: number;
  presentDays: number;
  percentage: number;
}

export interface FeeRecord {
  semester: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  dueDate: string;
  status: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE';
}

export interface StudentData {
  id: string;
  name: string;
  registerId: string;
  regulation: string;
  email: string;
  class: string;
  department: Department;
  attendance: string;
  phoneNumber: string;
  fatherName?: string;
  fatherOccupation?: string;
  fatherMobile?: string;
  motherName?: string;
  motherOccupation?: string;
  motherMobile?: string;
  apaarId?: string;
  aadharId?: string;
  address?: string;
  healthIssues?: string;
  seatQuota?: string;
  caste?: string;
  role?: string;
  isActive?: boolean;
  attendancePercentage?: number;
  createdAt?: Date;
  updatedAt?: Date;
  // Enhanced data
  mentor?: MentorInfo;
  libraryRecords?: LibraryRecord[];
  achievements?: Achievement[];
  academicRecords?: AcademicRecord[];
  attendanceRecords?: AttendanceRecord[];
  feeRecords?: FeeRecord[];
  bloodGroup?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
  hostelDetails?: {
    block: string;
    roomNumber: string;
    floor: string;
  };
  transportDetails?: {
    route: string;
    stop: string;
    busNumber?: string;
  };
  skills?: string[];
  languages?: string[];
  hobbies?: string[];
  careerGoals?: string;
  placementStatus?: 'PLACED' | 'NOT_PLACED' | 'HIGHER_STUDIES' | 'ENTREPRENEUR';
  placementDetails?: {
    company?: string;
    package?: number;
    role?: string;
    date?: string;
  };
  isHostler?: boolean; // true for hostler, false for day scholar
  supplies?: Supply[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// UNIFIED_STUDENTS removed - all student data now comes from database

const mapDbStudent = (dbStudent: any): StudentData => ({
  id: dbStudent.id,
  name: dbStudent.name,
  registerId: dbStudent.register_id,
  regulation: dbStudent.regulation,
  email: dbStudent.email,
  class: dbStudent.class,
  department: dbStudent.department as Department,
  attendance: dbStudent.attendance,
  phoneNumber: dbStudent.phone_number,
  fatherName: dbStudent.father_name,
  fatherOccupation: dbStudent.father_occupation,
  fatherMobile: dbStudent.father_mobile,
  motherName: dbStudent.mother_name,
  motherOccupation: dbStudent.mother_occupation,
  motherMobile: dbStudent.mother_mobile,
  apaarId: dbStudent.apaar_id,
  aadharId: dbStudent.aadhar_id,
  address: dbStudent.address,
  healthIssues: dbStudent.health_issues,
  seatQuota: dbStudent.seat_quota,
  caste: dbStudent.caste,
  role: dbStudent.role,
  isActive: dbStudent.is_active,
  attendancePercentage: dbStudent.attendance_percentage,
  isHostler: dbStudent.is_hostler,
  bloodGroup: dbStudent.blood_group,
  dateOfBirth: dbStudent.date_of_birth,
  gender: dbStudent.gender,
  emergencyContact: dbStudent.emergency_contact,
  hostelDetails: dbStudent.hostel_details,
  transportDetails: dbStudent.transport_details,
  skills: dbStudent.skills,
  languages: dbStudent.languages,
  hobbies: dbStudent.hobbies,
  careerGoals: dbStudent.career_goals,
  placementStatus: dbStudent.placement_status,
  placementDetails: dbStudent.placement_details,
  mentor: dbStudent.mentor,
  libraryRecords: dbStudent.library_records,
  achievements: dbStudent.achievements,
  academicRecords: dbStudent.academic_records,
  attendanceRecords: dbStudent.attendance_records,
  feeRecords: dbStudent.fee_records,
  createdAt: dbStudent.created_at ? new Date(dbStudent.created_at) : undefined,
  updatedAt: dbStudent.updated_at ? new Date(dbStudent.updated_at) : undefined
});

// DB-backed helpers used across components
export const getAllStudents = async (): Promise<StudentData[]> => {
  const { data, error } = await db.from('students').select('*').order('name');
  if (error || !data) {
    console.error('Error fetching students:', error?.message);
    return [];
  }
  return data.map(mapDbStudent);
};

export const getStudentsByDepartment = async (department: string): Promise<StudentData[]> => {
  const { data, error } = await db
    .from('students')
    .select('*')
    .eq('department', department)
    .order('name');
  if (error || !data) {
    console.error('Error fetching students by department:', error?.message);
    return [];
  }
  return data.map(mapDbStudent);
};

export const getStudentById = async (id: string): Promise<StudentData | null> => {
  const { data, error } = await db.from('students').select('*').eq('id', id).single();
  if (error || !data) {
    console.error('Error fetching student by id:', error?.message);
    return null;
  }
  return mapDbStudent(data);
};

export const getStudentByRegisterId = async (registerId: string): Promise<StudentData | null> => {
  const { data, error } = await db.from('students').select('*').eq('register_id', registerId).single();
  if (error || !data) {
    console.error('Error fetching student by registerId:', error?.message);
    return null;
  }
  return mapDbStudent(data);
};

export const searchStudents = async (query: string): Promise<StudentData[]> => {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await db
    .from('students')
    .select('*')
    .or(`name.ilike.%${q}%,register_id.ilike.%${q}%,email.ilike.%${q}%,class.ilike.%${q}%`)
    .order('name');
  if (error || !data) {
    console.error('Error searching students:', error?.message);
    return [];
  }
  return data.map(mapDbStudent);
};

export const updateStudent = async (studentId: string, updatedData: Partial<StudentData>): Promise<StudentData | null> => {
  const e2n = (v: any) => (v === '' ? null : v);
  const payload: any = {};

  if (updatedData.name !== undefined) payload.name = updatedData.name;
  if (updatedData.email !== undefined) payload.email = updatedData.email;
  if (updatedData.registerId !== undefined) payload.register_id = updatedData.registerId;
  if (updatedData.regulation !== undefined) payload.regulation = updatedData.regulation;
  if (updatedData.class !== undefined) payload.class = updatedData.class;
  if (updatedData.department !== undefined) payload.department = e2n(updatedData.department);
  if (updatedData.attendance !== undefined) payload.attendance = updatedData.attendance;
  if (updatedData.phoneNumber !== undefined) payload.phone_number = updatedData.phoneNumber;
  if (updatedData.fatherName !== undefined) payload.father_name = updatedData.fatherName;
  if (updatedData.fatherOccupation !== undefined) payload.father_occupation = updatedData.fatherOccupation;
  if (updatedData.fatherMobile !== undefined) payload.father_mobile = updatedData.fatherMobile;
  if (updatedData.motherName !== undefined) payload.mother_name = updatedData.motherName;
  if (updatedData.motherOccupation !== undefined) payload.mother_occupation = updatedData.motherOccupation;
  if (updatedData.motherMobile !== undefined) payload.mother_mobile = updatedData.motherMobile;
  if (updatedData.apaarId !== undefined) payload.apaar_id = updatedData.apaarId;
  if (updatedData.aadharId !== undefined) payload.aadhar_id = updatedData.aadharId;
  if (updatedData.address !== undefined) payload.address = updatedData.address;
  if (updatedData.healthIssues !== undefined) payload.health_issues = updatedData.healthIssues;
  if (updatedData.seatQuota !== undefined) payload.seat_quota = e2n(updatedData.seatQuota);
  if (updatedData.caste !== undefined) payload.caste = updatedData.caste;
  if (updatedData.role !== undefined) payload.role = updatedData.role;
  if (updatedData.isActive !== undefined) payload.is_active = updatedData.isActive;
  if (updatedData.attendancePercentage !== undefined) payload.attendance_percentage = e2n(updatedData.attendancePercentage);
  if (updatedData.bloodGroup !== undefined) payload.blood_group = e2n(updatedData.bloodGroup);
  if (updatedData.dateOfBirth !== undefined) payload.date_of_birth = e2n(updatedData.dateOfBirth);
  if (updatedData.gender !== undefined) payload.gender = e2n(updatedData.gender);
  if (updatedData.emergencyContact !== undefined) payload.emergency_contact = updatedData.emergencyContact;
  if (updatedData.isHostler !== undefined) payload.is_hostler = updatedData.isHostler;
  if (updatedData.hostelDetails !== undefined) payload.hostel_details = updatedData.hostelDetails;
  if (updatedData.transportDetails !== undefined) payload.transport_details = updatedData.transportDetails;
  if (updatedData.skills !== undefined) payload.skills = updatedData.skills;
  if (updatedData.languages !== undefined) payload.languages = updatedData.languages;
  if (updatedData.hobbies !== undefined) payload.hobbies = updatedData.hobbies;
  if (updatedData.careerGoals !== undefined) payload.career_goals = updatedData.careerGoals;
  if (updatedData.placementStatus !== undefined) payload.placement_status = e2n(updatedData.placementStatus);
  if (updatedData.placementDetails !== undefined) payload.placement_details = updatedData.placementDetails;
  if (updatedData.achievements !== undefined) payload.achievements = updatedData.achievements;
  if (updatedData.supplies !== undefined) payload.supplies = updatedData.supplies;
  payload.updated_at = new Date().toISOString();

  const { data, error } = await db
    .from('students')
    .update(payload)
    .eq('id', studentId)
    .select()
    .single();
  if (error || !data) {
    console.error('Error updating student:', error?.message);
    return null;
  }
  return mapDbStudent(data);
};

export const addStudent = async (newStudent: StudentData): Promise<StudentData | null> => {
  const e2n = (v: any) => (v === '' ? null : v);
  const payload: any = {};

  if (newStudent.name !== undefined) payload.name = newStudent.name;
  if (newStudent.email !== undefined) payload.email = newStudent.email;
  if (newStudent.registerId !== undefined) payload.register_id = newStudent.registerId;
  if (newStudent.regulation !== undefined) payload.regulation = newStudent.regulation;
  if (newStudent.class !== undefined) payload.class = newStudent.class;
  if (newStudent.department !== undefined) payload.department = e2n(newStudent.department);
  if (newStudent.attendance !== undefined) payload.attendance = newStudent.attendance;
  if (newStudent.phoneNumber !== undefined) payload.phone_number = newStudent.phoneNumber;
  if (newStudent.fatherName !== undefined) payload.father_name = newStudent.fatherName;
  if (newStudent.fatherOccupation !== undefined) payload.father_occupation = newStudent.fatherOccupation;
  if (newStudent.fatherMobile !== undefined) payload.father_mobile = newStudent.fatherMobile;
  if (newStudent.motherName !== undefined) payload.mother_name = newStudent.motherName;
  if (newStudent.motherOccupation !== undefined) payload.mother_occupation = newStudent.motherOccupation;
  if (newStudent.motherMobile !== undefined) payload.mother_mobile = newStudent.motherMobile;
  if (newStudent.address !== undefined) payload.address = newStudent.address;
  if (newStudent.healthIssues !== undefined) payload.health_issues = newStudent.healthIssues;
  if (newStudent.bloodGroup !== undefined) payload.blood_group = e2n(newStudent.bloodGroup);
  if (newStudent.dateOfBirth !== undefined) payload.date_of_birth = e2n(newStudent.dateOfBirth);
  if (newStudent.gender !== undefined) payload.gender = e2n(newStudent.gender);
  if (newStudent.emergencyContact !== undefined) payload.emergency_contact = newStudent.emergencyContact;
  if (newStudent.isHostler !== undefined) payload.is_hostler = newStudent.isHostler;
  if (newStudent.hostelDetails !== undefined) payload.hostel_details = newStudent.hostelDetails;
  if (newStudent.transportDetails !== undefined) payload.transport_details = newStudent.transportDetails;
  if (newStudent.skills !== undefined) payload.skills = newStudent.skills;
  if (newStudent.languages !== undefined) payload.languages = newStudent.languages;
  if (newStudent.hobbies !== undefined) payload.hobbies = newStudent.hobbies;
  if (newStudent.careerGoals !== undefined) payload.career_goals = newStudent.careerGoals;
  if (newStudent.isActive !== undefined) payload.is_active = newStudent.isActive;
  if (newStudent.attendancePercentage !== undefined) payload.attendance_percentage = newStudent.attendancePercentage;
  if ((newStudent as any).userId !== undefined) payload.user_id = (newStudent as any).userId;

  const { data, error } = await db.from('students').insert([payload]).select().single();
  if (error || !data) {
    console.error('Error adding student:', error?.message);
    return null;
  }
  return mapDbStudent(data);
};

class StudentService {
  private students: StudentData[] = [];

  constructor() {
    // All student data now comes from database - no mock initialization
    this.students = [];
  }

  // Removed initializeDefaultStudents - all data comes from database
  private initializeDefaultStudents_DEPRECATED() {
    // Initialize with unique roll numbers across all departments
    this.students = [
      // CSE Students
      { 
        id: 'cse-1', 
        name: 'Arjun Reddy', 
        registerId: '23NT1A0501',
        regulation: 'R23',
        email: 'arjun@viet.edu.in', 
        class: 'CSE-A', 
        department: Department.CSE,
        attendance: '92.5%',
        phoneNumber: '+91 9876543210',
        fatherName: 'Rajesh Reddy',
        fatherOccupation: 'Software Engineer',
        fatherMobile: '+91 9876543200',
        motherName: 'Lakshmi Reddy',
        motherOccupation: 'Teacher',
        motherMobile: '+91 9876543201',
        apaarId: 'APAAR123456789',
        aadharId: '1234-5678-9012',
        address: '123 Main Street, Hyderabad, Telangana',
        bloodGroup: 'B+',
        dateOfBirth: '2005-03-15',
        gender: 'MALE',
        emergencyContact: {
          name: 'Rajesh Reddy',
          relation: 'Father',
          phone: '+91 9876543200'
        },
        hostelDetails: {
          block: 'A',
          roomNumber: 'A-101',
          floor: '1'
        },
        transportDetails: {
          route: 'Route 1',
          stop: 'Central Bus Stop',
          busNumber: 'BUS-001'
        },
        skills: ['Java', 'Python', 'React', 'Node.js', 'Database Management'],
        languages: ['English', 'Telugu', 'Hindi'],
        hobbies: ['Coding', 'Reading', 'Cricket'],
                 careerGoals: 'To become a Full Stack Developer in a top tech company',
         placementStatus: 'PLACED',
         placementDetails: {
           company: 'TechCorp Solutions',
           package: 850000,
           role: 'Software Developer',
           date: '2024-01-15'
         },
         isHostler: true, // Hostler - stays in campus hostel
        mentor: {
          id: 'mentor-1',
          name: 'Dr. Sarah Johnson',
          email: 'sarah.johnson@viet.edu.in',
          phone: '+91 9876543001',
          department: Department.CSE,
          designation: 'Associate Professor',
          specialization: 'Data Structures & Algorithms'
        },
        libraryRecords: [
          {
            bookId: 'LIB001',
            bookTitle: 'Introduction to Algorithms',
            author: 'Thomas H. Cormen',
            issueDate: '2024-01-10',
            returnDate: '2024-02-10',
            status: 'RETURNED'
          },
          {
            bookId: 'LIB002',
            bookTitle: 'Clean Code',
            author: 'Robert C. Martin',
            issueDate: '2024-02-15',
            returnDate: '2024-03-15',
            status: 'ISSUED'
          }
        ],
        achievements: [
          {
            id: 'ach-1',
            title: 'Best Coder Award',
            category: 'TECHNICAL',
            description: 'Won first place in college coding competition',
            date: '2024-01-20',
            level: 'INSTITUTE'
          },
          {
            id: 'ach-2',
            title: 'Hackathon Winner',
            category: 'TECHNICAL',
            description: 'Developed innovative solution for smart city project',
            date: '2023-12-15',
            level: 'STATE'
          }
        ],
        academicRecords: [
          {
            semester: '1st Year 1st Semester',
            subjects: [
              { name: 'Programming Fundamentals', code: 'CS101', credits: 4, grade: 'A', marks: 85 },
              { name: 'Mathematics', code: 'MA101', credits: 3, grade: 'A', marks: 88 },
              { name: 'Physics', code: 'PH101', credits: 3, grade: 'B+', marks: 82 }
            ],
            sgpa: 8.5,
            cgpa: 8.5,
            totalCredits: 10
          }
        ],
        attendanceRecords: [
          { month: 'January', totalDays: 22, presentDays: 20, percentage: 90.9 },
          { month: 'February', totalDays: 20, presentDays: 18, percentage: 90.0 },
          { month: 'March', totalDays: 21, presentDays: 19, percentage: 90.5 }
        ],
        feeRecords: [
          {
            semester: '1st Year 1st Semester',
            totalAmount: 150000,
            paidAmount: 150000,
            dueAmount: 0,
            dueDate: '2024-01-31',
            status: 'PAID'
          }
        ]
      },
      { 
        id: 'cse-2', 
        name: 'Priya Sharma', 
        registerId: '23NT1A0502',
        regulation: 'R23',
        email: 'priya@viet.edu.in', 
        class: 'CSE-A', 
        department: Department.CSE,
        attendance: '89.2%',
        phoneNumber: '+91 9876543211',
        fatherName: 'Amit Sharma',
        fatherOccupation: 'Business Owner',
        fatherMobile: '+91 9876543210',
        motherName: 'Sunita Sharma',
        motherOccupation: 'Homemaker',
        motherMobile: '+91 9876543211',
        apaarId: 'APAAR123456790',
        aadharId: '1234-5678-9013',
        address: '456 Park Avenue, Mumbai, Maharashtra',
        bloodGroup: 'O+',
        dateOfBirth: '2005-07-22',
        gender: 'FEMALE',
        emergencyContact: {
          name: 'Amit Sharma',
          relation: 'Father',
          phone: '+91 9876543210'
        },
        hostelDetails: {
          block: 'B',
          roomNumber: 'B-205',
          floor: '2'
        },
        transportDetails: {
          route: 'Route 2',
          stop: 'University Gate',
          busNumber: 'BUS-002'
        },
        skills: ['Python', 'Machine Learning', 'Data Analysis', 'SQL', 'Tableau'],
        languages: ['English', 'Hindi', 'Marathi'],
        hobbies: ['Data Science', 'Painting', 'Dancing'],
                 careerGoals: 'To become a Data Scientist and work on AI/ML projects',
         placementStatus: 'NOT_PLACED',
         isHostler: false, // Day scholar - commutes from home
        mentor: {
          id: 'mentor-2',
          name: 'Dr. Michael Chen',
          email: 'michael.chen@viet.edu.in',
          phone: '+91 9876543002',
          department: Department.CSE,
          designation: 'Assistant Professor',
          specialization: 'Machine Learning & AI'
        },
        libraryRecords: [
          {
            bookId: 'LIB003',
            bookTitle: 'Machine Learning Basics',
            author: 'Andrew Ng',
            issueDate: '2024-01-05',
            returnDate: '2024-02-05',
            status: 'RETURNED'
          },
          {
            bookId: 'LIB004',
            bookTitle: 'Python for Data Science',
            author: 'Wes McKinney',
            issueDate: '2024-02-20',
            returnDate: '2024-03-20',
            status: 'OVERDUE',
            fine: 50
          }
        ],
        achievements: [
          {
            id: 'ach-3',
            title: 'Data Science Competition Winner',
            category: 'ACADEMIC',
            description: 'Achieved highest accuracy in predictive modeling challenge',
            date: '2024-02-10',
            level: 'NATIONAL'
          }
        ],
        academicRecords: [
          {
            semester: '1st Year 1st Semester',
            subjects: [
              { name: 'Programming Fundamentals', code: 'CS101', credits: 4, grade: 'A+', marks: 92 },
              { name: 'Mathematics', code: 'MA101', credits: 3, grade: 'A', marks: 85 },
              { name: 'Physics', code: 'PH101', credits: 3, grade: 'A', marks: 88 }
            ],
            sgpa: 8.8,
            cgpa: 8.8,
            totalCredits: 10
          }
        ],
        attendanceRecords: [
          { month: 'January', totalDays: 22, presentDays: 19, percentage: 86.4 },
          { month: 'February', totalDays: 20, presentDays: 17, percentage: 85.0 },
          { month: 'March', totalDays: 21, presentDays: 18, percentage: 85.7 }
        ],
        feeRecords: [
          {
            semester: '1st Year 1st Semester',
            totalAmount: 150000,
            paidAmount: 120000,
            dueAmount: 30000,
            dueDate: '2024-02-28',
            status: 'PARTIAL'
          }
        ]
      },
      { 
        id: 'cse-3', 
        name: 'Ravi Kumar', 
        registerId: '23NT1A0503',
        regulation: 'R20',
        email: 'ravi@viet.edu.in', 
        class: 'CSE-B', 
        department: Department.CSE,
        attendance: '95.1%',
        phoneNumber: '+91 9876543212',
        fatherName: 'Suresh Kumar',
        fatherOccupation: 'Government Officer',
        fatherMobile: '+91 9876543202',
        motherName: 'Geeta Kumar',
        motherOccupation: 'Nurse',
        motherMobile: '+91 9876543203',
        apaarId: 'APAAR123456791',
        aadharId: '1234-5678-9014',
        address: '789 Gandhi Road, Delhi, Delhi',
        bloodGroup: 'A+',
        dateOfBirth: '2004-11-08',
        gender: 'MALE',
        emergencyContact: {
          name: 'Suresh Kumar',
          relation: 'Father',
          phone: '+91 9876543202'
        },
        hostelDetails: {
          block: 'C',
          roomNumber: 'C-301',
          floor: '3'
        },
        transportDetails: {
          route: 'Route 3',
          stop: 'Metro Station',
          busNumber: 'BUS-003'
        },
        skills: ['C++', 'Java', 'Python', 'Android Development', 'UI/UX Design'],
        languages: ['English', 'Hindi', 'Punjabi'],
        hobbies: ['Mobile App Development', 'Photography', 'Travel'],
                 careerGoals: 'To become a Mobile App Developer and create innovative applications',
         placementStatus: 'HIGHER_STUDIES',
         isHostler: true, // Hostler - stays in campus hostel
        mentor: {
          id: 'mentor-3',
          name: 'Dr. Emily Davis',
          email: 'emily.davis@viet.edu.in',
          phone: '+91 9876543003',
          department: Department.CSE,
          designation: 'Professor',
          specialization: 'Mobile Computing & IoT'
        },
        libraryRecords: [
          {
            bookId: 'LIB005',
            bookTitle: 'Android Programming',
            author: 'Bill Phillips',
            issueDate: '2024-01-15',
            returnDate: '2024-02-15',
            status: 'RETURNED'
          },
          {
            bookId: 'LIB006',
            bookTitle: 'iOS Development',
            author: 'Matt Neuburg',
            issueDate: '2024-02-10',
            returnDate: '2024-03-10',
            status: 'ISSUED'
          }
        ],
        achievements: [
          {
            id: 'ach-4',
            title: 'Mobile App Competition Winner',
            category: 'TECHNICAL',
            description: 'Developed award-winning educational app for children',
            date: '2024-01-25',
            level: 'NATIONAL'
          },
          {
            id: 'ach-5',
            title: 'Photography Contest Winner',
            category: 'CULTURAL',
            description: 'Won first prize in college photography competition',
            date: '2023-11-20',
            level: 'INSTITUTE'
          }
        ],
        academicRecords: [
          {
            semester: '1st Year 1st Semester',
            subjects: [
              { name: 'Programming Fundamentals', code: 'CS101', credits: 4, grade: 'A+', marks: 95 },
              { name: 'Mathematics', code: 'MA101', credits: 3, grade: 'A+', marks: 92 },
              { name: 'Physics', code: 'PH101', credits: 3, grade: 'A', marks: 88 }
            ],
            sgpa: 9.2,
            cgpa: 9.2,
            totalCredits: 10
          }
        ],
        attendanceRecords: [
          { month: 'January', totalDays: 22, presentDays: 21, percentage: 95.5 },
          { month: 'February', totalDays: 20, presentDays: 19, percentage: 95.0 },
          { month: 'March', totalDays: 21, presentDays: 20, percentage: 95.2 }
        ],
        feeRecords: [
          {
            semester: '1st Year 1st Semester',
            totalAmount: 150000,
            paidAmount: 150000,
            dueAmount: 0,
            dueDate: '2024-01-31',
            status: 'PAID'
          }
        ]
      },
      { 
        id: 'cse-4', 
        name: 'Anjali Singh', 
        registerId: '23NT1A0504',
        regulation: 'R23',
        email: 'anjali@viet.edu.in', 
        class: 'CSE-C', 
        department: Department.CSE,
        attendance: '87.8%',
        phoneNumber: '+91 9876543213'
      },
      { 
        id: 'cse-5', 
        name: 'Vikram Patel', 
        registerId: '23NT1A0505',
        regulation: 'R20',
        email: 'vikram@viet.edu.in', 
        class: 'CSE-D', 
        department: Department.CSE,
        attendance: '91.3%',
        phoneNumber: '+91 9876543214'
      },
      // ECE Students
      { 
        id: 'ece-1', 
        name: 'Meera Patel', 
        registerId: '23NT1A0601',
        regulation: 'R23',
        email: 'meera@viet.edu.in', 
        class: 'ECE-A', 
        department: Department.ECE,
        attendance: '94.2%',
        phoneNumber: '+91 9876543220'
      },
      { 
        id: 'ece-2', 
        name: 'Amit Kumar', 
        registerId: '23NT1A0602',
        regulation: 'R23',
        email: 'amit@viet.edu.in', 
        class: 'ECE-A', 
        department: Department.ECE,
        attendance: '88.7%',
        phoneNumber: '+91 9876543221'
      },
      { 
        id: 'ece-3', 
        name: 'Sunita Verma', 
        registerId: '23NT1A0603',
        regulation: 'R20',
        email: 'sunita@viet.edu.in', 
        class: 'ECE-B', 
        department: Department.ECE,
        attendance: '93.5%',
        phoneNumber: '+91 9876543222'
      },
      { 
        id: 'ece-4', 
        name: 'Ramesh Patel', 
        registerId: '23NT1A0604',
        regulation: 'R23',
        email: 'ramesh@viet.edu.in', 
        class: 'ECE-C', 
        department: Department.ECE,
        attendance: '90.1%',
        phoneNumber: '+91 9876543223'
      },
      // EEE Students
      { 
        id: 'eee-1', 
        name: 'Deepak Sharma', 
        registerId: '23NT1A0701',
        regulation: 'R23',
        email: 'deepak@viet.edu.in', 
        class: 'EEE-A', 
        department: Department.EEE,
        attendance: '91.8%',
        phoneNumber: '+91 9876543230'
      },
      { 
        id: 'eee-2', 
        name: 'Kavita Gupta', 
        registerId: '23NT1A0702',
        regulation: 'R20',
        email: 'kavita@viet.edu.in', 
        class: 'EEE-B', 
        department: Department.EEE,
        attendance: '89.4%',
        phoneNumber: '+91 9876543231'
      },
      { 
        id: 'eee-3', 
        name: 'Sanjay Singh', 
        registerId: '23NT1A0703',
        regulation: 'R23',
        email: 'sanjay@viet.edu.in', 
        class: 'EEE-C', 
        department: Department.EEE,
        attendance: '92.7%',
        phoneNumber: '+91 9876543232'
      },
      // CIVIL Students
      { 
        id: 'civil-1', 
        name: 'Manoj Kumar', 
        registerId: '23NT1A0801',
        regulation: 'R23',
        email: 'manoj@viet.edu.in', 
        class: 'CIVIL-A', 
        department: Department.CIVIL,
        attendance: '93.9%',
        phoneNumber: '+91 9876543240'
      },
      { 
        id: 'civil-2', 
        name: 'Rekha Sharma', 
        registerId: '23NT1A0802',
        regulation: 'R20',
        email: 'rekha@viet.edu.in', 
        class: 'CIVIL-B', 
        department: Department.CIVIL,
        attendance: '87.6%',
        phoneNumber: '+91 9876543241'
      },
      { 
        id: 'civil-3', 
        name: 'Arun Patel', 
        registerId: '23NT1A0803',
        regulation: 'R23',
        email: 'arun@viet.edu.in', 
        class: 'CIVIL-C', 
        department: Department.CIVIL,
        attendance: '90.3%',
        phoneNumber: '+91 9876543242'
      },
      // MECH Students
      { 
        id: 'mech-1', 
        name: 'Vikram Singh', 
        registerId: '23NT1A0901',
        regulation: 'R23',
        email: 'vikram.s@viet.edu.in', 
        class: 'MECH-A', 
        department: Department.MECH,
        attendance: '94.5%',
        phoneNumber: '+91 9876543250'
      },
      { 
        id: 'mech-2', 
        name: 'Priya Verma', 
        registerId: '23NT1A0902',
        regulation: 'R20',
        email: 'priya.v@viet.edu.in', 
        class: 'MECH-B', 
        department: Department.MECH,
        attendance: '88.9%',
        phoneNumber: '+91 9876543251'
      },
      { 
        id: 'mech-3', 
        name: 'Rajesh Kumar', 
        registerId: '23NT1A0903',
        regulation: 'R23',
        email: 'rajesh.k@viet.edu.in', 
        class: 'MECH-C', 
        department: Department.MECH,
        attendance: '91.2%',
        phoneNumber: '+91 9876543252'
      },
      // AME Students
      { 
        id: 'ame-1', 
        name: 'Aditya Sharma', 
        registerId: '23NT1A1001',
        regulation: 'R23',
        email: 'aditya@viet.edu.in', 
        class: 'AME-A', 
        department: Department.AME,
        attendance: '92.1%',
        phoneNumber: '+91 9876543260'
      },
      { 
        id: 'ame-2', 
        name: 'Neha Patel', 
        registerId: '23NT1A1002',
        regulation: 'R20',
        email: 'neha@viet.edu.in', 
        class: 'AME-B', 
        department: Department.AME,
        attendance: '89.7%',
        phoneNumber: '+91 9876543261'
      },
      // MBA Students
      { 
        id: 'mba-1', 
        name: 'Business Manager', 
        registerId: '23NT1A1101',
        regulation: 'R23',
        email: 'business@viet.edu.in', 
        class: 'MBA-A', 
        department: Department.MBA,
        attendance: '95.8%',
        phoneNumber: '+91 9876543270'
      },
      { 
        id: 'mba-2', 
        name: 'Finance Expert', 
        registerId: '23NT1A1102',
        regulation: 'R20',
        email: 'finance@viet.edu.in', 
        class: 'MBA-B', 
        department: Department.MBA,
        attendance: '93.2%',
        phoneNumber: '+91 9876543271'
      },
      // MCA Students
      { 
        id: 'mca-1', 
        name: 'Computer Applications', 
        registerId: '23NT1A1201',
        regulation: 'R23',
        email: 'computer@viet.edu.in', 
        class: 'MCA-A', 
        department: Department.MCA,
        attendance: '91.5%',
        phoneNumber: '+91 9876543280'
      },
      { 
        id: 'mca-2', 
        name: 'Software Developer', 
        registerId: '23NT1A1202',
        regulation: 'R20',
        email: 'software@viet.edu.in', 
        class: 'MCA-B', 
        department: Department.MCA,
        attendance: '88.3%',
        phoneNumber: '+91 9876543281'
      }
    ];
  }

  // Get all students
  async getAllStudents(): Promise<StudentData[]> {
    try {
      // Try to get from database first
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching students from database:', error);
        return [];
      }
      
      // Transform database data to StudentData format
      const dbStudents = data.map(dbStudent => ({
        id: dbStudent.id,
        name: dbStudent.name,
        registerId: dbStudent.register_id,
        regulation: dbStudent.regulation,
        email: dbStudent.email,
        class: dbStudent.class,
        department: dbStudent.department as Department,
        attendance: dbStudent.attendance,
        phoneNumber: dbStudent.phone_number,
        fatherName: dbStudent.father_name,
        fatherOccupation: dbStudent.father_occupation,
        fatherMobile: dbStudent.father_mobile,
        motherName: dbStudent.mother_name,
        motherOccupation: dbStudent.mother_occupation,
        motherMobile: dbStudent.mother_mobile,
        apaarId: dbStudent.apaar_id,
        aadharId: dbStudent.aadhar_id,
        address: dbStudent.address,
        healthIssues: dbStudent.health_issues,
        seatQuota: dbStudent.seat_quota,
        caste: dbStudent.caste,
        role: dbStudent.role,
        isActive: dbStudent.is_active,
        attendancePercentage: dbStudent.attendance_percentage,
        isHostler: dbStudent.is_hostler,
        bloodGroup: dbStudent.blood_group,
        dateOfBirth: dbStudent.date_of_birth,
        gender: dbStudent.gender,
        emergencyContact: dbStudent.emergency_contact,
        hostelDetails: dbStudent.hostel_details,
        transportDetails: dbStudent.transport_details,
        skills: dbStudent.skills,
        languages: dbStudent.languages,
        hobbies: dbStudent.hobbies,
        careerGoals: dbStudent.career_goals,
        placementStatus: dbStudent.placement_status,
        placementDetails: dbStudent.placement_details,
        mentor: dbStudent.mentor,
        libraryRecords: dbStudent.library_records,
        achievements: dbStudent.achievements,
        academicRecords: dbStudent.academic_records,
        attendanceRecords: dbStudent.attendance_records,
        feeRecords: dbStudent.fee_records,
        createdAt: new Date(dbStudent.created_at),
        updatedAt: new Date(dbStudent.updated_at)
      }));
      
      return dbStudents;
    } catch (error) {
      console.error('Error in getAllStudents:', error);
      return [];
    }
  }

  // Get students by department
  async getStudentsByDepartment(department: Department): Promise<StudentData[]> {
    try {
      // Try to get from database first
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('department', department)
        .order('name');
      
      if (error) {
        console.error('Error fetching students by department from database:', error);
        return [];
      }
      
      // Transform database data to StudentData format
      const dbStudents = data.map(dbStudent => ({
        id: dbStudent.id,
        name: dbStudent.name,
        registerId: dbStudent.register_id,
        regulation: dbStudent.regulation,
        email: dbStudent.email,
        class: dbStudent.class,
        department: dbStudent.department as Department,
        attendance: dbStudent.attendance,
        phoneNumber: dbStudent.phone_number,
        fatherName: dbStudent.father_name,
        fatherOccupation: dbStudent.father_occupation,
        fatherMobile: dbStudent.father_mobile,
        motherName: dbStudent.mother_name,
        motherOccupation: dbStudent.mother_occupation,
        motherMobile: dbStudent.mother_mobile,
        apaarId: dbStudent.apaar_id,
        aadharId: dbStudent.aadhar_id,
        address: dbStudent.address,
        healthIssues: dbStudent.health_issues,
        seatQuota: dbStudent.seat_quota,
        caste: dbStudent.caste,
        role: dbStudent.role,
        isActive: dbStudent.is_active,
        attendancePercentage: dbStudent.attendance_percentage,
        isHostler: dbStudent.is_hostler,
        bloodGroup: dbStudent.blood_group,
        dateOfBirth: dbStudent.date_of_birth,
        gender: dbStudent.gender,
        emergencyContact: dbStudent.emergency_contact,
        hostelDetails: dbStudent.hostel_details,
        transportDetails: dbStudent.transport_details,
        skills: dbStudent.skills,
        languages: dbStudent.languages,
        hobbies: dbStudent.hobbies,
        careerGoals: dbStudent.career_goals,
        placementStatus: dbStudent.placement_status,
        placementDetails: dbStudent.placement_details,
        mentor: dbStudent.mentor,
        libraryRecords: dbStudent.library_records,
        achievements: dbStudent.achievements,
        academicRecords: dbStudent.academic_records,
        attendanceRecords: dbStudent.attendance_records,
        feeRecords: dbStudent.fee_records,
        createdAt: new Date(dbStudent.created_at),
        updatedAt: new Date(dbStudent.updated_at)
      }));
      
      return dbStudents;
    } catch (error) {
      console.error('Error in getStudentsByDepartment:', error);
      return [];
    }
  }

  // Get student by ID
  getStudentById(id: string): StudentData | undefined {
    return this.students.find(student => student.id === id);
  }

  // Get student by register ID
  getStudentByRegisterId(registerId: string): StudentData | undefined {
    return this.students.find(student => student.registerId === registerId);
  }

  // Get student by email (async - checks database first)
  async getStudentByEmail(email: string): Promise<StudentData | null> {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      // Transform database data to StudentData format
      return {
        id: data.id,
        name: data.name,
        registerId: data.register_id,
        regulation: data.regulation,
        email: data.email,
        class: data.class,
        department: data.department as Department,
        attendance: data.attendance,
        phoneNumber: data.phone_number,
        fatherName: data.father_name,
        fatherOccupation: data.father_occupation,
        fatherMobile: data.father_mobile,
        motherName: data.mother_name,
        motherOccupation: data.mother_occupation,
        motherMobile: data.mother_mobile,
        apaarId: data.apaar_id,
        aadharId: data.aadhar_id,
        address: data.address,
        healthIssues: data.health_issues,
        seatQuota: data.seat_quota,
        caste: data.caste,
        role: data.role,
        isActive: data.is_active,
        attendancePercentage: data.attendance_percentage,
        isHostler: data.is_hostler,
        bloodGroup: data.blood_group,
        dateOfBirth: data.date_of_birth,
        gender: data.gender,
        emergencyContact: data.emergency_contact,
        hostelDetails: data.hostel_details,
        transportDetails: data.transport_details,
        skills: data.skills,
        languages: data.languages,
        hobbies: data.hobbies,
        careerGoals: data.career_goals,
        placementStatus: data.placement_status,
        placementDetails: data.placement_details,
        mentor: data.mentor,
        libraryRecords: data.library_records,
        achievements: data.achievements,
        academicRecords: data.academic_records,
        attendanceRecords: data.attendance_records,
        feeRecords: data.fee_records,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Error in getStudentByEmail:', error);
      return null;
    }
  }

  // Check if register ID is unique
  isRegisterIdUnique(registerId: string, excludeStudentId?: string): boolean {
    return true;
  }

  // Check if email is unique
  isEmailUnique(email: string, excludeStudentId?: string): boolean {
    return true;
  }

  // Validate student data
  validateStudent(studentData: Partial<StudentData>, isEdit: boolean = false): ValidationResult {
    const errors: string[] = [];

    // Required fields validation
    if (!studentData.name?.trim()) {
      errors.push('Student name is required');
    }

    if (!studentData.registerId?.trim()) {
      errors.push('Register ID is required');
    } else {
      // Register ID format validation
      const registerIdPattern = /^[0-9]{2}[A-Z]{2}[0-9][A-Z][0-9]{2}[0-9A-Z]{2}$/i;
      if (!registerIdPattern.test(studentData.registerId)) {
        errors.push('Register ID must be in format: NNLLNLNNNN or NNLLNLNNLL (e.g., 23NT1A0552)');
      }
    }

    if (!studentData.email?.trim()) {
      errors.push('Email is required');
    } else {
      // Email format validation
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(studentData.email)) {
        errors.push('Please enter a valid email address');
      }
    }

    if (!studentData.phoneNumber?.trim()) {
      errors.push('Phone number is required');
    } else {
      // Phone number format validation
      const phonePattern = /^\+91 [0-9]{10}$/;
      if (!phonePattern.test(studentData.phoneNumber)) {
        errors.push('Phone number must be in format: +91 XXXXXXXXXX');
      }
    }

    if (!studentData.regulation?.trim()) {
      errors.push('Regulation is required');
    } else {
      // Regulation format validation
      const regulationPattern = /^R[0-9]{2}$/;
      if (!regulationPattern.test(studentData.regulation)) {
        errors.push('Regulation must be in format: RXX (e.g., R23, R20)');
      }
    }

    if (!studentData.class?.trim()) {
      errors.push('Class is required');
    }

    if (!studentData.department) {
      errors.push('Department is required');
    }

    // Uniqueness validation
    if (studentData.registerId) {
      if (!this.isRegisterIdUnique(studentData.registerId, isEdit ? studentData.id : undefined)) {
        errors.push('Register ID already exists. Each student must have a unique roll number.');
      }
    }

    if (studentData.email) {
      if (!this.isEmailUnique(studentData.email, isEdit ? studentData.id : undefined)) {
        errors.push('Email already exists. Each student must have a unique email address.');
      }
    }

    // Class-department validation
    if (studentData.class && studentData.department) {
      const classPrefix = studentData.class.split('-')[0];
      const departmentPrefix = studentData.department;
      
      if (classPrefix !== departmentPrefix) {
        errors.push(`Class must belong to the selected department. ${classPrefix} class cannot be assigned to ${departmentPrefix} department.`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Add new student
  addStudent(studentData: Omit<StudentData, 'id' | 'createdAt' | 'updatedAt'>): StudentData {
    throw new Error('Mock addStudent deprecated. Use DB addStudent helper.');
  }

  // Update student
  updateStudent(studentId: string, updates: Partial<StudentData>): StudentData | null {
    throw new Error('Mock updateStudent deprecated. Use DB updateStudent helper.');
  }

  // Delete student
  deleteStudent(studentId: string): boolean {
    throw new Error('Mock deleteStudent deprecated. Use DB delete via Supabase.');
  }

  // Generate next register ID for a department
  generateNextRegisterId(department: Department, regulation: string): string {
    const year = new Date().getFullYear().toString().slice(-2);
    const departmentCode = this.getDepartmentCode(department);
    
    return `${year}NT1A0001`;
  }

  // Get department code for register ID
  private getDepartmentCode(department: Department): string {
    const departmentCodes: Record<Department, string> = {
      [Department.CSE]: '05',
      [Department.ECE]: '06',
      [Department.EEE]: '07',
      [Department.CIVIL]: '08',
      [Department.MECH]: '09',
      [Department.AME]: '10',
      [Department.MBA]: '11',
      [Department.MCA]: '12',
      [Department.DIPLOMA]: '13',
      [Department.BBA]: '14',
      [Department.BCA]: '15',
      [Department.BSH]: '16' // BS&H department code
    };
    return departmentCodes[department] || '00';
  }

  // Get classes by department
  getClassesByDepartment(department: Department): string[] {
    const departmentClasses: Record<Department, string[]> = {
      [Department.CSE]: ['CSE-A', 'CSE-B', 'CSE-C', 'CSE-D'],
      [Department.ECE]: ['ECE-A', 'ECE-B', 'ECE-C'],
      [Department.EEE]: ['EEE-A', 'EEE-B', 'EEE-C'],
      [Department.CIVIL]: ['CIVIL-A', 'CIVIL-B', 'CIVIL-C'],
      [Department.MECH]: ['MECH-A', 'MECH-B', 'MECH-C'],
      [Department.AME]: ['AME-A', 'AME-B'],
      [Department.MBA]: ['MBA-A', 'MBA-B'],
      [Department.MCA]: ['MCA-A', 'MCA-B'],
      [Department.DIPLOMA]: ['DIPLOMA-A', 'DIPLOMA-B'],
      [Department.BBA]: ['BBA-A', 'BBA-B'],
      [Department.BCA]: ['BCA-A', 'BCA-B'],
      [Department.BSH]: ['BS&H-A', 'BS&H-B', 'BS&H-C', 'BS&H-D'] // BS&H classes for first-year students
    };
    return departmentClasses[department] || [];
  }

  // Check if student is in first year (BS&H department)
  isFirstYearStudent(student: StudentData): boolean {
    return student.department === Department.BSH;
  }

  // Get student's academic year based on department and regulation
  getStudentAcademicYear(student: StudentData): number {
    if (student.department === Department.BSH) {
      return 1; // First year students are always in year 1
    }
    
    // For other departments, calculate based on regulation and current year
    const currentYear = new Date().getFullYear();
    const regulationYear = parseInt(student.regulation.replace('R', ''));
    const yearsSinceRegulation = currentYear - regulationYear;
    
    // Assuming 4-year B.Tech program
    return Math.min(Math.max(yearsSinceRegulation + 1, 1), 4);
  }

  // Transfer student from BS&H to their respective department after first year
  transferStudentFromBSH(studentId: string, targetDepartment: Department): StudentData | null {
    throw new Error('Mock transfer deprecated. Use DB-backed transfer logic.');
  }

  // Get all students eligible for transfer (BS&H students who completed first year)
  getEligibleStudentsForTransfer(): StudentData[] {
    return [];
  }
}

// Export singleton instance
export const studentService = new StudentService(); 