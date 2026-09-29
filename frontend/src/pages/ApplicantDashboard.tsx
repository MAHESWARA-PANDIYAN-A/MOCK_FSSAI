import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  PlusCircle, 
  Clock, 
  AlertCircle, 
  Calendar, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApplicationListItem, ApplicantDashboardStats, ApiResponse } from '../types';
import apiClient from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';

export const ApplicantDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ApplicantDashboardStats | null>(null);
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<ApiResponse<{ stats: ApplicantDashboardStats; applications: ApplicationListItem[] }>>(
        '/applicant/dashboard'
      );
      if (res.data.success) {
        setStats(res.data.data.stats);
        setApplications(res.data.data.applications);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateNew = async () => {
    try {
      const res = await apiClient.post<ApiResponse<{ id: string; application_number: string }>>('/applicant/applications');
      if (res.data.success) {
        navigate(`/applicant/apply/${res.data.data.application_number}`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to initialize new application draft.');
    }
  };

  const filteredApplications = applications.filter((app) => {
    const q = searchTerm.toLowerCase();
    return (
      app.application_number.toLowerCase().includes(q) ||
      app.business_name.toLowerCase().includes(q) ||
      (app.external_reference_id && app.external_reference_id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome, {user?.name || 'Applicant'}
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Manage your food business approval applications, upload mandatory documents, and track approval status.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboardData}
            title="Refresh Data"
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-600 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center space-x-2 bg-saffron-500 hover:bg-saffron-600 text-slate-950 font-bold px-4 py-2 rounded-lg shadow transition text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Apply for New License</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 my-6">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Drafts</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats?.draft_count ?? 0}</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-xs font-semibold">Submitted</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-blue-700">{stats?.submitted_count ?? 0}</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <span className="text-xs font-semibold">Under Review</span>
            <RefreshCw className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-indigo-700">{stats?.under_review_count ?? 0}</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-amber-200 bg-amber-50/40 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-semibold">Action Required</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-800">{stats?.query_count ?? 0}</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-purple-200 shadow-sm">
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-xs font-semibold">Inspection</span>
            <Calendar className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-purple-700">{stats?.inspection_count ?? 0}</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-emerald-200 bg-emerald-50/40 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-semibold">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-800">{stats?.approved_count ?? 0}</div>
        </div>
      </div>

      {/* Applications Section */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50">
          <h2 className="font-bold text-slate-800 text-sm">My Applications</h2>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search application # or business..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:ring-2 focus:ring-gov-700 focus:outline-none"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gov-700 mb-2" />
            Loading your applications...
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700 mb-1">No applications found</h3>
            <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
              You have not created any food business applications yet or no matching application was found.
            </p>
            <button
              onClick={handleCreateNew}
              className="px-4 py-2 bg-gov-700 text-white font-bold rounded text-xs hover:bg-gov-800 transition"
            >
              Start New Application
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 text-slate-700 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Application Number</th>
                  <th className="px-4 py-3">Business Name & Location</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Submission Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Updated</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3.5 font-bold text-gov-800">
                      <div>{app.application_number}</div>
                      {app.external_reference_id && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Ref: {app.external_reference_id}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-800">{app.business_name}</div>
                      <div className="text-slate-500 text-[11px]">{app.district}, {app.state}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-medium">
                      {app.application_type.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {app.submission_date
                        ? new Date(app.submission_date).toLocaleDateString('en-GB')
                        : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={app.status} size="sm" />
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                      {new Date(app.last_status_updated_at).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      {app.status === 'DRAFT' ? (
                        <Link
                          to={`/applicant/apply/${app.application_number}`}
                          className="inline-flex items-center space-x-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded shadow-sm text-xs transition"
                        >
                          <span>Continue Draft</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <Link
                          to={`/applicant/applications/${app.application_number}`}
                          className="inline-flex items-center space-x-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-gov-800 font-semibold rounded border border-slate-300 text-xs transition"
                        >
                          <span>View & Track</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
