import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  FileText, 
  Terminal, 
  Plus, 
  RefreshCw, 
  Sliders, 
  History,
  Lock,
  Mail,
  Phone,
  User as UserIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import apiClient from '../services/api';
import { User, DocumentRequirement, ApiResponse, PaginatedData } from '../types';

interface AuditLogItem {
  id: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  metadata_json?: any;
  ip_address?: string;
  created_at: string;
}

interface IntegrationLogItem {
  id: string;
  source_system: string;
  endpoint: string;
  external_reference_id?: string;
  request_id?: string;
  status: string;
  response_code: number;
  processing_time_ms: number;
  created_at: string;
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'officers' | 'audit' | 'integration' | 'rules'>('officers');
  const [officers, setOfficers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [integrationLogs, setIntegrationLogs] = useState<IntegrationLogItem[]>([]);
  const [documentRules, setDocumentRules] = useState<DocumentRequirement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // New Officer Form
  const [showAddOfficer, setShowAddOfficer] = useState<boolean>(false);
  const [officerName, setOfficerName] = useState<string>('');
  const [officerEmail, setOfficerEmail] = useState<string>('');
  const [officerMobile, setOfficerMobile] = useState<string>('');
  const [officerPassword, setOfficerPassword] = useState<string>('Officer123!');
  const [isSubmittingOfficer, setIsSubmittingOfficer] = useState<boolean>(false);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'officers') {
        const res = await apiClient.get<ApiResponse<User[]>>('/admin/officers');
        if (res.data.success) setOfficers(res.data.data);
      } else if (activeTab === 'audit') {
        const res = await apiClient.get<ApiResponse<PaginatedData<AuditLogItem>>>('/admin/audit-logs');
        if (res.data.success) setAuditLogs(res.data.data.items);
      } else if (activeTab === 'integration') {
        const res = await apiClient.get<ApiResponse<PaginatedData<IntegrationLogItem>>>('/admin/integration-logs');
        if (res.data.success) setIntegrationLogs(res.data.data.items);
      } else if (activeTab === 'rules') {
        const res = await apiClient.get<ApiResponse<DocumentRequirement[]>>('/admin/document-rules');
        if (res.data.success) setDocumentRules(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [activeTab]);

  const handleCreateOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingOfficer(true);
    try {
      const res = await apiClient.post<ApiResponse<User>>('/admin/officers', {
        name: officerName,
        email: officerEmail,
        mobile: officerMobile,
        password: officerPassword,
      });
      if (res.data.success) {
        setShowAddOfficer(false);
        setOfficerName('');
        setOfficerEmail('');
        setOfficerMobile('');
        await fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create officer account.');
    } finally {
      setIsSubmittingOfficer(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-purple-950 text-white rounded-xl p-6 shadow-md border border-purple-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-purple-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300">System Administration</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">FSSAI Portal Administration Console</h1>
          <p className="text-xs text-purple-200 mt-0.5">
            Manage officer accounts, monitor system audit logs, track Main SIH Portal integration API requests, and configure document rules.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="flex items-center space-x-1.5 px-3 py-2 bg-purple-800 hover:bg-purple-700 text-white rounded text-xs font-bold transition shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex space-x-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('officers')}
          className={`pb-3 border-b-2 flex items-center space-x-1.5 transition ${
            activeTab === 'officers' ? 'border-purple-700 text-purple-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Scrutiny Officers</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 border-b-2 flex items-center space-x-1.5 transition ${
            activeTab === 'audit' ? 'border-purple-700 text-purple-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>System Audit Logs</span>
        </button>
        <button
          onClick={() => setActiveTab('integration')}
          className={`pb-3 border-b-2 flex items-center space-x-1.5 transition ${
            activeTab === 'integration' ? 'border-purple-700 text-purple-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Integration API Logs</span>
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 border-b-2 flex items-center space-x-1.5 transition ${
            activeTab === 'rules' ? 'border-purple-700 text-purple-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Document Rules Configuration</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        {/* OFFICERS TAB */}
        {activeTab === 'officers' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h2 className="font-bold text-sm text-slate-800">Department Scrutiny Officers</h2>
              <button
                onClick={() => setShowAddOfficer(true)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded font-bold text-xs shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Officer</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-semibold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Officer Name</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">Mobile</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {officers.map((off) => (
                    <tr key={off.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{off.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{off.email}</td>
                      <td className="py-2.5 px-3 text-slate-600">{off.mobile}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                          {off.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-emerald-700 font-bold">Active</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AUDIT LOGS TAB */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <h2 className="font-bold text-sm text-slate-800 border-b pb-2">Immutable System Audit Trail</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-semibold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">User / Actor</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Entity Type</th>
                    <th className="py-2.5 px-3">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                        {new Date(log.created_at).toLocaleString('en-GB')}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{log.user_name || 'System / Integration API'}</td>
                      <td className="py-2 px-3 font-mono font-bold text-gov-800">{log.action}</td>
                      <td className="py-2 px-3 text-slate-600">{log.entity_type}</td>
                      <td className="py-2 px-3 text-slate-400 font-mono">{log.ip_address || '127.0.0.1'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* INTEGRATION LOGS TAB */}
        {activeTab === 'integration' && (
          <div className="space-y-4">
            <h2 className="font-bold text-sm text-slate-800 border-b pb-2">Main SIH Portal Integration Logs</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-semibold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Source System</th>
                    <th className="py-2.5 px-3">Endpoint</th>
                    <th className="py-2.5 px-3">External Ref ID</th>
                    <th className="py-2.5 px-3">Response Code</th>
                    <th className="py-2.5 px-3">Latency (ms)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {integrationLogs.map((ilog) => (
                    <tr key={ilog.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                        {new Date(ilog.created_at).toLocaleString('en-GB')}
                      </td>
                      <td className="py-2 px-3 font-bold text-gov-800">{ilog.source_system}</td>
                      <td className="py-2 px-3 font-mono text-slate-700">{ilog.endpoint}</td>
                      <td className="py-2 px-3 font-mono text-amber-800">{ilog.external_reference_id || '—'}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ilog.response_code < 400 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {ilog.response_code}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{ilog.processing_time_ms.toFixed(1)} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DOCUMENT RULES TAB */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            <h2 className="font-bold text-sm text-slate-800 border-b pb-2">Dynamic Document Applicability Rules</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-semibold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Rule Identifier</th>
                    <th className="py-2.5 px-3">Document Name</th>
                    <th className="py-2.5 px-3">Applicability</th>
                    <th className="py-2.5 px-3">Target Activity</th>
                    <th className="py-2.5 px-3">Size Limit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {documentRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-gov-800 font-semibold">{rule.id}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{rule.name}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rule.applicability_type === 'MANDATORY' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {rule.applicability_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{rule.applicable_activity || 'ALL'}</td>
                      <td className="py-2.5 px-3 text-slate-500">{rule.max_file_size_mb} MB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ADD OFFICER MODAL */}
      {showAddOfficer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <form onSubmit={handleCreateOfficer} className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b pb-2">Add New Scrutiny Officer</h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Officer Name *</label>
              <input
                type="text"
                required
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                placeholder="e.g. Officer Rajesh"
                className="w-full p-2 border rounded text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Official Email *</label>
              <input
                type="email"
                required
                value={officerEmail}
                onChange={(e) => setOfficerEmail(e.target.value)}
                placeholder="rajesh@fssai.gov.in"
                className="w-full p-2 border rounded text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
              <input
                type="tel"
                required
                maxLength={10}
                value={officerMobile}
                onChange={(e) => setOfficerMobile(e.target.value)}
                placeholder="9876543299"
                className="w-full p-2 border rounded text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
              <input
                type="password"
                required
                value={officerPassword}
                onChange={(e) => setOfficerPassword(e.target.value)}
                className="w-full p-2 border rounded text-xs focus:outline-none"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowAddOfficer(false)}
                className="px-3 py-1.5 border rounded text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingOfficer}
                className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded text-xs font-bold shadow-sm"
              >
                {isSubmittingOfficer ? 'Creating...' : 'Create Officer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
