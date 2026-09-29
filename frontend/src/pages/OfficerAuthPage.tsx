import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, AlertCircle, Sparkles } from 'lucide-react';

export const OfficerAuthPage: React.FC = () => {
  const [email, setEmail] = useState<string>('officer.meena@fssai.gov.in');
  const [password, setPassword] = useState<string>('Officer123!');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleAutofillOfficer = () => {
    setEmail('officer.meena@fssai.gov.in');
    setPassword('Officer123!');
    setError(null);
  };

  const handleAutofillAdmin = () => {
    setEmail('admin@fssai.gov.in');
    setPassword('Admin123!');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      // If admin, navigate to admin dashboard, else officer dashboard
      if (email.includes('admin')) {
        navigate('/admin/dashboard');
      } else {
        navigate('/officer/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify officer credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-900">
      <div className="max-w-md w-full bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden text-slate-100">
        {/* Header */}
        <div className="bg-slate-950 px-6 py-6 text-center border-b border-slate-700">
          <div className="inline-flex p-3 bg-gov-700/30 rounded-full mb-2 border border-gov-500/40">
            <Shield className="w-8 h-8 text-gov-500" />
          </div>
          <h2 className="text-xl font-bold text-white">FSSAI Officer Portal</h2>
          <p className="text-xs text-amber-400 font-medium mt-1">
            Simulated Departmental Scrutiny & Licensing Environment
          </p>
        </div>

        {/* Quick Autofill Buttons */}
        <div className="p-3 px-6 bg-slate-950/60 border-b border-slate-700 text-xs flex items-center justify-between">
          <span className="text-slate-400 font-medium">Quick Demo Accounts:</span>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleAutofillOfficer}
              className="px-2 py-1 bg-gov-700/80 hover:bg-gov-600 text-white rounded font-semibold text-[11px] transition"
            >
              Officer Meena
            </button>
            <button
              type="button"
              onClick={handleAutofillAdmin}
              className="px-2 py-1 bg-purple-700/80 hover:bg-purple-600 text-white rounded font-semibold text-[11px] transition"
            >
              Admin Officer
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-lg text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Official Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer.meena@fssai.gov.in"
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-white focus:ring-2 focus:ring-gov-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-white focus:ring-2 focus:ring-gov-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-gov-700 hover:bg-gov-600 text-white font-bold rounded shadow-lg text-sm transition disabled:opacity-50 mt-2"
          >
            {isLoading ? 'Verifying...' : 'Authenticate & Enter Portal'}
          </button>
        </form>
      </div>
    </div>
  );
};
