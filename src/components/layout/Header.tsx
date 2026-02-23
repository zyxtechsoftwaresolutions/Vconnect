
import React, { useState } from 'react';
import { Bell, User, LogOut, Settings, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from './Sidebar';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import ProfileModal from '../profile/ProfileModal';
import NotificationModal from '../notifications/NotificationModal';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { toggle } = useSidebar();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleProfileClick = () => {
    setShowProfile(true);
  };

  const handleSettingsClick = () => {
    window.location.href = '/settings';
  };

  const handleNotificationClick = () => {
    setShowNotifications(true);
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
            <button
              onClick={toggle}
              className="lg:hidden p-2 -ml-1 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <img
              src="/V Connect V01.png"
              alt="VIET Logo"
              className="h-8 sm:h-10 w-auto shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">V Connect</h1>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Comprehensive College Management System</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative h-8 w-8 sm:h-9 sm:w-9"
              onClick={handleNotificationClick}
            >
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                3
              </span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profilePicture} alt={user?.name} />
                    <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                    <p className="text-xs leading-none text-blue-600 font-medium">
                      {user?.role}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleProfileClick}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSettingsClick}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {showProfile && (
        <ProfileModal
          onClose={() => setShowProfile(false)}
          user={user}
        />
      )}

      {showNotifications && (
        <NotificationModal
          onClose={() => setShowNotifications(false)}
        />
      )}
    </>
  );
};

export default Header;
