import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  FileText, 
  Download, 
  ArrowLeft, 
  Clock, 
  AlertCircle, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Upload, 
  Send,
  MessageSquare,
  Building,
  RefreshCw
} from 'lucide-react';
import apiClient from '../services/api';
import { Application, ApplicationQuery, ApiResponse } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { DocumentStatusBadge } from '../components/common/DocumentStatusBadge';

export const ApplicantApplicationDetail: React.FC = () => {
  const { appNumber } = useParams<{ appNumber: string }>();
  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'products' | 'queries' | 'history'>('overview');

  // Query Response state
  const [respondingQueryId, setRespondingQueryId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<string>('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchApplicationDetails = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<ApiResponse<Application>>(`/applicant/applications/${appNumber}`);
      if (res.data.success) {
        setApplication(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (appNumber) {
      fetchApplicationDetails();
    }
  }, [appNumber]);

  const handleRespondToQuery = async (queryId: string) => {
    if (!responseText.trim()) return;
    setIsSubmittingResponse(true);

    try {
      const res = await apiClient.post<ApiResponse<any>>(
        `/applicant/applications/${application?.application_number}/queries/${queryId}/respond`,
        { applicant_response: responseText }
      );
      if (res.data.success) {
        setRespondingQueryId(null);
        setResponseText('');
        setActionSuccess('Response sent to officer successfully.');
        await fetchApplicationDetails();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit query response.');
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  if (isLoading || !application) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gov-700 mb-2" />
        Loading application details...
      </div>
    );
  }

  const openQueries = application.queries.filter((q) => q.status === 'OPEN');
  const scheduledInspection = application.inspections.find((i) => i.status === 'SCHEDULED');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/applicant/dashboard"
          className="inline-flex items-center space-x-1 text-xs font-bold text-gov-700 hover:text-gov-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Applications</span>
        </Link>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchApplicationDetails}
            className="p-1.5 border border-slate-300 rounded text-slate-600 hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <a
            href={`/api/v1/applicant/applications/${application.application_number}/acknowledgement`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-gov-800 hover:bg-gov-700 text-white rounded text-xs font-bold shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Receipt</span>
          </a>
        </div>
      </div>

      {/* Main Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <span className="text-xs font-mono font-bold bg-gov-50 text-gov-800 px-2.5 py-1 rounded border border-gov-200">
              {application.application_number}
            </span>
            <StatusBadge status={application.status} size="md" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">{application.business?.business_name}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {application.business?.district}, {application.business?.state} &bull; Type: {application.application_type.replace('_', ' ')}
          </p>
        </div>

        <div className="text-right text-xs space-y-1">
          <div><span className="text-slate-400">Submission Date:</span> <strong className="text-slate-700">{application.submission_date ? new Date(application.submission_date).toLocaleDateString('en-GB') : 'Draft'}</strong></div>
          <div><span className="text-slate-400">Assigned Officer:</span> <strong className="text-gov-800">{application.assigned_officer_name || 'Department Scrutiny Pool'}</strong></div>
        </div>
      </div>

      {/* Action Required Banner if Open Queries */}
      {openQueries.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start space-x-3 text-amber-950">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <h3 className="font-bold text-sm text-amber-900 mb-1">
              Action Required: Official Query Raised ({openQueries.length})
            </h3>
            <p className="text-amber-800 mb-3 leading-relaxed">
              The reviewing officer has requested clarification or updated documents before processing can proceed.
            </p>
            <div className="space-y-2">
              {openQueries.map((q) => (
                <div key={q.id} className="p-3 bg-white border border-amber-200 rounded-lg shadow-sm">
                  <div className="font-bold text-slate-800 mb-1">{q.subject}</div>
                  <div className="text-slate-600 mb-3">{q.message}</div>
                  
                  {respondingQueryId === q.id ? (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <textarea
                        rows={3}
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Type your explanation or clarify updated documents..."
                        className="w-full p-2 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-gov-700 focus:outline-none"
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setRespondingQueryId(null)}
                          className="px-3 py-1 text-slate-600 text-xs font-semibold hover:bg-slate-100 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRespondToQuery(q.id)}
                          disabled={isSubmittingResponse}
                          className="px-4 py-1 bg-gov-700 hover:bg-gov-800 text-white font-bold text-xs rounded shadow-sm transition"
                        >
                          {isSubmittingResponse ? 'Submitting...' : 'Submit Response'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setRespondingQueryId(q.id); setResponseText(''); }}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded shadow-sm transition"
                    >
                      Respond to Query
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Inspection Scheduled Banner */}
      {scheduledInspection && (
        <div className="p-4 bg-teal-50 border border-teal-300 rounded-xl flex items-start space-x-3 text-teal-950">
          <Calendar className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h3 className="font-bold text-sm text-teal-900 mb-1">
              Food Safety Officer Premises Inspection Scheduled
            </h3>
            <p className="text-teal-800 leading-relaxed">
              Date: <strong>{scheduledInspection.scheduled_date}</strong> at <strong>{scheduledInspection.scheduled_time}</strong>.
            </p>
            <p className="text-teal-700 mt-1">
              <strong>Location:</strong> {scheduledInspection.location}
            </p>
            {scheduledInspection.instructions && (
              <p className="text-teal-700 mt-1">
                <strong>Instructions:</strong> {scheduledInspection.instructions}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 flex space-x-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'overview' ? 'border-gov-700 text-gov-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Application Overview
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'documents' ? 'border-gov-700 text-gov-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Documents ({application.documents.length})
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'products' ? 'border-gov-700 text-gov-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Declared Products ({application.products.length})
        </button>
        <button
          onClick={() => setActiveTab('queries')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'queries' ? 'border-gov-700 text-gov-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Official Queries ({application.queries.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'history' ? 'border-gov-700 text-gov-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Audit Timeline ({application.status_history.length})
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-xs">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-800 border-b pb-2">Business & Premises Summary</h3>
              <p><strong>Business Name:</strong> {application.business?.business_name}</p>
              <p><strong>Legal Entity:</strong> {application.business?.legal_name}</p>
              <p><strong>Organization Type:</strong> {application.business?.organization_type}</p>
              <p><strong>Food Business Activities:</strong> {application.activities?.join(', ') || 'N/A'}</p>
              <p><strong>Premises Address:</strong> {application.premises?.address_line_1}, {application.premises?.district}, {application.premises?.state} - {application.premises?.pincode}</p>
              <p><strong>Installed Capacity:</strong> {application.installed_capacity_details || 'N/A'}</p>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-800 border-b pb-2">Applicant / Signatory Information</h3>
              <p><strong>Authorized Signatory:</strong> {application.applicant?.applicant_name}</p>
              <p><strong>Designation:</strong> {application.applicant?.designation}</p>
              <p><strong>Mobile:</strong> {application.applicant?.mobile} <span className="text-emerald-700 font-bold">(Verified)</span></p>
              <p><strong>Email:</strong> {application.applicant?.email} <span className="text-emerald-700 font-bold">(Verified)</span></p>
              <p><strong>External Reference ID:</strong> {application.external_reference_id || 'N/A'}</p>
              <p><strong>Source System:</strong> {application.source_system}</p>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-100 uppercase text-slate-600 font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">Document Requirement</th>
                  <th className="py-2.5 px-3">Filename</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Review Status</th>
                  <th className="py-2.5 px-3">Officer Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {application.documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{doc.requirement_name || doc.requirement_id}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{doc.original_filename}</td>
                    <td className="py-2.5 px-3 text-slate-500">{(doc.file_size / 1024).toFixed(1)} KB</td>
                    <td className="py-2.5 px-3"><DocumentStatusBadge status={doc.review_status} /></td>
                    <td className="py-2.5 px-3 text-rose-700 font-medium">{doc.officer_comment || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-100 uppercase text-slate-600 font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Capacity</th>
                  <th className="py-2.5 px-3">Ingredients</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {application.products.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{p.product_name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{p.product_category}</td>
                    <td className="py-2.5 px-3 text-slate-700">{p.expected_capacity} {p.unit_of_measure}</td>
                    <td className="py-2.5 px-3 text-slate-500">{p.ingredients || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'queries' && (
          <div className="space-y-4">
            {application.queries.length === 0 ? (
              <p className="text-slate-400 italic">No official queries raised for this application.</p>
            ) : (
              application.queries.map((q) => (
                <div key={q.id} className="p-4 border rounded-lg bg-slate-50 space-y-2">
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-900">{q.subject}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] ${q.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {q.status}
                    </span>
                  </div>
                  <p className="text-slate-700"><strong>Officer:</strong> {q.message}</p>
                  {q.applicant_response && (
                    <p className="text-gov-800 bg-white p-2 rounded border border-slate-200">
                      <strong>Your Response:</strong> {q.applicant_response}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            {application.status_history.map((hist) => (
              <div key={hist.id} className="flex items-start space-x-3 pb-3 border-b border-slate-100">
                <div className="w-2 h-2 rounded-full bg-gov-700 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      {hist.old_status ? `${hist.old_status} → ` : ''}{hist.new_status}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(hist.created_at).toLocaleString('en-GB')}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5">{hist.reason}</p>
                  <span className="text-[10px] text-slate-400 font-medium">By: {hist.changed_by}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
