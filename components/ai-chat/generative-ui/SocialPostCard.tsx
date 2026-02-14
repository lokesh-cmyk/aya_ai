"use client";

import React, { memo } from 'react';
import { Instagram, Linkedin, Heart, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SocialPost {
  platform: 'instagram' | 'linkedin';
  content: string;
  date?: string;
  likes?: number | null;
  comments?: number | null;
  imageUrl?: string | null;
}

interface SocialPostCardProps {
  data: SocialPost | SocialPost[];
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export const SocialPostCard = memo(function SocialPostCard({ data }: SocialPostCardProps) {
  const posts = Array.isArray(data) ? data : [data];
  if (posts.length === 0) return null;

  return (
    <div className="space-y-2 my-2">
      {posts.map((post, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="p-3 flex gap-3">
            <div className={cn(
              'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center',
              post.platform === 'instagram' ? 'bg-pink-50' : 'bg-[#0A66C2]/10'
            )}>
              {post.platform === 'instagram' ? (
                <Instagram className="w-4 h-4 text-pink-600" />
              ) : (
                <Linkedin className="w-4 h-4 text-[#0A66C2]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-gray-500 capitalize">{post.platform}</span>
                {post.date && <span className="text-xs text-gray-400">{formatDate(post.date)}</span>}
              </div>
              <p className="text-sm text-gray-700 mt-1 line-clamp-3">{post.content}</p>
              {(post.likes != null || post.comments != null) && (
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  {post.likes != null && (
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {post.likes.toLocaleString()}
                    </span>
                  )}
                  {post.comments != null && (
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {post.comments.toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});
