import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FileSearch, 
  Clock, 
  AlertCircle, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Users, 
  Shield, 
  FileText,
  Building2,
  Terminal
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { OfficerDashboardStats } from '../../types';

interface OfficerSidebarProps {
  stats?: OfficerDashboardStats;
  currentFilter?: string;
  onSelectFilter?: (status: string | null) => void;
}

export const OfficerSidebar: React.FC<OfficerSidebarProps> = ({
  stats,
  currentFilter,
  onSelectFilter,
}) => {
  const { user, role } = useAuth();

  const filterItems = [
    { label: 'All Applications', status: null, icon: FileSearch, count: stats?.total_applications },
    { label: 'New Submissions', status: 'SUBMITTED', icon: Clock, count: stats?.new_submissions },
    { label: 'Under Review', status: 'UNDER_REVIEW', icon: FileText, count: stats?.under_review },
    { label: 'Document Queries', status: 'DOCUMENT_QUERY', icon: AlertCircle, count: stats?.document_queries },
    { label: 'Inspection Required', status: 'INSPECTION_REQUIRED', icon: Calendar, count: stats?.inspection_required },
    { label: 'Inspection Scheduled', status: 'INSPECTION_SCHEDULED', icon: Calendar, count: stats?.inspection_scheduled },
    { label: 'Approved', status: 'APPROVED', icon: CheckCircle2, count: stats?.approved },
    { label: 'Rejected', status: 'REJECTED', icon: XCircle, count: stats?.rejected },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] flex flex-col border-r border-slate-800 shadow-lg shrink-0">
      {/* Officer profile card */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gov-700 text-white flex items-center justify-center font-bold text-sm shadow-sm border border-gov-500">
            {user?.name.charAt(0) || 'O'}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-bold text-white truncate">{user?.name || 'Officer'}</h4>
            <p className="text-xs text-amber-400 font-medium truncate">{role} - Scrutiny Branch</p>
          </div>
        </div>
      </div>

      {/* Application Queues */}
      <div className="p-3">
        <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Scrutiny Queues
        </p>
        <nav className="space-y-1">
          {filterItems.map((item) => {
            const Icon = item.icon;
            const isSelected = currentFilter === item.status;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onSelectFilter && onSelectFilter(item.status)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold transition ${
                  isSelected
                    ? 'bg-gov-700 text-white shadow-sm'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Administration & Integration links */}
      <div className="mt-auto p-3 border-t border-slate-800 space-y-1">
        {role === 'ADMIN' && (
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) =>
              `flex items-center space-x-2.5 px-3 py-2 rounded-md text-xs font-semibold transition ${
                isActive ? 'bg-purple-700 text-white' : 'hover:bg-slate-800 text-slate-300'
              }`
            }
          >
            <Shield className="w-4 h-4 text-purple-400" />
            <span>Admin Console</span>
          </NavLink>
        )}

        <NavLink
          to="/api-docs"
          className={({ isActive }) =>
            `flex items-center space-x-2.5 px-3 py-2 rounded-md text-xs font-semibold transition ${
              isActive ? 'bg-amber-700 text-white' : 'hover:bg-slate-800 text-slate-300'
            }`
          }
        >
          <Terminal className="w-4 h-4 text-amber-400" />
          <span>Integration API Specs</span>
        </NavLink>
      </div>
    </aside>
  );
};
