import React, { useState } from 'react';
import { Terminal, Copy, Check, ExternalLink, ShieldCheck, Code, ArrowRight } from 'lucide-react';

export const ApiDocsPage: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const prefillCurl = `curl -X POST http://localhost:8000/api/integrations/v1/applications/prefill \\
  -H "X-API-Key: fssai-mock-secret-key-2026" \\
  -H "Content-Type: application/json" \\
  -d '{
    "external_reference_id": "SIH-APP-1001",
    "source_system": "SIH26130",
    "applicant": {
      "applicant_name": "Rahul Kumar",
      "designation": "Managing Director",
      "mobile": "9876543210",
      "email": "rahul@example.com"
    },
    "business": {
      "business_name": "ABC Foods Pvt Ltd",
      "legal_name": "ABC Foods Private Limited",
      "organization_type": "PRIVATE_LIMITED",
      "business_type": "MANUFACTURING_UNIT",
      "kind_of_food_business": "Food Manufacturing / Processing",
      "business_activity": "Packaged Snack Manufacturing",
      "project_stage": "NEW",
      "state": "Tamil Nadu",
      "district": "Salem",
      "pincode": "636001",
      "address_line_1": "Plot 42, SIDCO Industrial Estate, Omalur Road",
      "investment_amount": 50000000.0,
      "employee_count": 45,
      "gst_number": "33AABCA1234F1Z5",
      "pan_number": "AABCA1234F",
      "udyam_number": "UDYAM-TN-24-0012345"
    },
    "activities": ["MANUFACTURING", "PROCESSING", "PACKAGING"],
    "products": [
      {
        "product_name": "Masala Potato Chips",
        "product_category": "Packaged Snack Foods",
        "description": "Potato-based packaged snack",
        "expected_capacity": 5000,
        "unit_of_measure": "kg/day"
      }
    ]
  }'`;

  const statusSyncCurl = `curl -X GET http://localhost:8000/api/integrations/v1/applications/FSSAI-MOCK-2026-000101/status \\
  -H "X-API-Key: fssai-mock-secret-key-2026"`;

  const submitCurl = `curl -X POST http://localhost:8000/api/integrations/v1/applications/FSSAI-MOCK-2026-000101/submit \\
  -H "X-API-Key: fssai-mock-secret-key-2026"`;

  const docUploadCurl = `curl -X POST http://localhost:8001/api/integrations/v1/applications/FSSAI-MOCK-2026-000101/documents \\
  -H "X-API-Key: fssai-mock-secret-key-2026" \\
  -F "requirement_id=identity_proof" \\
  -F "file=@/path/to/identity_proof.pdf"`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full text-xs font-semibold mb-2">
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span>MOCK REST API INTEGRATION CONTRACT</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Main SIH Portal Integration Guide</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Secure REST API for your Main SIH Portal backend to pre-fill draft FSSAI applications, upload compliance documents, and poll/sync real-time approval statuses.
          </p>
        </div>

        <div className="flex space-x-3">
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gov-700 hover:bg-gov-600 text-white rounded text-xs font-bold shadow transition"
          >
            <span>Swagger OpenAPI UI</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Architecture & Flow */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-gov-700" />
          <span>Integration Architecture Overview</span>
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Your <strong>Main SIH Backend</strong> sends business information to the Mock FSSAI Portal using server-to-server HTTPS REST calls. The integration API key is configured securely in environment variables and never exposed to client-side code.
        </p>

        <div className="bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-xs overflow-x-auto">
          MAIN SIH PORTAL BACKEND  ──(POST /api/integrations/v1/applications/prefill)──&gt;  MOCK FSSAI BACKEND (Generates Draft)<br />
          APPLICANT BROWSER        ──(Reviews Pre-filled Data & Uploads Docs)──────────&gt;  MOCK FSSAI BACKEND<br />
          OFFICER PORTAL           ──(Reviews Documents & Schedules Inspection)────────&gt;  MOCK FSSAI BACKEND<br />
          MAIN SIH PORTAL BACKEND  ──(GET /api/integrations/v1/applications/{'{app}'}/status)─&gt;  MOCK FSSAI BACKEND (Syncs Status)
        </div>
      </div>

      {/* API Key Header Spec */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-xs space-y-2">
        <h3 className="font-bold text-slate-800 text-sm">Authentication Header</h3>
        <p className="text-slate-600">All integration endpoints require the secret API key passed in the request header:</p>
        <div className="bg-slate-900 text-amber-300 p-3 rounded font-mono font-bold">
          X-API-Key: fssai-mock-secret-key-2026
        </div>
        <p className="text-[11px] text-slate-500">
          Configurable in backend <code className="text-slate-800">.env</code> via <code className="text-slate-800">MOCK_FSSAI_API_KEY</code>.
        </p>
      </div>

      {/* Endpoint 1: Prefill */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b">
          <div>
            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-xs mr-2 font-mono">POST</span>
            <span className="font-mono font-bold text-xs text-slate-900">/api/integrations/v1/applications/prefill</span>
          </div>
          <button
            onClick={() => copyToClipboard(prefillCurl, 'prefill')}
            className="flex items-center space-x-1 text-xs font-bold text-gov-700 hover:text-gov-900"
          >
            {copiedSection === 'prefill' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSection === 'prefill' ? 'Copied!' : 'Copy cURL'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-600">
          Create or pre-fill a draft food license application with external business details. Supports idempotency with <code className="font-mono text-slate-800">external_reference_id</code>.
        </p>

        <pre className="bg-slate-950 text-slate-200 p-4 rounded-lg font-mono text-[11px] overflow-x-auto">
          {prefillCurl}
        </pre>
      </div>

      {/* Endpoint 2: Document Upload */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b">
          <div>
            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-xs mr-2 font-mono">POST</span>
            <span className="font-mono font-bold text-xs text-slate-900">/api/integrations/v1/applications/{'{application_number}'}/documents</span>
          </div>
          <button
            onClick={() => copyToClipboard(docUploadCurl, 'upload')}
            className="flex items-center space-x-1 text-xs font-bold text-gov-700 hover:text-gov-900"
          >
            {copiedSection === 'upload' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSection === 'upload' ? 'Copied!' : 'Copy cURL'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-600">
          Upload documents directly via multipart form data from the Main SIH Portal.
        </p>

        <pre className="bg-slate-950 text-slate-200 p-4 rounded-lg font-mono text-[11px] overflow-x-auto">
          {docUploadCurl}
        </pre>
      </div>

      {/* Endpoint 3: Status Sync */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b">
          <div>
            <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-xs mr-2 font-mono">GET</span>
            <span className="font-mono font-bold text-xs text-slate-900">/api/integrations/v1/applications/{'{application_number}'}/status</span>
          </div>
          <button
            onClick={() => copyToClipboard(statusSyncCurl, 'status')}
            className="flex items-center space-x-1 text-xs font-bold text-gov-700 hover:text-gov-900"
          >
            {copiedSection === 'status' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSection === 'status' ? 'Copied!' : 'Copy cURL'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-600">
          Poll current status, pending actions (queries / inspection details), and latest officer remarks for your Main SIH dashboard view.
        </p>

        <pre className="bg-slate-950 text-slate-200 p-4 rounded-lg font-mono text-[11px] overflow-x-auto">
          {statusSyncCurl}
        </pre>
      </div>
    </div>
  );
};
