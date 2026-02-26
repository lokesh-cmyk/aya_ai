"use client";

import Link from "next/link";
import { ChevronRight, Library } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface KBBreadcrumbProps {
  items: BreadcrumbItem[];
}

export function KBBreadcrumb({ items }: KBBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1 text-sm">
      <Link
        href="/knowledge-base"
        className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 transition-colors"
      >
        <Library className="w-3.5 h-3.5" />
        <span>Knowledge Base</span>
      </Link>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3 text-gray-300" />
            {isLast || !item.href ? (
              <span className="text-gray-900 font-medium truncate max-w-[200px]">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-gray-500 hover:text-blue-600 transition-colors truncate max-w-[200px]"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
