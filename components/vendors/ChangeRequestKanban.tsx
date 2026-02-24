"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChangeRequestCard } from "@/components/vendors/ChangeRequestCard";
import { ChangeRequestDetail } from "@/components/vendors/ChangeRequestDetail";

interface ChangeRequestKanbanProps {
  changeRequests: any[];
  onRefresh: () => void;
}

const COLUMNS = [
  {
    key: "DRAFT",
    label: "Draft",
    headerBg: "bg-gray-100",
    headerText: "text-gray-700",
    borderColor: "border-gray-300",
    countBg: "bg-gray-200 text-gray-700",
  },
  {
    key: "SUBMITTED",
    label: "Submitted",
    headerBg: "bg-blue-50",
    headerText: "text-blue-700",
    borderColor: "border-blue-300",
    countBg: "bg-blue-100 text-blue-700",
  },
  {
    key: "UNDER_REVIEW",
    label: "Under Review",
    headerBg: "bg-amber-50",
    headerText: "text-amber-700",
    borderColor: "border-amber-300",
    countBg: "bg-amber-100 text-amber-700",
  },
  {
    key: "APPROVED",
    label: "Approved",
    headerBg: "bg-green-50",
    headerText: "text-green-700",
    borderColor: "border-green-300",
    countBg: "bg-green-100 text-green-700",
  },
  {
    key: "REJECTED",
    label: "Rejected",
    headerBg: "bg-red-50",
    headerText: "text-red-700",
    borderColor: "border-red-300",
    countBg: "bg-red-100 text-red-700",
  },
  {
    key: "IMPLEMENTED",
    label: "Implemented",
    headerBg: "bg-purple-50",
    headerText: "text-purple-700",
    borderColor: "border-purple-300",
    countBg: "bg-purple-100 text-purple-700",
  },
];

export function ChangeRequestKanban({
  changeRequests,
  onRefresh,
}: ChangeRequestKanbanProps) {
  const [selectedCR, setSelectedCR] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleCardClick = (cr: any) => {
    setSelectedCR(cr);
    setDetailOpen(true);
  };

  const handleDetailClose = (open: boolean) => {
    setDetailOpen(open);
    if (!open) {
      setSelectedCR(null);
    }
  };

  // Group change requests by status
  const grouped: Record<string, any[]> = {};
  for (const col of COLUMNS) {
    grouped[col.key] = [];
  }
  for (const cr of changeRequests) {
    if (grouped[cr.status]) {
      grouped[cr.status].push(cr);
    } else {
      // Fallback: put unknown statuses in DRAFT
      grouped["DRAFT"].push(cr);
    }
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const items = grouped[col.key];
          return (
            <div
              key={col.key}
              className="flex-shrink-0 w-[280px] flex flex-col"
            >
              {/* Column header */}
              <div
                className={`flex items-center justify-between px-3 py-2.5 rounded-t-lg border-b-2 ${col.headerBg} ${col.borderColor}`}
              >
                <span
                  className={`text-sm font-semibold ${col.headerText}`}
                >
                  {col.label}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${col.countBg}`}
                >
                  {items.length}
                </span>
              </div>

              {/* Column body */}
              <ScrollArea className="flex-1 min-h-[200px] max-h-[calc(100vh-320px)]">
                <div className="space-y-2 p-2 bg-gray-50/50 rounded-b-lg border border-t-0 border-gray-200 min-h-[200px]">
                  {items.length === 0 ? (
                    <div className="flex items-center justify-center h-[180px]">
                      <p className="text-xs text-gray-400">No items</p>
                    </div>
                  ) : (
                    items.map((cr) => (
                      <ChangeRequestCard
                        key={cr.id}
                        changeRequest={cr}
                        onClick={() => handleCardClick(cr)}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>

      {/* Detail dialog */}
      {selectedCR && (
        <ChangeRequestDetail
          changeRequest={selectedCR}
          open={detailOpen}
          onOpenChange={handleDetailClose}
          onUpdate={onRefresh}
        />
      )}
    </>
  );
}
