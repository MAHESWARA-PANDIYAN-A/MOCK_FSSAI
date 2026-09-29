import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  FileText, 
  Send, 
  Search, 
  ClipboardCheck, 
  CheckCircle, 
  Building, 
  ArrowRight,
  Sparkles,
  ExternalLink,
  Code2
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gov-950 via-gov-900 to-gov-800 text-white py-16 md:py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center space-x-2 bg-amber-500/20 text-amber-300 border border-amber-400/30 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-6 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>SIH26130 Hackathon Prototype — Simulated Approval Engine</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
            Simulated Food Safety Approval Portal
          </h1>

          <p className="text-base sm:text-xl text-slate-300 max-w-3xl mx-auto mb-8 font-normal leading-relaxed">
            A realistic external approval portal simulation for Food Business Operators and FSSAI Officers.
            Supports external integration prefill, end-to-end multi-step licensing, document scrutiny, 
            official queries, and inspection scheduling.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/applicant/login"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-saffron-500 hover:bg-saffron-600 text-slate-950 font-bold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5 text-sm"
            >
              <span>Applicant / FBO Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/officer/login"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-gov-700 hover:bg-gov-500 text-white font-bold px-6 py-3 rounded-lg border border-gov-500 shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5 text-sm"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Officer Scrutiny Portal</span>
            </Link>

            <Link
              to="/api-docs"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold px-5 py-3 rounded-lg border border-slate-700 text-sm transition"
            >
              <Code2 className="w-4 h-4 text-amber-400" />
              <span>Integration API Docs</span>
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-400 max-w-2xl mx-auto">
            <p>
              <strong>Notice:</strong> This application is a mockup for evaluation and does not submit data to the real Government of India FoSCoS portal.
            </p>
          </div>
        </div>
      </section>

      {/* Workflow Steps Section */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
              How the Simulated Approval Process Works
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl mx-auto">
              From automated Main SIH Portal pre-fill through officer scrutiny and final licensing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 relative">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center mb-4 text-sm">
                1
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">Integration Prefill</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Main SIH Portal sends applicant & business data via authenticated REST API. Draft application is generated instantly.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 relative">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center mb-4 text-sm">
                2
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">Upload & OTP Submit</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Applicant reviews pre-filled details, uploads conditional/mandatory documents, verifies with OTP (123456), and submits.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 relative">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center mb-4 text-sm">
                3
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">Officer Scrutiny</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Assigned FSSAI Officer verifies documents, accepts/rejects items, raises queries, and schedules premises inspections.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 relative">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center mb-4 text-sm">
                4
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">Approval & Sync</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Officer approves the application. Live status and PDF acknowledgement sync back to the Main SIH Portal automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Demonstration Scenario */}
      <section className="py-14 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gov-700">Demonstration Scenario</span>
                <h3 className="text-xl font-bold text-slate-900">Food Manufacturing Unit — Salem, Tamil Nadu</h3>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-300">
                Pre-Configured Demo Data
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500">Business Unit</span>
                <p className="font-bold text-slate-800">ABC Foods Pvt Ltd</p>
                <p className="text-xs text-slate-600">Private Limited Company</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500">Kind of Business & Products</span>
                <p className="font-bold text-slate-800">Packaged Snacks Manufacturing</p>
                <p className="text-xs text-slate-600">Masala Potato Chips, Banana Crisps (5000 kg/day)</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500">Quick Credentials</span>
                <p className="text-xs text-slate-700"><strong>Applicant:</strong> rahul@example.com / Password123!</p>
                <p className="text-xs text-slate-700"><strong>Officer:</strong> officer.meena@fssai.gov.in / Officer123!</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-4 items-center justify-between">
              <p className="text-xs text-slate-500">
                Test the exact SIH demo end-to-end or pre-fill a new draft from your external portal.
              </p>
              <div className="flex space-x-3">
                <Link
                  to="/applicant/login"
                  className="text-xs font-bold text-gov-700 hover:text-gov-900 underline"
                >
                  Login as Rahul Kumar &rarr;
                </Link>
                <Link
                  to="/officer/login"
                  className="text-xs font-bold text-gov-700 hover:text-gov-900 underline"
                >
                  Login as Officer Meena &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-8 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-gov-500" />
            <span className="text-slate-300 font-semibold">Food Safety Approval Portal — SIH26130 Prototype</span>
          </div>
          <p className="text-slate-500 text-center md:text-right">
            Designed for SIH26130 Industrial Approval System Evaluation. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
