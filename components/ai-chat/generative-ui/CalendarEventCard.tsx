"use client";

import React, { memo } from 'react';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';

interface CalendarEvent {
  title: string;
  start: string;
  end?: string;
  location?: string | null;
  attendees?: string[];
  description?: string | null;
}

interface CalendarEventCardProps {
  data: CalendarEvent | CalendarEvent[];
}

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getDuration(start: string, end?: string): string | null {
  if (!end) return null;
  try {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remaining = mins % 60;
    return remaining > 0 ? `${hrs}h ${remaining}m` : `${hrs}h`;
  } catch {
    return null;
  }
}

export const CalendarEventCard = memo(function CalendarEventCard({ data }: CalendarEventCardProps) {
  const events = Array.isArray(data) ? data : [data];
  if (events.length === 0) return null;

  return (
    <div className="space-y-2 my-2">
      {events.map((event, i) => {
        const duration = getDuration(event.start, event.end);
        return (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-3 flex gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-sm truncate">{event.title}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
                <span>{formatDate(event.start)} at {formatTime(event.start)}</span>
                {duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {duration}
                  </span>
                )}
              </div>
              {event.location && (
                <p className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{event.location}</span>
                </p>
              )}
              {event.attendees && event.attendees.length > 0 && (
                <p className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                  <Users className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{event.attendees.join(', ')}</span>
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});
