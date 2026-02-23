import { Department } from '../types/user';
import { databaseService } from './databaseService';

export interface FacultyAssignment {
  id: string;
  facultyId: string;
  facultyName: string;
  department: Department;
  day: string;
  period: number;
  timeSlot: string;
  subject: string;
  class: string;
  room: string;
  createdAt: Date;
}

export interface ConflictInfo {
  hasConflict: boolean;
  conflictingAssignments: FacultyAssignment[];
  message: string;
}

class FacultyAssignmentService {
  private assignments: FacultyAssignment[] = [];
  private facultyData: { [key: string]: { name: string; department: Department } } = {
    'faculty-1': { name: 'Dr. Priya Sharma', department: Department.CSE },
    'faculty-2': { name: 'Prof. Meera Patel', department: Department.CSE },
    'faculty-3': { name: 'Dr. Rajesh Kumar', department: Department.CSE },
    'faculty-4': { name: 'Prof. Amit Kumar', department: Department.ECE },
    'faculty-5': { name: 'Dr. Sunita Verma', department: Department.ECE },
    'faculty-6': { name: 'Prof. Deepak Sharma', department: Department.EEE },
    'faculty-7': { name: 'Dr. Manoj Kumar', department: Department.CIVIL },
    'faculty-8': { name: 'Prof. Vikram Singh', department: Department.MECH },
    'faculty-9': { name: 'Dr. Aditya Sharma', department: Department.AME },
    'faculty-10': { name: 'Prof. Business Manager', department: Department.MBA },
  };

  constructor() {
    // Assignments are loaded from DB via getAllAssignments / getAssignmentsByDepartment
  }

  private _initializeDefaultAssignments_UNUSED() {
    // Initialize with some default assignments
    const defaultAssignments: Omit<FacultyAssignment, 'id' | 'createdAt'>[] = [
      // CSE Faculty Assignments
      {
        facultyId: 'faculty-1',
        facultyName: 'Dr. Priya Sharma',
        department: Department.CSE,
        day: 'Monday',
        period: 0,
        timeSlot: '9:10 - 10:00',
        subject: 'Data Structures',
        class: 'CSE-A',
        room: 'CSE-101'
      },
      {
        facultyId: 'faculty-1',
        facultyName: 'Dr. Priya Sharma',
        department: Department.CSE,
        day: 'Monday',
        period: 3,
        timeSlot: '11:40 - 12:30',
        subject: 'Database Systems',
        class: 'CSE-A',
        room: 'CSE-103'
      },
      {
        facultyId: 'faculty-2',
        facultyName: 'Prof. Meera Patel',
        department: Department.CSE,
        day: 'Monday',
        period: 1,
        timeSlot: '10:00 - 10:50',
        subject: 'Operating Systems',
        class: 'CSE-B',
        room: 'CSE-102'
      },
      {
        facultyId: 'faculty-3',
        facultyName: 'Dr. Rajesh Kumar',
        department: Department.CSE,
        day: 'Monday',
        period: 4,
        timeSlot: '1:30 - 2:20',
        subject: 'Computer Networks',
        class: 'CSE-C',
        room: 'CSE-104'
      },
      // ECE Faculty Assignments
      {
        facultyId: 'faculty-4',
        facultyName: 'Prof. Amit Kumar',
        department: Department.ECE,
        day: 'Monday',
        period: 0,
        timeSlot: '9:10 - 10:00',
        subject: 'Digital Electronics',
        class: 'ECE-A',
        room: 'ECE-101'
      },
      {
        facultyId: 'faculty-5',
        facultyName: 'Dr. Sunita Verma',
        department: Department.ECE,
        day: 'Monday',
        period: 1,
        timeSlot: '10:00 - 10:50',
        subject: 'Communication Systems',
        class: 'ECE-B',
        room: 'ECE-102'
      },
      // EEE Faculty Assignments
      {
        facultyId: 'faculty-6',
        facultyName: 'Prof. Deepak Sharma',
        department: Department.EEE,
        day: 'Monday',
        period: 0,
        timeSlot: '9:10 - 10:00',
        subject: 'Electrical Machines',
        class: 'EEE-A',
        room: 'EEE-101'
      },
      // CIVIL Faculty Assignments
      {
        facultyId: 'faculty-7',
        facultyName: 'Dr. Manoj Kumar',
        department: Department.CIVIL,
        day: 'Monday',
        period: 0,
        timeSlot: '9:10 - 10:00',
        subject: 'Structural Analysis',
        class: 'CIVIL-A',
        room: 'CIVIL-101'
      },
      // MECH Faculty Assignments
      {
        facultyId: 'faculty-8',
        facultyName: 'Prof. Vikram Singh',
        department: Department.MECH,
        day: 'Monday',
        period: 0,
        timeSlot: '9:10 - 10:00',
        subject: 'Thermodynamics',
        class: 'MECH-A',
        room: 'MECH-101'
      },
      // AME Faculty Assignments
      {
        facultyId: 'faculty-9',
        facultyName: 'Dr. Aditya Sharma',
        department: Department.AME,
        day: 'Monday',
        period: 0,
        timeSlot: '9:10 - 10:00',
        subject: 'Aerodynamics',
        class: 'AME-A',
        room: 'AME-101'
      },
      // MBA Faculty Assignments
      {
        facultyId: 'faculty-10',
        facultyName: 'Prof. Business Manager',
        department: Department.MBA,
        day: 'Monday',
        period: 0,
        timeSlot: '9:10 - 10:00',
        subject: 'Business Management',
        class: 'MBA-A',
        room: 'MBA-101'
      }
    ];

    this.assignments = defaultAssignments.map(assignment => ({
      ...assignment,
      id: `${assignment.facultyId}-${assignment.day}-${assignment.period}`,
      createdAt: new Date()
    }));
  }

