"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Shield,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const VENDOR_NAV = [
  { label: "Dashboard", href: "/vendors", icon: LayoutDashboard, exact: true },
  { label: "Vendors", href: "/vendors/list", icon: Building2, exact: false },
  { label: "Change Requests", href: "/vendors/change-requests", icon: FileText, exact: false },
  { label: "Risk Heatmap", href: "/vendors/risks", icon: Shield, exact: false },
  { label: "Playbooks", href: "/vendors/playbooks", icon: BookOpen, exact: false },
];

const STORAGE_KEY = "vendor-subnav-collapsed";

export function VendorSubNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      setCollapsed(saved === "true");
    }
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      localStorage.setItem(STORAGE_KEY, String(!prev));
      return !prev;
    });
  };

  const isActive = (item: (typeof VENDOR_NAV)[number]) => {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname?.startsWith(item.href + "/");
  };

  return (
    <div
      className={cn(
        "sticky top-4 self-start shrink-0 transition-all duration-200",
        "bg-white border border-gray-200 rounded-2xl shadow-sm p-1.5",
        collapsed ? "w-[52px]" : "w-[180px]"
      )}
    >
      <nav className="flex flex-col gap-0.5">
        {VENDOR_NAV.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-all",
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon
                className={cn(
                  "w-4 h-4 shrink-0",
                  active ? "text-blue-600" : "text-gray-400"
                )}
              />
              {!collapsed && (
                <span className="truncate text-xs">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 mt-1 pt-1">
        <button
          onClick={toggle}
          className={cn(
            "flex items-center w-full rounded-xl px-2.5 py-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all",
            collapsed ? "justify-center" : "justify-start"
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <>
              <ChevronLeft className="w-3.5 h-3.5 mr-1.5" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
