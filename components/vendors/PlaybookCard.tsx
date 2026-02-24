"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Eye, Zap, ListChecks } from "lucide-react";

interface PlaybookCardProps {
  playbook: any;
  onToggle: (id: string, active: boolean) => void;
  onClick: () => void;
}

const CATEGORY_BADGE_CLASSES: Record<string, string> = {
  SLA_BREACH: "bg-red-100 text-red-700 border-red-200",
  CONTRACT: "bg-blue-100 text-blue-700 border-blue-200",
  DELIVERY: "bg-amber-100 text-amber-700 border-amber-200",
  FINANCIAL: "bg-green-100 text-green-700 border-green-200",
  OPERATIONAL: "bg-purple-100 text-purple-700 border-purple-200",
  SECURITY: "bg-gray-100 text-gray-700 border-gray-200",
};

function formatCategoryLabel(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PlaybookCard({ playbook, onToggle, onClick }: PlaybookCardProps) {
  const categoryClasses =
    CATEGORY_BADGE_CLASSES[playbook.category] || CATEGORY_BADGE_CLASSES.SECURITY;

  const steps = Array.isArray(playbook.steps) ? playbook.steps : [];

  return (
    <Card className="hover:shadow-lg transition-shadow flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold text-gray-900 line-clamp-1">
            {playbook.name}
          </CardTitle>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="outline" className={categoryClasses}>
              {formatCategoryLabel(playbook.category)}
            </Badge>
            <Badge
              variant="outline"
              className={
                playbook.isSystemProvided
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : "bg-teal-50 text-teal-700 border-teal-200"
              }
            >
              {playbook.isSystemProvided ? "System" : "Custom"}
            </Badge>
          </div>
        </div>
        {playbook.description && (
          <CardDescription className="line-clamp-2 mt-1">
            {playbook.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between gap-3 pt-0">
        <div className="space-y-2">
          {/* Trigger condition */}
          {playbook.triggerCondition && (
            <div className="flex items-start gap-2 text-sm text-gray-500">
              <Zap className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
              <span className="line-clamp-1">{playbook.triggerCondition}</span>
            </div>
          )}

          {/* Step count */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ListChecks className="w-3.5 h-3.5 shrink-0" />
            <span>
              {steps.length} step{steps.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Switch
              checked={playbook.isActive}
              onCheckedChange={(checked) => onToggle(playbook.id, checked)}
            />
            <span className="text-xs text-gray-500">
              {playbook.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={onClick}>
            <Eye className="w-3.5 h-3.5 mr-1.5" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