  // Get all faculty assignments from database (syncs in-memory for conflict checks)
  async getAllAssignments(): Promise<FacultyAssignment[]> {
    try {
      const assignments = await databaseService.getAllFacultyAssignments();
      const mapped = assignments.map(assignment => ({
        id: assignment.id,
        facultyId: assignment.faculty_id,
        facultyName: assignment.faculty_name || 'Unknown',
        department: assignment.department,
        day: assignment.day,
        period: assignment.period,
        timeSlot: assignment.time_slot,
        subject: assignment.subject,
        class: assignment.class_name,
        room: assignment.room,
        createdAt: new Date(assignment.created_at)
      }));
      this.assignments = mapped;
      return mapped;
    } catch (error) {
      console.error('Error fetching all assignments:', error);
      return [];
    }
  }

  // Get assignments by department (loads all from DB first so in-memory is synced for conflict checks)
  async getAssignmentsByDepartment(department: Department): Promise<FacultyAssignment[]> {
    try {
      const assignments = await databaseService.getAllFacultyAssignments();
      const mapped = assignments.map(assignment => ({
        id: assignment.id,
        facultyId: assignment.faculty_id,
        facultyName: assignment.faculty_name || 'Unknown',
        department: assignment.department,
        day: assignment.day,
        period: assignment.period,
        timeSlot: assignment.time_slot,
        subject: assignment.subject,
        class: assignment.class_name,
        room: assignment.room,
        createdAt: new Date(assignment.created_at)
      }));
      this.assignments = mapped;
      return mapped.filter(a => a.department === department);
    } catch (error) {
      console.error('Error fetching assignments by department:', error);
      return [];
    }
  }

