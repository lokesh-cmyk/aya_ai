"use client";

import React, { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  TaskTable,
  CalendarEventCard,
  EmailSummaryCard,
  MeetingSummaryCard,
  SocialPostCard,
  WeatherCard,
} from './generative-ui';

interface GenerativeUIRendererProps {
  content: string;
  className?: string;
}

interface ContentSegment {
  type: 'text' | 'component';
  content: string;
  componentType?: string;
  data?: unknown;
}

// Regex to match :::component{type="..."}\n...\n:::
const COMPONENT_REGEX = /:::component\{type="([^"]+)"\}\s*\n([\s\S]*?)\n:::/g;

function parseContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;

  // Reset regex lastIndex
  COMPONENT_REGEX.lastIndex = 0;

  let match;
  while ((match = COMPONENT_REGEX.exec(content)) !== null) {
    // Text before this component
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index).trim();
      if (textBefore) {
        segments.push({ type: 'text', content: textBefore });
      }
    }

    // The component block
    const componentType = match[1];
    const jsonString = match[2].trim();

    try {
      const data = JSON.parse(jsonString);
      segments.push({
        type: 'component',
        content: '',
        componentType,
        data,
      });
    } catch {
      // If JSON parsing fails, render as text
      segments.push({ type: 'text', content: match[0] });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last component
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex).trim();
    if (remaining) {
      segments.push({ type: 'text', content: remaining });
    }
  }

  return segments;
}

function renderComponent(componentType: string, data: unknown): React.ReactNode {
  switch (componentType) {
    case 'task_table':
      return <TaskTable data={data as any} />;
    case 'calendar_events':
      return <CalendarEventCard data={data as any} />;
    case 'email_summary':
      return <EmailSummaryCard data={data as any} />;
    case 'meeting_summary':
      return <MeetingSummaryCard data={data as any} />;
    case 'social_post':
      return <SocialPostCard data={data as any} />;
    case 'weather_card':
      return <WeatherCard data={data as any} />;
    default:
      return (
        <pre className="text-xs bg-gray-100 rounded p-2 overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      );
  }
}

export const GenerativeUIRenderer = memo(function GenerativeUIRenderer({
  content,
  className = '',
}: GenerativeUIRendererProps) {
  const segments = useMemo(() => parseContent(content), [content]);

  // If no component markers found, render plain markdown
  if (segments.length <= 1 && segments[0]?.type === 'text') {
    return (
      <div className={`prose prose-sm max-w-none text-gray-800 ${className}`}>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {segments.map((segment, i) => {
        if (segment.type === 'text') {
          return (
            <div key={i} className="prose prose-sm max-w-none text-gray-800">
              <ReactMarkdown>{segment.content}</ReactMarkdown>
            </div>
          );
        }

        if (segment.type === 'component' && segment.componentType && segment.data !== undefined) {
          return (
            <React.Fragment key={i}>
              {renderComponent(segment.componentType, segment.data)}
            </React.Fragment>
          );
        }

        return null;
      })}
    </div>
  );
});

export default GenerativeUIRenderer;
