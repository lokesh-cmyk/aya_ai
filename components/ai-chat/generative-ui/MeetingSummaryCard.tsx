"use client";

import React, { memo } from 'react';
import { Video, Users, CheckSquare, Tag } from 'lucide-react';

interface MeetingItem {
  title: string;
  date: string;
  duration?: number | null;
  participants?: string[];
  summary?: string;
  actionItems?: Array<{ task: string; owner?: string | null }>;
  keyTopics?: string[];
}

interface MeetingSummaryCardProps {
  data: MeetingItem | MeetingItem[];
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export const MeetingSummaryCard = memo(function MeetingSummaryCard({ data }: MeetingSummaryCardProps) {
  const meetings = Array.isArray(data) ? data : [data];
  if (meetings.length === 0) return null;

  return (
    <div className="space-y-2 my-2">
      {meetings.map((meeting, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          {/* Header */}
          <div className="p-3 flex gap-3 border-b border-gray-100">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Video className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-sm">{meeting.title}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                <span>{formatDate(meeting.date)}</span>
                {meeting.duration && <span>{meeting.duration} min</span>}
              </div>
            </div>
          </div>

          {/* Participants */}
          {meeting.participants && meeting.participants.length > 0 && (
            <div className="px-3 py-2 border-b border-gray-100 flex items-start gap-2">
              <Users className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-600">{meeting.participants.join(', ')}</p>
            </div>
          )}

          {/* Summary */}
          {meeting.summary && (
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-sm text-gray-700 leading-relaxed">{meeting.summary}</p>
            </div>
          )}

          {/* Action Items */}
          {meeting.actionItems && meeting.actionItems.length > 0 && (
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="flex items-center gap-1.5 mb-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Action Items</span>
              </div>
              <ul className="space-y-1">
                {meeting.actionItems.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                    <span className="text-gray-700">
                      {item.task}
                      {item.owner && <span className="text-gray-400 ml-1">({item.owner})</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Topics */}
          {meeting.keyTopics && meeting.keyTopics.length > 0 && (
            <div className="px-3 py-2">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Tag className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Key Topics</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {meeting.keyTopics.map((topic, j) => (
                  <span key={j} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
});
