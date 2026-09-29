import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, User, Mail, Phone, Lock, AlertCircle, Sparkles } from 'lucide-react';

export const ApplicantAuthPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('rahul@example.com');
  const [mobile, setMobile] = useState<string>('9876543210');
  const [password, setPassword] = useState<string>('Password123!');
  const [confirmPassword, setConfirmPassword] = useState<string>('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleAutofillDemo = () => {
    setIsRegister(false);
    setEmail('rahul@example.com');
    setPassword('Password123!');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setIsLoading(false);
          return;
        }
        await register(name, email, mobile, password, confirmPassword);
      } else {
        await login(email, password, 'APPLICANT');
      }

      // Check if there was a redirect path
      const from = (location.state as any)?.from?.pathname || '/applicant/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-100">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gov-900 px-6 py-6 text-white text-center">
          <div className="inline-flex p-2 bg-white/10 rounded-full mb-2">
            <ShieldCheck className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold">Food Business Operator Portal</h2>
          <p className="text-xs text-slate-300 mt-1">
            {isRegister ? 'Register as Food Business Operator' : 'Sign in to access and track your applications'}
          </p>
        </div>

        {/* Demo Helper Banner */}
        <div className="bg-amber-50 border-b border-amber-200 p-3 px-6 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span><strong>Demo User:</strong> Rahul Kumar</span>
          </div>
          <button
            type="button"
            onClick={handleAutofillDemo}
            className="text-xs font-bold underline text-gov-700 hover:text-gov-900"
          >
            Auto-fill Credentials
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 text-sm font-semibold">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(null); }}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              !isRegister
                ? 'border-gov-700 text-gov-800 bg-slate-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Applicant Login
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(null); }}
            className={`flex-1 py-3 text-center border-b-2 transition ${
              isRegister
                ? 'border-gov-700 text-gov-800 bg-slate-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            New Registration
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name / Authorized Person</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Kumar"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-gov-700 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. rahul@example.com"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-gov-700 focus:outline-none"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number (10 Digits)</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="9876543210"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-gov-700 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-gov-700 focus:outline-none"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-gov-700 focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-gov-800 hover:bg-gov-700 text-white font-bold rounded shadow-sm text-sm transition disabled:opacity-50 mt-2"
          >
            {isLoading ? 'Processing...' : (isRegister ? 'Complete Registration' : 'Sign In')}
          </button>
        </form>
      </div>
    </div>
  );
};