  // Get assignments for a specific faculty
  async getAssignmentsByFaculty(facultyId: string): Promise<FacultyAssignment[]> {
    try {
      const assignments = await databaseService.getFacultyAssignmentsByFaculty(facultyId);
      return assignments.map(assignment => ({
        id: assignment.id,
        facultyId: assignment.faculty_id,
        facultyName: assignment.faculty_name || 'Unknown',
        department: assignment.department,
        day: assignment.day,
        period: assignment.period,
        timeSlot: assignment.time_slot,
        subject: assignment.subject,
        class: assignment.class_name,
        room: assignment.room,
        createdAt: new Date(assignment.created_at)
      }));
    } catch (error) {
      console.error('Error fetching assignments by faculty:', error);
      return this.assignments.filter(assignment => assignment.facultyId === facultyId);
    }
  }

  // Get assignments for a specific day and period
  getAssignmentsByTimeSlot(day: string, period: number): FacultyAssignment[] {
    return this.assignments.filter(assignment => 
      assignment.day === day && assignment.period === period
    );
  }

  // Check for conflicts when assigning a faculty
  checkConflict(
    facultyId: string, 
    day: string, 
    period: number, 
    excludeAssignmentId?: string
  ): ConflictInfo {
    const conflictingAssignments = this.assignments.filter(assignment => 
      assignment.facultyId === facultyId &&
      assignment.day === day &&
      assignment.period === period &&
      assignment.id !== excludeAssignmentId
    );

    if (conflictingAssignments.length === 0) {
      return {
        hasConflict: false,
        conflictingAssignments: [],
        message: ''
      };
    }

    const facultyName = this.facultyData[facultyId]?.name || 'Unknown Faculty';
    const conflictDetails = conflictingAssignments.map(assignment => 
      `${assignment.subject} (${assignment.class})`
    ).join(', ');

    return {
      hasConflict: true,
      conflictingAssignments,
      message: `${facultyName} is already assigned to ${conflictDetails} during ${day} Period ${period + 1} (${conflictingAssignments[0].timeSlot}). Do you want to assign them to multiple classes?`
    };
  }

  // Add a new faculty assignment
  async addAssignment(assignmentData: Omit<FacultyAssignment, 'id' | 'createdAt'>): Promise<FacultyAssignment> {
    try {
      const dbAssignmentData = {
        faculty_id: assignmentData.facultyId,
        faculty_name: assignmentData.facultyName,
        department: assignmentData.department,
        day: assignmentData.day,
        period: assignmentData.period,
        time_slot: assignmentData.timeSlot,
        subject: assignmentData.subject,
        class_name: assignmentData.class,
        room: assignmentData.room
      };

      const newAssignment = await databaseService.createFacultyAssignment(dbAssignmentData);
      if (!newAssignment) {
        throw new Error('Failed to create assignment in database');
      }

      const result = {
        id: newAssignment.id,
        facultyId: newAssignment.faculty_id,
        facultyName: newAssignment.faculty_name || 'Unknown',
        department: newAssignment.department,
        day: newAssignment.day,
        period: newAssignment.period,
        timeSlot: newAssignment.time_slot,
        subject: newAssignment.subject,
        class: newAssignment.class_name,
        room: newAssignment.room,
        createdAt: new Date(newAssignment.created_at)
      };
      this.assignments.push(result);
      return result;
    } catch (error) {
      console.error('Error adding assignment:', error);
      throw error;
    }
  }

