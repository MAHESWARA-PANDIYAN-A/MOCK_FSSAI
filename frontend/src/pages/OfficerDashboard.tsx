import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Search, 
  Filter, 
  RefreshCw, 
  Clock, 
  AlertCircle, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  ChevronRight,
  UserCheck,
  Eye
} from 'lucide-react';
import apiClient from '../services/api';
import { 
  ApplicationListItem, 
  OfficerDashboardStats, 
  ApplicationStatus, 
  ApiResponse, 
  PaginatedData 
} from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { RiskBadge } from '../components/common/RiskBadge';
import { OfficerSidebar } from '../components/common/OfficerSidebar';

export const OfficerDashboard: React.FC = () => {
  const [stats, setStats] = useState<OfficerDashboardStats | null>(null);
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [districtFilter, setDistrictFilter] = useState<string>('');
  const [assignedToMe, setAssignedToMe] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, listRes] = await Promise.all([
        apiClient.get<ApiResponse<OfficerDashboardStats>>('/officer/dashboard'),
        apiClient.get<ApiResponse<PaginatedData<ApplicationListItem>>>('/officer/applications', {
          params: {
            page: currentPage,
            limit: 10,
            search: search || undefined,
            status_filter: statusFilter || undefined,
            district: districtFilter || undefined,
            assigned_to_me: assignedToMe || undefined,
          },
        }),
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
      if (listRes.data.success) {
        setApplications(listRes.data.data.items);
        setTotalCount(listRes.data.data.total);
        setTotalPages(listRes.data.data.total_pages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentPage, statusFilter, assignedToMe]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchDashboardData();
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] bg-slate-100">
      {/* Officer Left Navigation Sidebar */}
      <OfficerSidebar
        stats={stats || undefined}
        currentFilter={statusFilter || undefined}
        onSelectFilter={(status) => {
          setStatusFilter(status);
          setCurrentPage(1);
        }}
      />

      {/* Main Scrutiny Area */}
      <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
        {/* Officer Welcome & Summary */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gov-700">Department of Licensing</span>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                Scrutiny Branch
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Food Business Scrutiny Console</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review Form B applications, conduct document verifications, raise technical queries, and schedule premises hygiene audits.
            </p>
          </div>

          <button
            onClick={fetchDashboardData}
            title="Refresh Scrutiny Queue"
            className="flex items-center space-x-1 px-3 py-2 border border-slate-300 rounded text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <div
            onClick={() => { setStatusFilter(null); setCurrentPage(1); }}
            className={`p-3 rounded-lg border cursor-pointer transition ${
              statusFilter === null ? 'bg-gov-800 text-white border-gov-900' : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="text-[10px] font-bold uppercase opacity-80">Total</div>
            <div className="text-xl font-extrabold">{stats?.total_applications ?? 0}</div>
          </div>

          <div
            onClick={() => { setStatusFilter('SUBMITTED'); setCurrentPage(1); }}
            className={`p-3 rounded-lg border cursor-pointer transition ${
              statusFilter === 'SUBMITTED' ? 'bg-blue-700 text-white border-blue-900' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
            }`}
          >
            <div className="text-[10px] font-bold uppercase opacity-80">Submissions</div>
            <div className="text-xl font-extrabold">{stats?.new_submissions ?? 0}</div>
          </div>

          <div
            onClick={() => { setStatusFilter('UNDER_REVIEW'); setCurrentPage(1); }}
            className={`p-3 rounded-lg border cursor-pointer transition ${
              statusFilter === 'UNDER_REVIEW' ? 'bg-indigo-700 text-white border-indigo-900' : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
            }`}
          >
            <div className="text-[10px] font-bold uppercase opacity-80">Under Review</div>
            <div className="text-xl font-extrabold">{stats?.under_review ?? 0}</div>
          </div>

          <div
            onClick={() => { setStatusFilter('DOCUMENT_QUERY'); setCurrentPage(1); }}
            className={`p-3 rounded-lg border cursor-pointer transition ${
              statusFilter === 'DOCUMENT_QUERY' ? 'bg-amber-600 text-white border-amber-800' : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
            }`}
          >
            <div className="text-[10px] font-bold uppercase opacity-80">Queries</div>
            <div className="text-xl font-extrabold">{stats?.document_queries ?? 0}</div>
          </div>

          <div
            onClick={() => { setStatusFilter('INSPECTION_REQUIRED'); setCurrentPage(1); }}
            className={`p-3 rounded-lg border cursor-pointer transition ${
              statusFilter === 'INSPECTION_REQUIRED' ? 'bg-purple-700 text-white border-purple-900' : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
            }`}
          >
            <div className="text-[10px] font-bold uppercase opacity-80">Insp Required</div>
            <div className="text-xl font-extrabold">{stats?.inspection_required ?? 0}</div>
          </div>

          <div
            onClick={() => { setStatusFilter('INSPECTION_SCHEDULED'); setCurrentPage(1); }}
            className={`p-3 rounded-lg border cursor-pointer transition ${
              statusFilter === 'INSPECTION_SCHEDULED' ? 'bg-teal-700 text-white border-teal-900' : 'bg-white text-teal-700 border-teal-200 hover:bg-teal-50'
            }`}
          >
            <div className="text-[10px] font-bold uppercase opacity-80">Scheduled</div>
            <div className="text-xl font-extrabold">{stats?.inspection_scheduled ?? 0}</div>
          </div>

          <div
            onClick={() => { setStatusFilter('APPROVED'); setCurrentPage(1); }}
            className={`p-3 rounded-lg border cursor-pointer transition ${
              statusFilter === 'APPROVED' ? 'bg-emerald-700 text-white border-emerald-900' : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            <div className="text-[10px] font-bold uppercase opacity-80">Approved</div>
            <div className="text-xl font-extrabold">{stats?.approved ?? 0}</div>
          </div>

          <div
            onClick={() => { setStatusFilter('REJECTED'); setCurrentPage(1); }}
            className={`p-3 rounded-lg border cursor-pointer transition ${
              statusFilter === 'REJECTED' ? 'bg-rose-700 text-white border-rose-900' : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
            }`}
          >
            <div className="text-[10px] font-bold uppercase opacity-80">Rejected</div>
            <div className="text-xl font-extrabold">{stats?.rejected ?? 0}</div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by application number, business name, or applicant..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-gov-700 focus:outline-none"
              />
            </div>

            <div>
              <input
                type="text"
                placeholder="Filter by District (e.g. Salem)"
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-gov-700 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assignedToMe}
                  onChange={(e) => setAssignedToMe(e.target.checked)}
                  className="rounded text-gov-700 focus:ring-gov-700"
                />
                <span>Assigned to Me</span>
              </label>

              <button
                type="submit"
                className="ml-auto px-4 py-1.5 bg-gov-800 hover:bg-gov-700 text-white font-bold rounded text-xs transition"
              >
                Apply
              </button>
            </div>
          </form>
        </div>

        {/* Scrutiny Queue Applications Table */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-gov-800" />
              <h2 className="font-bold text-slate-800 text-sm">
                Applications Queue ({totalCount} total)
              </h2>
            </div>
            {statusFilter && (
              <span className="text-xs font-bold text-gov-700 bg-gov-50 px-2 py-0.5 rounded border border-gov-200">
                Filtered: {statusFilter}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gov-700 mb-2" />
              Fetching scrutiny queue from database...
            </div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700 mb-1">No applications matching criteria</h3>
              <p className="text-xs text-slate-500">Try adjusting your status filter or search parameters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">App # & Reference</th>
                    <th className="px-4 py-3">Business & Premises</th>
                    <th className="px-4 py-3">Applicant / Signatory</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Assigned Officer</th>
                    <th className="px-4 py-3 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-gov-800">{app.application_number}</div>
                        {app.external_reference_id && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Ref: {app.external_reference_id}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800">{app.business_name}</div>
                        <div className="text-slate-500 text-[11px]">{app.district}, {app.state}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 font-medium">
                        {app.applicant_name}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {app.submission_date
                          ? new Date(app.submission_date).toLocaleDateString('en-GB')
                          : 'Draft'}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={app.status} size="sm" />
                      </td>
                      <td className="px-4 py-3.5">
                        <RiskBadge level={app.risk_level} />
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {app.assigned_officer_name || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          to={`/officer/review/${app.application_number}`}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-gov-700 hover:bg-gov-800 text-white font-bold rounded shadow-sm text-xs transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Scrutinize & Review</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <div>Page {currentPage} of {totalPages}</div>
              <div className="flex space-x-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-3 py-1 border rounded disabled:opacity-30 hover:bg-slate-50 font-medium"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-3 py-1 border rounded disabled:opacity-30 hover:bg-slate-50 font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
