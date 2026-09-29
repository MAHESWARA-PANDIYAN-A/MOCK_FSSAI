import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  ArrowLeft, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  MessageSquare, 
  Download, 
  RefreshCw,
  Eye,
  Check,
  X,
  Clock,
  Plus
} from 'lucide-react';
import apiClient from '../services/api';
import { 
  Application, 
  ApplicationStatus, 
  DocumentReviewStatus, 
  ApiResponse,
  DocumentRequirement 
} from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { DocumentStatusBadge } from '../components/common/DocumentStatusBadge';
import { RiskBadge } from '../components/common/RiskBadge';
import { ConfirmModal } from '../components/common/ConfirmModal';

export const OfficerApplicationReview: React.FC = () => {
  const { appNumber } = useParams<{ appNumber: string }>();
  const navigate = useNavigate();

  const [application, setApplication] = useState<Application | null>(null);
  const [docRequirements, setDocRequirements] = useState<DocumentRequirement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'products' | 'queries' | 'inspections' | 'history'>('overview');

  // Document Review Modal state
  const [reviewingDocId, setReviewingDocId] = useState<string | null>(null);
  const [reviewDocName, setReviewDocName] = useState<string>('');
  const [reviewStatus, setReviewStatus] = useState<DocumentReviewStatus>('ACCEPTED');
  const [officerComment, setOfficerComment] = useState<string>('');
  const [isSubmittingDocReview, setIsSubmittingDocReview] = useState<boolean>(false);

  // Status Progression Modal state
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [targetStatus, setTargetStatus] = useState<ApplicationStatus>('UNDER_REVIEW');
  const [statusReason, setStatusReason] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Query Modal state
  const [showQueryModal, setShowQueryModal] = useState<boolean>(false);
  const [querySubject, setQuerySubject] = useState<string>('Document Clarification Required');
  const [queryMessage, setQueryMessage] = useState<string>('Please provide clarification or re-upload corrected document.');
  const [isCreatingQuery, setIsCreatingQuery] = useState<boolean>(false);

  // Inspection Modal state
  const [showInspectionModal, setShowInspectionModal] = useState<boolean>(false);
  const [inspectionDate, setInspectionDate] = useState<string>('2026-10-05');
  const [inspectionTime, setInspectionTime] = useState<string>('11:00 AM');
  const [inspectionLocation, setInspectionLocation] = useState<string>('');
  const [inspectionInstructions, setInspectionInstructions] = useState<string>('Ensure food production batch logs and hygiene maintenance records are accessible during audit.');
  const [isSchedulingInspection, setIsSchedulingInspection] = useState<boolean>(false);

  const fetchApplicationDetails = async () => {
    setIsLoading(true);
    try {
      const [appRes, reqRes] = await Promise.all([
        apiClient.get<ApiResponse<Application>>(`/officer/applications/${appNumber}`),
        apiClient.get<ApiResponse<DocumentRequirement[]>>('/documents/requirements')
      ]);

      if (appRes.data.success) {
        setApplication(appRes.data.data);
        if (appRes.data.data.premises) {
          setInspectionLocation(`${appRes.data.data.premises.address_line_1}, ${appRes.data.data.premises.district}, ${appRes.data.data.premises.state}`);
        }
      }
      if (reqRes.data.success) {
        setDocRequirements(reqRes.data.data);
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

  // Handle Document Review Submit
  const handleDocumentReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingDocId || !application) return;

    if ((reviewStatus === 'REJECTED' || reviewStatus === 'NEEDS_CORRECTION') && !officerComment.trim()) {
      alert('Officer comment is mandatory when rejecting or requesting correction.');
      return;
    }

    setIsSubmittingDocReview(true);
    try {
      const res = await apiClient.post<ApiResponse<any>>(
        `/officer/applications/${application.application_number}/documents/${reviewingDocId}/review`,
        {
          review_status: reviewStatus,
          officer_comment: officerComment || undefined,
        }
      );
      if (res.data.success) {
        setReviewingDocId(null);
        setOfficerComment('');
        await fetchApplicationDetails();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update document status.');
    } finally {
      setIsSubmittingDocReview(false);
    }
  };

  // Handle Status Transition Submit
  const handleStatusTransitionSubmit = async () => {
    if (!application) return;
    setIsUpdatingStatus(true);
    try {
      const res = await apiClient.post<ApiResponse<Application>>(
        `/officer/applications/${application.application_number}/status`,
        {
          new_status: targetStatus,
          reason: statusReason || `Status transitioned to ${targetStatus} by scrutiny officer.`,
          visible_to_applicant: true,
        }
      );
      if (res.data.success) {
        setShowStatusModal(false);
        setStatusReason('');
        await fetchApplicationDetails();
      }
    } catch (err: any) {
      alert(err.message || 'Status transition failed.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Create Query
  const handleCreateQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application) return;
    setIsCreatingQuery(true);
    try {
      const res = await apiClient.post<ApiResponse<any>>(
        `/officer/applications/${application.application_number}/queries`,
        {
          subject: querySubject,
          message: queryMessage,
          deadline_days: 7,
        }
      );
      if (res.data.success) {
        setShowQueryModal(false);
        setQuerySubject('');
        setQueryMessage('');
        await fetchApplicationDetails();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to raise query.');
    } finally {
      setIsCreatingQuery(false);
    }
  };

  // Handle Schedule Inspection
  const handleScheduleInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application) return;
    setIsSchedulingInspection(true);
    try {
      const res = await apiClient.post<ApiResponse<any>>(
        `/officer/applications/${application.application_number}/inspections`,
        {
          inspection_type: 'Pre-Licensing Premises & Hygiene Inspection',
          scheduled_date: inspectionDate,
          scheduled_time: inspectionTime,
          location: inspectionLocation,
          instructions: inspectionInstructions,
        }
      );
      if (res.data.success) {
        setShowInspectionModal(false);
        await fetchApplicationDetails();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to schedule inspection.');
    } finally {
      setIsSchedulingInspection(false);
    }
  };

  if (isLoading || !application) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gov-700 mb-2" />
        Loading application scrutiny details...
      </div>
    );
  }

  const getAvailableNextStatuses = (): ApplicationStatus[] => {
    switch (application.status) {
      case 'SUBMITTED':
        return ['UNDER_REVIEW', 'DOCUMENT_QUERY', 'REJECTED'];
      case 'UNDER_REVIEW':
        return ['DOCUMENT_QUERY', 'INSPECTION_REQUIRED', 'APPROVED', 'REJECTED'];
      case 'DOCUMENT_QUERY':
        return ['UNDER_REVIEW', 'REJECTED'];
      case 'INSPECTION_REQUIRED':
        return ['INSPECTION_SCHEDULED', 'UNDER_REVIEW', 'REJECTED'];
      case 'INSPECTION_SCHEDULED':
        return ['UNDER_REVIEW', 'APPROVED', 'REJECTED'];
      default:
        return [];
    }
  };

  const nextStatuses = getAvailableNextStatuses();

  // Calculate 4 Document Scrutiny Counts
  const totalDocs = docRequirements.length || 4;
  const acceptedCount = application.documents.filter((d) => d.review_status === 'ACCEPTED').length;
  const rejectedCount = application.documents.filter((d) => d.review_status === 'REJECTED').length;
  const needsCorrectionCount = application.documents.filter((d) => d.review_status === 'NEEDS_CORRECTION').length;
  const pendingCount = application.documents.filter((d) => d.review_status === 'PENDING_REVIEW' || d.review_status === 'UPLOADED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Link
          to="/officer/dashboard"
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-gov-700 hover:text-gov-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Scrutiny Dashboard</span>
        </Link>
        <button
          onClick={fetchApplicationDetails}
          className="p-1.5 border border-slate-300 rounded text-slate-600 hover:bg-slate-50"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Header Bar */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <span className="text-xs font-mono font-bold bg-gov-700 text-white px-2.5 py-1 rounded">
              {application.application_number}
            </span>
            <StatusBadge status={application.status} size="md" />
            <RiskBadge level={application.risk_level} />
          </div>
          <h1 className="text-2xl font-extrabold text-white">{application.business?.business_name}</h1>
          <p className="text-xs text-slate-300 mt-0.5">
            {application.business?.district}, {application.business?.state} &bull; Signatory: {application.applicant?.applicant_name} ({application.applicant?.mobile})
          </p>
        </div>

        {/* Status Transition Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {nextStatuses.map((st) => (
            <button
              key={st}
              onClick={() => {
                setTargetStatus(st);
                setShowStatusModal(true);
              }}
              className={`px-3 py-1.5 rounded text-xs font-bold shadow transition ${
                st === 'APPROVED'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : st === 'REJECTED'
                  ? 'bg-rose-700 hover:bg-rose-600 text-white'
                  : st === 'DOCUMENT_QUERY'
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                  : 'bg-gov-700 hover:bg-gov-600 text-white'
              }`}
            >
              Move to &rarr; {st.replace('_', ' ')}
            </button>
          ))}

          <button
            onClick={() => setShowQueryModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-bold transition"
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>Raise Query</span>
          </button>

          <button
            onClick={() => setShowInspectionModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-bold transition"
          >
            <Calendar className="w-3.5 h-3.5 text-teal-400" />
            <span>Schedule Inspection</span>
          </button>
        </div>
      </div>

      {/* Scrutiny Tabs */}
      <div className="border-b border-slate-200 flex space-x-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'overview' ? 'border-gov-700 text-gov-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Scrutiny Overview
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'documents' ? 'border-gov-700 text-gov-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          DOCUMENT REVIEW ({application.documents.length} / {totalDocs})
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'products' ? 'border-gov-700 text-gov-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Declared Food Products ({application.products.length})
        </button>
        <button
          onClick={() => setActiveTab('queries')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'queries' ? 'border-gov-700 text-gov-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Queries ({application.queries.length})
        </button>
        <button
          onClick={() => setActiveTab('inspections')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'inspections' ? 'border-gov-700 text-gov-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Premises Inspections ({application.inspections.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'history' ? 'border-gov-700 text-gov-900' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Audit History ({application.status_history.length})
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-xs">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-800 border-b pb-2">Business & Facility Technical Details</h3>
              <p><strong>Business Legal Name:</strong> {application.business?.legal_name}</p>
              <p><strong>Organization Type:</strong> {application.business?.organization_type}</p>
              <p><strong>Declared Food Activities:</strong> {application.activities?.join(', ') || 'MANUFACTURING'}</p>
              <p><strong>Installed Processing Capacity:</strong> {application.installed_capacity_details || '5000 kg/day continuous line'}</p>
              <p><strong>Equipment Declared:</strong> {application.machinery_details || 'Slicer, Continuous Fryer, Packaging unit'}</p>
              <p><strong>Premises Ownership:</strong> {application.premises?.ownership_type}</p>
              <p><strong>Registered Address:</strong> {application.premises?.address_line_1}, {application.premises?.district}, {application.premises?.state} - {application.premises?.pincode}</p>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-800 border-b pb-2">Signatory KYC & Integration Parameters</h3>
              <p><strong>Authorized Applicant:</strong> {application.applicant?.applicant_name} ({application.applicant?.designation})</p>
              <p><strong>Mobile Verification:</strong> <span className="text-emerald-700 font-bold">✓ Verified ({application.applicant?.mobile})</span></p>
              <p><strong>Email Verification:</strong> <span className="text-emerald-700 font-bold">✓ Verified ({application.applicant?.email})</span></p>
              <p><strong>GST Number:</strong> {application.business?.gst_number || 'N/A'}</p>
              <p><strong>PAN Number:</strong> {application.business?.pan_number || 'N/A'}</p>
              <p><strong>Udyam Registration:</strong> {application.business?.udyam_number || 'N/A'}</p>
              <p><strong>External Reference ID:</strong> {application.external_reference_id || 'N/A'}</p>
              <p><strong>Source System:</strong> {application.source_system}</p>
            </div>
          </div>
        )}

        {/* DOCUMENT SCRUTINY TAB */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            {/* DOCUMENT REVIEW SUMMARY CARD */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                  DOCUMENT REVIEW STATUS
                </span>
                <span className="text-xs font-bold text-gov-800 font-mono">
                  Total Documents: {totalDocs}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                <div className="bg-white p-3 rounded-lg border border-emerald-200 text-center">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase">Accepted</div>
                  <div className="text-lg font-extrabold text-emerald-700">{acceptedCount}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-blue-200 text-center">
                  <div className="text-[10px] font-bold text-blue-800 uppercase">Pending Review</div>
                  <div className="text-lg font-extrabold text-blue-700">{pendingCount}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-amber-200 text-center">
                  <div className="text-[10px] font-bold text-amber-800 uppercase">Needs Correction</div>
                  <div className="text-lg font-extrabold text-amber-700">{needsCorrectionCount}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-rose-200 text-center">
                  <div className="text-[10px] font-bold text-rose-800 uppercase">Rejected</div>
                  <div className="text-lg font-extrabold text-rose-700">{rejectedCount}</div>
                </div>
              </div>
            </div>

            {/* Exactly 4 Document Review Cards */}
            <div className="space-y-3">
              {docRequirements.map((req) => {
                const uploadedDoc = application.documents.find((d) => d.requirement_id === req.id);

                return (
                  <div
                    key={req.id}
                    className="p-4 border border-slate-200 rounded-xl bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition"
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-sm text-slate-900">{req.name}</h4>
                        {uploadedDoc ? (
                          <DocumentStatusBadge status={uploadedDoc.review_status} />
                        ) : (
                          <DocumentStatusBadge status="NOT_UPLOADED" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{req.description}</p>
                      {uploadedDoc ? (
                        <div className="text-[11px] text-slate-600 font-mono pt-1">
                          File: <strong>{uploadedDoc.original_filename}</strong> ({(uploadedDoc.file_size / 1024).toFixed(1)} KB) &bull; Uploaded: {new Date(uploadedDoc.uploaded_at).toLocaleDateString('en-GB')}
                          {uploadedDoc.officer_comment && (
                            <div className="text-rose-700 font-semibold font-sans mt-0.5">
                              Officer Comment: {uploadedDoc.officer_comment}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 italic">No document uploaded by applicant yet.</div>
                      )}
                    </div>

                    {uploadedDoc && (
                      <div className="flex items-center space-x-2 shrink-0">
                        <a
                          href={`/api/v1/documents/view/${uploadedDoc.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </a>

                        <a
                          href={`/api/v1/documents/view/${uploadedDoc.id}?download=true`}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            setReviewingDocId(uploadedDoc.id);
                            setReviewDocName(req.name);
                            setReviewStatus(uploadedDoc.review_status);
                            setOfficerComment(uploadedDoc.officer_comment || '');
                          }}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-gov-700 hover:bg-gov-800 text-white rounded text-xs font-bold shadow-sm transition"
                        >
                          <span>Review Document</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-100 uppercase text-slate-600 font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Declared Capacity</th>
                  <th className="py-2.5 px-3">Ingredients</th>
                  <th className="py-2.5 px-3">Process Description</th>
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
                    <td className="py-2.5 px-3 text-slate-500">{p.manufacturing_process_description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* QUERIES TAB */}
        {activeTab === 'queries' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-sm text-slate-800">Official Queries Log</h3>
              <button
                onClick={() => setShowQueryModal(true)}
                className="inline-flex items-center space-x-1 px-3 py-1 bg-gov-700 hover:bg-gov-800 text-white rounded font-bold text-xs shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Raise New Query</span>
              </button>
            </div>

            {application.queries.length === 0 ? (
              <p className="text-slate-400 italic">No queries have been raised yet.</p>
            ) : (
              application.queries.map((q) => (
                <div key={q.id} className="p-4 border rounded-lg bg-slate-50 space-y-2">
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-900">{q.subject}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] ${q.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {q.status}
                    </span>
                  </div>
                  <p className="text-slate-700"><strong>Query:</strong> {q.message}</p>
                  {q.applicant_response ? (
                    <div className="bg-white p-3 rounded border border-slate-200 mt-2">
                      <strong className="text-emerald-800">Applicant Response:</strong> {q.applicant_response}
                      <div className="mt-2 text-right">
                        {q.status !== 'RESOLVED' && (
                          <button
                            onClick={async () => {
                              await apiClient.put(`/officer/applications/${application.application_number}/queries/${q.id}/resolve`);
                              fetchApplicationDetails();
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px]"
                          >
                            Mark Query Resolved
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-amber-800 italic font-semibold text-[11px]">Awaiting response from applicant.</span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* INSPECTIONS TAB */}
        {activeTab === 'inspections' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-bold text-sm text-slate-800">Scheduled Inspections</h3>
              <button
                onClick={() => setShowInspectionModal(true)}
                className="inline-flex items-center space-x-1 px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded font-bold text-xs shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule Inspection</span>
              </button>
            </div>

            {application.inspections.length === 0 ? (
              <p className="text-slate-400 italic">No premises inspection scheduled.</p>
            ) : (
              application.inspections.map((i) => (
                <div key={i.id} className="p-4 border border-teal-200 bg-teal-50/40 rounded-lg space-y-2">
                  <div className="flex justify-between font-bold text-teal-950">
                    <span>{i.inspection_type}</span>
                    <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded text-[10px]">
                      {i.status}
                    </span>
                  </div>
                  <p><strong>Scheduled:</strong> {i.scheduled_date} at {i.scheduled_time}</p>
                  <p><strong>Premises Location:</strong> {i.location}</p>
                  <p><strong>Instructions:</strong> {i.instructions || 'N/A'}</p>
                  {i.status === 'SCHEDULED' && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={async () => {
                          await apiClient.put(`/officer/applications/${application.application_number}/inspections/${i.id}`, {
                            status: 'COMPLETED',
                            officer_notes: 'Premises hygiene and food safety standards verified and compliant.'
                          });
                          fetchApplicationDetails();
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs"
                      >
                        Mark Inspection Completed
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* AUDIT TIMELINE TAB */}
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
                  <span className="text-[10px] text-slate-400 font-medium">Changed by: {hist.changed_by}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DOCUMENT REVIEW MODAL */}
      {reviewingDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <form onSubmit={handleDocumentReviewSubmit} className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b pb-2">
              Scrutinize: {reviewDocName || 'Document'}
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Scrutiny Action *</label>
              <select
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value as DocumentReviewStatus)}
                className="w-full p-2 border rounded text-xs bg-white focus:outline-none"
              >
                <option value="ACCEPTED">Accept / Verified</option>
                <option value="NEEDS_CORRECTION">Needs Correction (Request Clarification)</option>
                <option value="REJECTED">Reject Document</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Officer Comment {reviewStatus !== 'ACCEPTED' && <span className="text-rose-600">*</span>}
              </label>
              <textarea
                rows={3}
                required={reviewStatus !== 'ACCEPTED'}
                value={officerComment}
                onChange={(e) => setOfficerComment(e.target.value)}
                placeholder="Enter technical scrutiny remarks (e.g. Uploaded address proof does not match the business address)..."
                className="w-full p-2 border rounded text-xs focus:ring-2 focus:ring-gov-700 focus:outline-none"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setReviewingDocId(null)}
                className="px-3 py-1.5 border rounded text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingDocReview}
                className="px-4 py-1.5 bg-gov-700 hover:bg-gov-800 text-white rounded text-xs font-bold shadow-sm"
              >
                {isSubmittingDocReview ? 'Saving...' : 'Confirm Decision'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STATUS TRANSITION MODAL */}
      <ConfirmModal
        isOpen={showStatusModal}
        title={`Transition Application to ${targetStatus}`}
        message={`Are you sure you want to update the official status of application ${application.application_number} to ${targetStatus}? This change is recorded in the permanent audit trail.`}
        confirmText={`Update to ${targetStatus}`}
        variant={targetStatus === 'APPROVED' ? 'success' : targetStatus === 'REJECTED' ? 'danger' : 'primary'}
        isLoading={isUpdatingStatus}
        onConfirm={handleStatusTransitionSubmit}
        onClose={() => setShowStatusModal(false)}
      />

      {/* RAISE QUERY MODAL */}
      {showQueryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <form onSubmit={handleCreateQuery} className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b pb-2">Raise Official Technical Query</h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Subject *</label>
              <input
                type="text"
                required
                value={querySubject}
                onChange={(e) => setQuerySubject(e.target.value)}
                className="w-full p-2 border rounded text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Message / Instructions *</label>
              <textarea
                rows={4}
                required
                value={queryMessage}
                onChange={(e) => setQueryMessage(e.target.value)}
                className="w-full p-2 border rounded text-xs focus:outline-none"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowQueryModal(false)}
                className="px-3 py-1.5 border rounded text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingQuery}
                className="px-4 py-1.5 bg-gov-700 hover:bg-gov-800 text-white rounded text-xs font-bold shadow-sm"
              >
                {isCreatingQuery ? 'Sending...' : 'Dispatch Query'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SCHEDULE INSPECTION MODAL */}
      {showInspectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <form onSubmit={handleScheduleInspection} className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b pb-2">Schedule Premises Hygiene Audit</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  className="w-full p-2 border rounded text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Time *</label>
                <input
                  type="text"
                  required
                  value={inspectionTime}
                  onChange={(e) => setInspectionTime(e.target.value)}
                  className="w-full p-2 border rounded text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Premises Location *</label>
              <input
                type="text"
                required
                value={inspectionLocation}
                onChange={(e) => setInspectionLocation(e.target.value)}
                className="w-full p-2 border rounded text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Instructions to Food Operator</label>
              <textarea
                rows={3}
                value={inspectionInstructions}
                onChange={(e) => setInspectionInstructions(e.target.value)}
                className="w-full p-2 border rounded text-xs focus:outline-none"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowInspectionModal(false)}
                className="px-3 py-1.5 border rounded text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSchedulingInspection}
                className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded text-xs font-bold shadow-sm"
              >
                {isSchedulingInspection ? 'Scheduling...' : 'Confirm Inspection'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
