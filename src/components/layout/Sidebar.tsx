
import React, { useState, useEffect, createContext, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Calendar, 
  ClipboardList, 
  MessageSquare, 
  BarChart3, 
  Settings,
  GraduationCap,
  UserCheck,
  Clock,
  BookOpen,
  Shield,
  Search,
  Book,
  Building2,
  CreditCard,
  X,
  LayoutGrid
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/user';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import StudentSearchModal from '../search/StudentSearchModal';
import { databaseService } from '../../services/databaseService';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const sidebarItems: SidebarItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    roles: [UserRole.ADMIN, UserRole.HOD, UserRole.COORDINATOR, UserRole.EXAM_CELL_COORDINATOR, UserRole.CR, UserRole.STUDENT, UserRole.FACULTY, UserRole.GUEST, UserRole.LIBRARIAN]
  },
  {
    name: 'User Management',
    href: '/users',
    icon: Users,
    roles: [UserRole.ADMIN, UserRole.HOD]
  },
  {
    name: 'Departments',
    href: '/departments',
    icon: Building2,
    roles: [UserRole.ADMIN]
  },
  {
    name: 'Student Management',
    href: '/students',
    icon: GraduationCap,
    roles: [UserRole.ADMIN, UserRole.HOD, UserRole.COORDINATOR, UserRole.CR]
  },
  {
    name: 'Class Management',
    href: '/classes',
    icon: BookOpen,
    roles: [UserRole.ADMIN, UserRole.HOD, UserRole.COORDINATOR]
  },
  {
    name: 'Attendance',
    href: '/attendance',
    icon: UserCheck,
    roles: [UserRole.ADMIN, UserRole.HOD, UserRole.COORDINATOR, UserRole.CR, UserRole.FACULTY, UserRole.GUEST]
  },
  {
    name: 'Timetable',
    href: '/timetable',
    icon: Calendar,
    roles: [UserRole.ADMIN, UserRole.HOD, UserRole.COORDINATOR, UserRole.CR, UserRole.STUDENT, UserRole.FACULTY]
  },
  {
    name: 'Exam Seating',
    href: '/exam-seating',
    icon: LayoutGrid,
    roles: [UserRole.ADMIN, UserRole.HOD, UserRole.COORDINATOR, UserRole.EXAM_CELL_COORDINATOR, UserRole.PRINCIPAL]
  },
  {
    name: 'Faculty Assignments',
    href: '/faculty-assignments',
    icon: Users,
    roles: [UserRole.ADMIN, UserRole.HOD, UserRole.PRINCIPAL]
  },
  {
    name: 'My Mentees',
    href: '/mentees',
    icon: GraduationCap,
    roles: [UserRole.FACULTY, UserRole.COORDINATOR]
  },
  {
    name: 'Mentee Management',
    href: '/mentee-management',
    icon: Users,
    roles: [UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.HOD]
  },
  {
    name: 'Library',
    href: '/library',
    icon: Book,
    roles: [UserRole.LIBRARIAN]
  },
  {
    name: 'Meetings',
    href: '/meetings',
    icon: Clock,
    roles: [UserRole.ADMIN, UserRole.HOD, UserRole.COORDINATOR, UserRole.CR, UserRole.FACULTY]
  },
  {
    name: 'Groups',
    href: '/groups',
    icon: MessageSquare,
    roles: [UserRole.ADMIN, UserRole.PRINCIPAL, UserRole.HOD, UserRole.COORDINATOR, UserRole.FACULTY, UserRole.CR, UserRole.STUDENT]
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: BarChart3,
    roles: [UserRole.ADMIN, UserRole.HOD, UserRole.COORDINATOR, UserRole.CR]
  },
  {
    name: 'My ID Card',
    href: '/id-card',
    icon: CreditCard,
    roles: [UserRole.ADMIN, UserRole.HOD, UserRole.COORDINATOR, UserRole.EXAM_CELL_COORDINATOR, UserRole.CR, UserRole.STUDENT, UserRole.FACULTY, UserRole.LIBRARIAN, UserRole.ACCOUNTANT, UserRole.PRINCIPAL]
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: [UserRole.ADMIN, UserRole.HOD, UserRole.COORDINATOR, UserRole.EXAM_CELL_COORDINATOR, UserRole.CR, UserRole.STUDENT, UserRole.FACULTY, UserRole.LIBRARIAN]
  },
  {
    name: 'No Due Requests',
    href: '/no-due',
    icon: ClipboardList,
    roles: [UserRole.ADMIN, UserRole.HOD, UserRole.LIBRARIAN, UserRole.ACCOUNTANT, UserRole.PRINCIPAL, UserRole.CR, UserRole.STUDENT]
  }
];

interface SidebarContextType {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}
const SidebarContext = createContext<SidebarContextType>({ open: false, setOpen: () => {}, toggle: () => {} });

export const useSidebar = () => useContext(SidebarContext);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(p => !p);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return <SidebarContext.Provider value={{ open, setOpen, toggle }}>{children}</SidebarContext.Provider>;
};

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { open, setOpen } = useSidebar();
  const [showStudentSearch, setShowStudentSearch] = useState(false);
  const [hasMentees, setHasMentees] = useState<boolean | null>(null);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    if ((user?.role === UserRole.FACULTY || user?.role === UserRole.COORDINATOR) && user?.id) {
      databaseService.getMenteeCountByMentor(user.id).then((count) => setHasMentees(count > 0));
    } else {
      setHasMentees(null);
    }
  }, [user?.id, user?.role]);

  const filteredItems = sidebarItems.filter((item) => {
    if (!user?.role) return false;
    if (item.href === '/mentees') {
      return item.roles.includes(user.role) && hasMentees === true;
    }
    return item.roles.includes(user.role);
  });

  const canSearchStudents = () => {
    return user?.role === UserRole.ADMIN || 
           user?.role === UserRole.HOD || 
           user?.role === UserRole.COORDINATOR || 
           user?.role === UserRole.FACULTY ||
           user?.role === UserRole.CR ||
           user?.role === UserRole.GUEST ||
           user?.role === UserRole.LIBRARIAN;
  };

  const sidebarContent = (
    <div className="p-4 lg:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <div className="flex items-center space-x-3">
          <Shield className="h-7 w-7 lg:h-8 lg:w-8 text-blue-400" />
          <div>
            <h2 className="text-base lg:text-lg font-semibold">VIET Portal</h2>
            <p className="text-xs lg:text-sm text-gray-400">{user?.role}</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="lg:hidden text-gray-400 hover:text-white p-1">
          <X className="h-5 w-5" />
        </button>
      </div>
      
      {canSearchStudents() && (
        <div className="mb-4 lg:mb-6">
          <Button 
            variant="outline" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white border-blue-600 text-sm"
            onClick={() => { setShowStudentSearch(true); setOpen(false); }}
          >
            <Search className="h-4 w-4 mr-2" />
            Search Students
          </Button>
        </div>
      )}
      
      <nav className="space-y-1 flex-1 overflow-y-auto">
        {filteredItems.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              "flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors duration-200 text-sm",
              location.pathname === item.href
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="truncate">{item.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block bg-gray-900 text-white w-64 min-h-full shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile/Tablet overlay */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}

      {/* Mobile/Tablet slide-out sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </div>

      {showStudentSearch && (
        <StudentSearchModal onClose={() => setShowStudentSearch(false)} />
      )}
    </>
  );
};

export default Sidebar;
