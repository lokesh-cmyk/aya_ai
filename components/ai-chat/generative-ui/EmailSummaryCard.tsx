"use client";

import React, { memo } from 'react';
import { Mail, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmailItem {
  from: string;
  subject: string;
  snippet?: string;
  date?: string;
  isUrgent?: boolean;
}

interface EmailSummaryCardProps {
  data: EmailItem | EmailItem[];
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export const EmailSummaryCard = memo(function EmailSummaryCard({ data }: EmailSummaryCardProps) {
  const emails = Array.isArray(data) ? data : [data];
  if (emails.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden my-2">
      {emails.map((email, i) => (
        <div key={i} className={cn('p-3 flex gap-3', email.isUrgent && 'bg-red-50/50')}>
          <div className={cn(
            'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
            email.isUrgent ? 'bg-red-100' : 'bg-gray-100'
          )}>
            {email.isUrgent ? (
              <AlertCircle className="w-4 h-4 text-red-600" />
            ) : (
              <Mail className="w-4 h-4 text-gray-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-gray-800 text-sm truncate">{email.from}</p>
              {email.date && <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(email.date)}</span>}
            </div>
            <p className="text-sm text-gray-700 truncate">{email.subject}</p>
            {email.snippet && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{email.snippet}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
});