  // Update an existing assignment
  async updateAssignment(assignmentId: string, updates: Partial<FacultyAssignment>): Promise<FacultyAssignment | null> {
    try {
      const dbUpdates = {
        faculty_id: updates.facultyId,
        faculty_name: updates.facultyName,
        department: updates.department,
        day: updates.day,
        period: updates.period,
        time_slot: updates.timeSlot,
        subject: updates.subject,
        class_name: updates.class,
        room: updates.room
      };

      const updatedAssignment = await databaseService.updateFacultyAssignment(assignmentId, dbUpdates);
      if (updatedAssignment) {
        return {
          id: updatedAssignment.id,
          facultyId: updatedAssignment.faculty_id,
          facultyName: updatedAssignment.faculty_name || 'Unknown',
          department: updatedAssignment.department,
          day: updatedAssignment.day,
          period: updatedAssignment.period,
          timeSlot: updatedAssignment.time_slot,
          subject: updatedAssignment.subject,
          class: updatedAssignment.class_name,
          room: updatedAssignment.room,
          createdAt: new Date(updatedAssignment.created_at)
        };
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
    }

    // Fallback to in-memory update
    const index = this.assignments.findIndex(assignment => assignment.id === assignmentId);
    if (index === -1) return null;

    this.assignments[index] = { ...this.assignments[index], ...updates };
    return this.assignments[index];
  }

  // Remove an assignment
  async removeAssignment(assignmentId: string): Promise<boolean> {
    try {
      const result = await databaseService.deleteFacultyAssignment(assignmentId);
      if (result) {
        return true;
      }
    } catch (error) {
      console.error('Error removing assignment from database:', error);
    }

    // Fallback to in-memory deletion
    const index = this.assignments.findIndex(assignment => assignment.id === assignmentId);
    if (index === -1) return false;

    this.assignments.splice(index, 1);
    return true;
  }

  /** Load faculty from database (so created faculty appear in assignment form) */
  async getFacultyFromDb(department?: Department): Promise<{ id: string; name: string; department: Department }[]> {
    return databaseService.getFacultyUsers(department);
  }

  // Get all available faculty for a department (legacy; prefer getFacultyFromDb for form)
  getFacultyByDepartment(department: Department): { id: string; name: string; department: Department }[] {
    return Object.entries(this.facultyData)
      .filter(([_, data]) => data.department === department)
      .map(([id, data]) => ({ id, ...data }));
  }

  // Get all faculty (legacy; prefer getFacultyFromDb for form)
  getAllFaculty(): { id: string; name: string; department: Department }[] {
    return Object.entries(this.facultyData).map(([id, data]) => ({ id, ...data }));
  }

  // Get faculty timetable for a specific faculty
  getFacultyTimetable(facultyId: string): { [day: string]: (FacultyAssignment | null)[] } {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const periods = 7; // 7 periods per day

    const timetable: { [day: string]: (FacultyAssignment | null)[] } = {};

    days.forEach(day => {
      timetable[day] = Array(periods).fill(null);
      
      this.assignments
        .filter(assignment => assignment.facultyId === facultyId && assignment.day === day)
        .forEach(assignment => {
          timetable[day][assignment.period] = assignment;
        });
    });

    return timetable;
  }

  // Get class timetable for a specific class
  getClassTimetable(className: string): { [day: string]: (FacultyAssignment | null)[] } {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const periods = 7; // 7 periods per day

    const timetable: { [day: string]: (FacultyAssignment | null)[] } = {};

    days.forEach(day => {
      timetable[day] = Array(periods).fill(null);
      
      this.assignments
        .filter(assignment => assignment.class === className && assignment.day === day)
        .forEach(assignment => {
          timetable[day][assignment.period] = assignment;
        });
    });

    return timetable;
  }

  // Get all classes for a department
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

  // Get all subjects for a department
  getSubjectsByDepartment(department: Department): string[] {
    const departmentSubjects: Record<Department, string[]> = {
      [Department.CSE]: [
        'Data Structures', 'Operating Systems', 'Database Systems', 'Computer Networks',
        'Web Technologies', 'Software Engineering', 'Artificial Intelligence', 'Machine Learning',
        'Computer Architecture', 'Software Testing', 'Cloud Computing', 'Cybersecurity'
      ],
      [Department.ECE]: [
        'Digital Electronics', 'Communication Systems', 'Signal Processing', 'VLSI Design',
        'Microprocessors', 'Wireless Communication', 'Optical Communication', 'Embedded Systems',
        'Digital Signal Processing', 'Telecommunication', 'Satellite Communication', 'Mobile Computing'
      ],
      [Department.EEE]: [
        'Electrical Machines', 'Power Systems', 'Control Systems', 'Electrical Measurements',
        'Power Electronics', 'Electric Drives', 'High Voltage Engineering', 'Renewable Energy',
        'Power Quality', 'Smart Grid', 'Electric Vehicle Technology', 'Industrial Automation'
      ],
      [Department.CIVIL]: [
        'Structural Analysis', 'Concrete Technology', 'Transportation Engineering', 'Geotechnical Engineering',
        'Hydraulics', 'Surveying', 'Construction Management', 'Environmental Engineering',
        'Water Resources Engineering', 'Highway Engineering', 'Bridge Engineering', 'Urban Planning'
      ],
      [Department.MECH]: [
        'Thermodynamics', 'Fluid Mechanics', 'Machine Design', 'Manufacturing Technology',
        'Automobile Engineering', 'Robotics', 'CAD/CAM', 'Industrial Engineering',
        'Refrigeration & Air Conditioning', 'Mechanical Vibrations', 'Heat Transfer', 'Production Planning'
      ],
      [Department.AME]: [
        'Aerodynamics', 'Aircraft Structures', 'Flight Mechanics', 'Propulsion Systems',
        'Aircraft Design', 'Avionics', 'Space Technology', 'Aircraft Maintenance',
        'Aerospace Materials', 'Orbital Mechanics', 'Satellite Technology', 'Aircraft Systems'
      ],
      [Department.MBA]: [
        'Business Management', 'Financial Management', 'Marketing Management', 'Human Resource Management',
        'Operations Management', 'Strategic Management', 'Business Analytics', 'International Business',
        'Entrepreneurship', 'Supply Chain Management', 'Digital Marketing', 'Business Ethics'
      ],
      [Department.MCA]: [
        'Programming Fundamentals', 'Data Structures', 'Database Management', 'Web Development',
        'Software Engineering', 'Computer Networks', 'Operating Systems', 'Object-Oriented Programming',
        'Java Programming', 'Python Programming', 'Mobile App Development', 'Cloud Computing'
      ],
      [Department.DIPLOMA]: [
        'Engineering Drawing', 'Workshop Practice', 'Basic Electronics', 'Computer Applications',
        'Technical Communication', 'Engineering Mathematics', 'Physics', 'Chemistry',
        'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering', 'Information Technology'
      ],
      [Department.BBA]: [
        'Business Administration', 'Management Principles', 'Business Communication', 'Financial Accounting',
        'Marketing Fundamentals', 'Human Resource Management', 'Business Law', 'Economics',
        'Business Statistics', 'Organizational Behavior', 'Business Strategy', 'Entrepreneurship'
      ],
      [Department.BCA]: [
        'Computer Applications', 'Programming Basics', 'Web Design', 'Database Systems',
        'Software Development', 'Computer Networks', 'Operating Systems', 'Data Structures',
        'Object-Oriented Programming', 'Web Technologies', 'Mobile Computing', 'Information Systems'
      ],
      [Department.BSH]: [
        'Engineering Mathematics', 'Engineering Physics', 'Engineering Chemistry', 'Engineering Drawing',
        'Basic Electronics', 'Programming Fundamentals', 'Technical Communication', 'Workshop Practice',
        'Environmental Science', 'Professional Ethics', 'English Communication', 'Digital Logic Design'
      ]
    };

    return departmentSubjects[department] || [];
  }

  // Get all rooms
  getAllRooms(): string[] {
    const rooms: string[] = [];
    
    // Add department-specific rooms
    Object.values(Department).forEach(dept => {
      const deptCode = dept.toLowerCase();
      for (let i = 1; i <= 5; i++) {
        rooms.push(`${dept.toUpperCase()}-${String(i).padStart(3, '0')}`);
      }
    });

    // Add lab rooms
    for (let i = 1; i <= 10; i++) {
      rooms.push(`Lab-${i}`);
    }

    // Add seminar halls
    rooms.push('Seminar Hall-1', 'Seminar Hall-2', 'Auditorium');

    return rooms;
  }
}

// Export singleton instance
export const facultyAssignmentService = new FacultyAssignmentService(); 