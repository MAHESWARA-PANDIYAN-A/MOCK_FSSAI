import React from 'react';
import { DocumentReviewStatus } from '../../types';

interface DocumentStatusBadgeProps {
  status: DocumentReviewStatus | 'NOT_UPLOADED';
}

export const DocumentStatusBadge: React.FC<DocumentStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'ACCEPTED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <span className="w-1.5 h-1.5 mr-1.5 bg-emerald-600 rounded-full"></span>
          Accepted
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
          <span className="w-1.5 h-1.5 mr-1.5 bg-rose-600 rounded-full"></span>
          Rejected
        </span>
      );
    case 'NEEDS_CORRECTION':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
          <span className="w-1.5 h-1.5 mr-1.5 bg-amber-600 rounded-full animate-pulse"></span>
          Needs Correction
        </span>
      );
    case 'PENDING_REVIEW':
    case 'UPLOADED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
          <span className="w-1.5 h-1.5 mr-1.5 bg-blue-600 rounded-full"></span>
          Uploaded / Under Review
        </span>
      );
    case 'NOT_UPLOADED':
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-300">
          Not Uploaded
        </span>
      );
  }
};
