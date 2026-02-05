"use client";

import { useState } from "react";
import {
  Sparkles,
  ListTodo,
  MessageSquare,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Users,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Target,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";

interface Insight {
  id: string;
  type: string;
  content: string;
  parsedContent?: unknown;
  confidence?: number | null;
}

interface InsightsPanelProps {
  insights: Insight[];
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

const insightConfig: Record<
  string,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  summary: {
    label: "Summary",
    icon: <Sparkles className="w-4 h-4" />,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  key_topics: {
    label: "Key Topics",
    icon: <MessageSquare className="w-4 h-4" />,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  action_items: {
    label: "Action Items",
    icon: <ListTodo className="w-4 h-4" />,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  decisions: {
    label: "Decisions",
    icon: <CheckCircle className="w-4 h-4" />,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  follow_up_questions: {
    label: "Follow-ups",
    icon: <HelpCircle className="w-4 h-4" />,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
  },
  sentiment: {
    label: "Sentiment",
    icon: <TrendingUp className="w-4 h-4" />,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
  },
  participation_summary: {
    label: "Participation",
    icon: <Users className="w-4 h-4" />,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
  },
};

// Compact list item component
function ListItem({
  children,
  icon,
  index,
  bgColor,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  index?: number;
  bgColor?: string;
}) {
  return (
    <div className={`flex items-start gap-2.5 py-2 px-3 rounded-lg ${bgColor || "bg-gray-50"}`}>
      {index !== undefined ? (
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-xs font-medium flex items-center justify-center">
          {index + 1}
        </span>
      ) : icon ? (
        <span className="flex-shrink-0 mt-0.5">{icon}</span>
      ) : null}
      <span className="text-sm text-gray-700 leading-relaxed">{children}</span>
    </div>
  );
}

// Collapsible section for list-type insights
function CollapsibleSection({
  title,
  icon,
  items,
  color,
  bgColor,
  borderColor,
  defaultOpen = false,
  renderItem,
}: {
  title: string;
  icon: React.ReactNode;
  items: unknown[];
  color: string;
  bgColor: string;
  borderColor: string;
  defaultOpen?: boolean;
  renderItem: (item: unknown, index: number) => React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!items || items.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={`w-full flex items-center justify-between p-3 rounded-lg border ${borderColor} ${bgColor} hover:brightness-95 transition-all`}
        >
          <div className="flex items-center gap-2">
            <span className={color}>{icon}</span>
            <span className={`font-medium text-sm ${color}`}>{title}</span>
            <Badge variant="secondary" className="text-xs bg-white/60">
              {items.length}
            </Badge>
          </div>
          {isOpen ? (
            <ChevronDown className={`w-4 h-4 ${color}`} />
          ) : (
            <ChevronRight className={`w-4 h-4 ${color}`} />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-1.5 pl-1">
          {items.map((item, index) => renderItem(item, index))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function InsightsPanel({
  insights,
  onRegenerate,
  isRegenerating = false,
}: InsightsPanelProps) {
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Extract insights by type
  const summary = insights.find((i) => i.type === "summary");
  const keyTopics = insights.find((i) => i.type === "key_topics");
  const actionItems = insights.find((i) => i.type === "action_items");
  const decisions = insights.find((i) => i.type === "decisions");
  const followUps = insights.find((i) => i.type === "follow_up_questions");
  const sentiment = insights.find((i) => i.type === "sentiment");
  const participation = insights.find((i) => i.type === "participation_summary");

  const copySummary = async () => {
    if (summary) {
      const text = String(summary.parsedContent || summary.content);
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
      toast.success("Summary copied");
    }
  };

  if (insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-violet-100 flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-purple-400" />
        </div>
        <p className="font-semibold text-gray-900 mb-1">No insights yet</p>
        <p className="text-sm text-gray-500 mb-4 max-w-xs">
          AI insights will be generated after the meeting is completed.
        </p>
        {onRegenerate && (
          <Button
            onClick={onRegenerate}
            disabled={isRegenerating}
            size="sm"
            className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600"
          >
            {isRegenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Generate Insights
          </Button>
        )}
      </div>
    );
  }

  // Helper to safely parse JSON content that might be a string or already parsed
  // Tries parsedContent first, then falls back to raw content field
  const safeParseArray = <T,>(insight: Insight | undefined): T[] => {
    if (!insight) return [];

    // First try parsedContent (might already be an array from API)
    const content = insight.parsedContent ?? insight.content;

    if (Array.isArray(content)) return content as T[];
    if (typeof content === 'string' && content.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) return parsed as T[];
      } catch {
        // Not valid JSON, return empty
      }
    }
    return [];
  };

  // Get parsed content arrays with proper type safety
  const topicsArray = safeParseArray<string>(keyTopics);
  const actionItemsArray = safeParseArray<{ task?: string; owner?: string; deadline?: string }>(actionItems);
  const decisionsArray = safeParseArray<string>(decisions);
  const followUpsArray = safeParseArray<string>(followUps);
  const sentimentValue = String(sentiment?.parsedContent || sentiment?.content || "").toLowerCase();

  const sentimentConfig: Record<string, { color: string; bg: string; label: string }> = {
    positive: { color: "text-green-700", bg: "bg-green-100", label: "Positive" },
    neutral: { color: "text-gray-700", bg: "bg-gray-100", label: "Neutral" },
    negative: { color: "text-red-700", bg: "bg-red-100", label: "Negative" },
  };
  const sConfig = sentimentConfig[sentimentValue] || sentimentConfig.neutral;

  return (
    <div className="space-y-4">
      {/* Header with regenerate button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-gray-700">
            {insights.length} insight{insights.length !== 1 ? "s" : ""}
          </span>
        </div>
        {onRegenerate && (
          <Button
            onClick={onRegenerate}
            disabled={isRegenerating}
            variant="ghost"
            size="sm"
            className="gap-1.5 h-8 text-xs"
          >
            {isRegenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Regenerate
          </Button>
        )}
      </div>

      {/* Quick Stats Row */}
      <div className="flex flex-wrap items-center gap-2">
        {sentiment && (
          <Badge className={`${sConfig.bg} ${sConfig.color} border-0`}>
            <TrendingUp className="w-3 h-3 mr-1" />
            {sConfig.label}
          </Badge>
        )}
        {topicsArray.length > 0 && (
          <>
            {topicsArray.slice(0, 4).map((topic, i) => (
              <Badge key={i} variant="secondary" className="bg-blue-50 text-blue-700 border-0">
                {String(topic)}
              </Badge>
            ))}
            {topicsArray.length > 4 && (
              <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-0">
                +{topicsArray.length - 4} more
              </Badge>
            )}
          </>
        )}
      </div>

      {/* Summary Section - Always visible */}
      {summary && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-purple-700 text-sm">Summary</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-purple-400 hover:text-purple-600"
              onClick={copySummary}
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            {String(summary.parsedContent || summary.content)}
          </p>
        </div>
      )}

      {/* Collapsible Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Action Items */}
        {actionItemsArray.length > 0 && (
          <div className="md:col-span-2">
            <CollapsibleSection
              title="Action Items"
              icon={<ListTodo className="w-4 h-4" />}
              items={actionItemsArray}
              color="text-orange-600"
              bgColor="bg-orange-50"
              borderColor="border-orange-200"
              defaultOpen={true}
              renderItem={(item, index) => {
                const actionItem = item as { task?: string; owner?: string; deadline?: string };
                return (
                  <div key={index} className="flex items-start gap-2.5 py-2 px-3 rounded-lg bg-orange-50/50">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-200 text-orange-700 text-xs font-medium flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700">{actionItem.task}</p>
                      {(actionItem.owner || actionItem.deadline) && (
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          {actionItem.owner && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" /> {actionItem.owner}
                            </span>
                          )}
                          {actionItem.deadline && (
                            <span className="flex items-center gap-1">
                              <Target className="w-3 h-3" /> {actionItem.deadline}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            />
          </div>
        )}

        {/* Decisions */}
        {decisionsArray.length > 0 && (
          <CollapsibleSection
            title="Decisions"
            icon={<CheckCircle className="w-4 h-4" />}
            items={decisionsArray}
            color="text-green-600"
            bgColor="bg-green-50"
            borderColor="border-green-200"
            defaultOpen={decisionsArray.length <= 3}
            renderItem={(item, index) => (
              <ListItem
                key={index}
                icon={<CheckCircle className="w-4 h-4 text-green-500" />}
                bgColor="bg-green-50/50"
              >
                {String(item)}
              </ListItem>
            )}
          />
        )}

        {/* Follow-up Questions */}
        {followUpsArray.length > 0 && (
          <CollapsibleSection
            title="Follow-ups"
            icon={<HelpCircle className="w-4 h-4" />}
            items={followUpsArray}
            color="text-yellow-600"
            bgColor="bg-yellow-50"
            borderColor="border-yellow-200"
            defaultOpen={followUpsArray.length <= 3}
            renderItem={(item, index) => (
              <ListItem
                key={index}
                icon={<HelpCircle className="w-4 h-4 text-yellow-500" />}
                bgColor="bg-yellow-50/50"
              >
                {String(item)}
              </ListItem>
            )}
          />
        )}
      </div>

      {/* Participation Summary - Compact */}
      {participation && (
        <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
          <div className="flex items-center gap-2 mb-1.5">
            <Users className="w-4 h-4 text-indigo-600" />
            <span className="font-medium text-indigo-700 text-sm">Participation</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            {String(participation.parsedContent || participation.content)}
          </p>
        </div>
      )}
    </div>
  );
}
