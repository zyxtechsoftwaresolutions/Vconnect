
export enum UserRole {
  ADMIN = 'ADMIN',
  PRINCIPAL = 'PRINCIPAL',
  HOD = 'HOD',
  COORDINATOR = 'COORDINATOR',
  EXAM_CELL_COORDINATOR = 'EXAM_CELL_COORDINATOR',
  CR = 'CR',
  STUDENT = 'STUDENT',
  FACULTY = 'FACULTY',
  GUEST = 'GUEST',
  LIBRARIAN = 'LIBRARIAN',
  ACCOUNTANT = 'ACCOUNTANT'
}

export enum Department {
  CSE = 'CSE',
  CSM = 'CSM',
  ECE = 'ECE',
  EEE = 'EEE',
  CIVIL = 'CIVIL',
  MECH = 'MECH',
  AME = 'AME',
  MBA = 'MBA',
  MCA = 'MCA',
  DIPLOMA = 'DIPLOMA',
  BBA = 'BBA',
  BCA = 'BCA',
  BSH = 'BS&H'
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Password field for database operations
  role: UserRole;
  department?: Department;
  profilePicture?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Student extends User {
  registerId: string;
  regulation: string; // R23, R20, etc.
  department: Department;
  phoneNumber: string;
  fatherName: string;
  fatherOccupation: string;
  fatherMobile: string;
  motherName: string;
  motherOccupation: string;
  motherMobile: string;
  apaarId: string;
  aadharId: string;
  address: string;
  healthIssues?: string;
  seatQuota: 'CQ' | 'MQ';
  caste: string;
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  hostlerStatus: 'HOSTLER' | 'DAYSCHOLAR';
  classId: string;
  attendancePercentage: number;
  supplies: Supply[];
  mentorId?: string; // Faculty mentor assigned to this student
  mentor?: {
    name: string;
    email: string;
    phoneNumber: string;
    employeeId: string;
    department: string;
    designation: string;
    officeLocation: string;
    officeHours: string;
  };
}

export interface Faculty extends User {
  employeeId: string;
  department: Department;
  subjects: string[];
  assignedClasses: string[];
  timetable: FacultyTimetable;
  mentees: string[]; // Student IDs assigned as mentees
  designation: string;
  officeLocation: string;
  officeHours: string;
  phoneNumber: string;
}

export interface FacultyTimetable {
  [day: string]: {
    [period: string]: {
      subject: string;
      classId: string;
      room: string;
    } | null;
  };
}

export interface Supply {
  subject: string;
  semester: number;
  academicYear: string;
  attempts: number;
}

export interface Class {
  id: string;
  name: string;
  department: Department;
  semester: number;
  academicYear: string;
  coordinatorId: string;
  crIds: string[];
  studentIds: string[];
  timetable: Timetable;
  createdAt: Date;
}

export interface Timetable {
  [day: string]: {
    [period: string]: {
      subject: string;
      facultyId: string;
      room: string;
    };
  };
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  period: number;
  subject: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  markedBy: string;
  markedAt: Date;
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  scheduledBy: string;
  attendees: string[];
  dateTime: Date;
  location: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
}

export interface Notification {
  id: string;
  userId: string;
  type: 'ATTENDANCE' | 'MEETING' | 'GENERAL' | 'LIBRARY';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  totalCopies: number;
  availableCopies: number;
  category: string;
  publishedYear: number;
}

export interface BookIssue {
  id: string;
  bookId: string;
  studentId: string;
  issueDate: Date;
  dueDate: Date;
  returnDate?: Date;
  fine: number;
  status: 'ISSUED' | 'RETURNED' | 'OVERDUE';
}

export interface SemesterResult {
  semester: number;
  academicYear: string;
  subjects: SubjectResult[];
  cgpa: number;
  supplies: Supply[];
}

export interface SubjectResult {
  subject: string;
  marks: number;
  grade: string;
  credits: number;
  status: 'PASS' | 'FAIL';
}

export enum FeeType {
  TUITION_FEE = 'TUITION_FEE',
  BUS_FEE = 'BUS_FEE',
  CRT_FEE = 'CRT_FEE',
  SUPPLY_FEE = 'SUPPLY_FEE',
  HOSTEL_FEE = 'HOSTEL_FEE',
  UNIVERSITY_FEE = 'UNIVERSITY_FEE',
  CUSTOM = 'CUSTOM'
}

export interface FeeStructure {
  id: string;
  feeType: FeeType;
  customName?: string;
  amount: number;
  dueDate: Date;
  semester: number;
  academicYear: string;
  isRecurring: boolean;
  description?: string;
}

export interface StudentFeeRecord {
  id: string;
  studentId: string;
  feeStructureId: string;
  amountDue: number;
  amountPaid: number;
  paidDate?: Date;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  transactionId?: string;
  paymentMethod?: string;
  lateFeesApplied: number;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentTransaction {
  id: string;
  studentId: string;
  feeRecordIds: string[];
  totalAmount: number;
  paidAmount: number;
  paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
  transactionReference?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  processedBy: string;
  processedAt: Date;
  remarks?: string;
}

export interface LeaveRequest {
  id: string;
  studentId: string;
  mentorId: string;
  type: 'SICK' | 'CASUAL' | 'EMERGENCY' | 'OTHER';
  startDate: Date;
  endDate: Date;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: Date;
  processedAt?: Date;
  remarks?: string;
}

export interface PermissionRequest {
  id: string;
  studentId: string;
  mentorId: string;
  type: 'LATE' | 'EARLY' | 'ABSENT' | 'OTHER';
  date: Date;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: Date;
  processedAt?: Date;
  remarks?: string;
}
