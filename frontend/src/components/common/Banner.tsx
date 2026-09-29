import React from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PrototypeBanner: React.FC = () => {
  return (
    <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-between border-b border-amber-600">
      <div className="flex items-center space-x-2 max-w-5xl mx-auto w-full justify-center">
        <AlertCircle className="w-4 h-4 shrink-0 text-slate-950" />
        <span>
          <strong>SIH26130 PROTOTYPE SIMULATION:</strong> This is a mock food safety approval portal for hackathon demonstration. It does not connect to or represent official FSSAI / FoSCoS systems.
        </span>
      </div>
      <Link
        to="/api-docs"
        className="hidden md:inline-flex items-center text-xs font-semibold underline hover:text-slate-800 transition"
      >
        <span>Integration API</span>
        <ExternalLink className="w-3 h-3 ml-1" />
      </Link>
    </div>
  );
};
