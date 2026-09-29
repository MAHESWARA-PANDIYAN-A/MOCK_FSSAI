import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Bell, User as UserIcon, LogOut, FileText, PlusCircle, LayoutDashboard, Terminal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AppNotification, ApiResponse } from '../../types';
import apiClient from '../../services/api';

export const Navbar: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState<boolean>(false);

  useEffect(() => {
    if (user && role === 'APPLICANT') {
      fetchNotifications();
    }
  }, [user, role]);

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get<ApiResponse<AppNotification[]>>('/applicant/notifications');
      if (res.data.success) {
        setNotifications(res.data.data);
      }
    } catch {
      // silent
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <header className="bg-gov-900 text-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="bg-white p-1.5 rounded text-gov-900 shadow-sm group-hover:scale-105 transition">
              <ShieldCheck className="w-6 h-6 text-gov-700" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base tracking-tight text-white">Food Safety Approval Portal</span>
                <span className="bg-amber-400/90 text-slate-950 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded tracking-wider shadow-sm">
                  MOCK / SIH26130
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-normal">
                Simulated FSSAI Licensing & Inspection Workflow
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 text-sm">
            <Link to="/" className="text-slate-200 hover:text-white transition font-medium">
              Home
            </Link>

            {user ? (
              <>
                {role === 'APPLICANT' && (
                  <>
                    <Link
                      to="/applicant/dashboard"
                      className="flex items-center space-x-1.5 text-slate-200 hover:text-white font-medium"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>My Applications</span>
                    </Link>
                    <Link
                      to="/applicant/new"
                      className="flex items-center space-x-1.5 bg-saffron-500 hover:bg-saffron-600 text-slate-950 font-bold px-3 py-1.5 rounded transition shadow-sm"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>New Application</span>
                    </Link>
                  </>
                )}

                {role === 'OFFICER' && (
                  <Link
                    to="/officer/dashboard"
                    className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded transition shadow-sm"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Officer Portal</span>
                  </Link>
                )}

                {role === 'ADMIN' && (
                  <Link
                    to="/admin/dashboard"
                    className="flex items-center space-x-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1.5 rounded transition shadow-sm"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Admin Console</span>
                  </Link>
                )}
              </>
            ) : null}

            <Link
              to="/api-docs"
              className="flex items-center space-x-1.5 text-slate-300 hover:text-white text-xs border border-slate-700 bg-slate-800/60 px-2.5 py-1.5 rounded hover:bg-slate-700 transition"
            >
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>Integration API</span>
            </Link>
          </nav>

          {/* User Auth controls */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                {/* Notifications Bell */}
                {role === 'APPLICANT' && (
                  <div className="relative">
                    <button
                      onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                      className="p-1.5 rounded-full hover:bg-gov-800 text-slate-300 hover:text-white relative transition"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 w-4 h-4 bg-amber-500 text-slate-950 text-[10px] font-extrabold rounded-full flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    {/* Notification Dropdown */}
                    {showNotifDropdown && (
                      <div className="absolute right-0 mt-2 w-80 bg-white text-slate-800 rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50">
                        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                          <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                            Notifications
                          </span>
                          <span className="text-xs text-slate-500">{notifications.length} total</span>
                        </div>
                        <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                          {notifications.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-500">
                              No notifications yet
                            </div>
                          ) : (
                            notifications.map((n) => (
                              <div
                                key={n.id}
                                className={`p-3 text-xs hover:bg-slate-50 cursor-pointer ${
                                  !n.is_read ? 'bg-blue-50/50 font-medium' : ''
                                }`}
                                onClick={() => {
                                  if (n.link) navigate(n.link);
                                  setShowNotifDropdown(false);
                                }}
                              >
                                <div className="font-semibold text-slate-800 mb-0.5">{n.title}</div>
                                <div className="text-slate-600 leading-snug">{n.message}</div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* User badge */}
                <div className="flex items-center space-x-2 pl-2 border-l border-slate-700">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-semibold text-white">{user.name}</div>
                    <div className="text-[10px] text-amber-300 font-medium">{role}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Logout"
                    className="p-1.5 rounded hover:bg-gov-800 text-slate-300 hover:text-rose-400 transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/applicant/login"
                  className="text-xs font-semibold text-slate-200 hover:text-white px-3 py-1.5 rounded border border-slate-600 hover:border-slate-400 transition"
                >
                  Applicant Login
                </Link>
                <Link
                  to="/officer/login"
                  className="text-xs font-bold bg-gov-700 hover:bg-gov-500 text-white px-3 py-1.5 rounded transition shadow-sm"
                >
                  Officer Portal
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
