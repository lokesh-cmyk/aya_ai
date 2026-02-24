"use client";

import { cn } from "@/lib/utils";

interface Risk {
  id: string;
  title: string;
  probability: number;
  impact: number;
  riskScore: number;
  category: string;
  status: string;
}

interface RiskHeatmapProps {
  risks: Risk[];
  selectedCell?: { probability: number; impact: number };
  onCellClick: (probability: number, impact: number) => void;
}

const PROBABILITY_LABELS = [
  { value: 5, label: "Almost Certain" },
  { value: 4, label: "Likely" },
  { value: 3, label: "Possible" },
  { value: 2, label: "Unlikely" },
  { value: 1, label: "Rare" },
];

const IMPACT_LABELS = [
  { value: 1, label: "Negligible" },
  { value: 2, label: "Minor" },
  { value: 3, label: "Moderate" },
  { value: 4, label: "Major" },
  { value: 5, label: "Catastrophic" },
];

const CATEGORY_COLORS: Record<string, string> = {
  SLA_BREACH: "bg-red-500",
  CONTRACT: "bg-blue-500",
  DELIVERY: "bg-amber-500",
  FINANCIAL: "bg-green-500",
  OPERATIONAL: "bg-purple-500",
  SECURITY: "bg-rose-600",
};

function getCellColor(score: number): string {
  if (score >= 15) return "bg-red-100 hover:bg-red-200";
  if (score >= 8) return "bg-orange-100 hover:bg-orange-200";
  if (score >= 4) return "bg-yellow-100 hover:bg-yellow-200";
  return "bg-green-100 hover:bg-green-200";
}

function getCellBorderColor(score: number): string {
  if (score >= 15) return "border-red-300";
  if (score >= 8) return "border-orange-300";
  if (score >= 4) return "border-yellow-300";
  return "border-green-300";
}

export function RiskHeatmap({
  risks,
  selectedCell,
  onCellClick,
}: RiskHeatmapProps) {
  // Group risks by cell coordinates
  const risksByCell = new Map<string, Risk[]>();
  for (const risk of risks) {
    const key = `${risk.probability}-${risk.impact}`;
    if (!risksByCell.has(key)) {
      risksByCell.set(key, []);
    }
    risksByCell.get(key)!.push(risk);
  }

  return (
    <div className="w-full">
      {/* Grid container with axis labels */}
      <div className="flex">
        {/* Y-axis label */}
        <div className="flex items-center justify-center w-8 shrink-0">
          <span className="text-xs font-semibold text-gray-500 -rotate-90 whitespace-nowrap">
            Probability
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Grid with row labels */}
          <div className="grid grid-cols-[120px_repeat(5,1fr)] gap-1">
            {/* Empty top-left corner */}
            <div />
            {/* Impact column headers */}
            {IMPACT_LABELS.map((impact) => (
              <div
                key={impact.value}
                className="text-center text-xs font-medium text-gray-600 pb-2 px-1"
              >
                <div>{impact.value}</div>
                <div className="text-[10px] text-gray-400 truncate">
                  {impact.label}
                </div>
              </div>
            ))}

            {/* Rows: probability 5 down to 1 */}
            {PROBABILITY_LABELS.map((prob) => (
              <>
                {/* Row label */}
                <div
                  key={`label-${prob.value}`}
                  className="flex items-center justify-end pr-3 text-xs font-medium text-gray-600"
                >
                  <div className="text-right">
                    <div>{prob.value}</div>
                    <div className="text-[10px] text-gray-400">
                      {prob.label}
                    </div>
                  </div>
                </div>

                {/* Cells for each impact level */}
                {IMPACT_LABELS.map((impact) => {
                  const score = prob.value * impact.value;
                  const cellKey = `${prob.value}-${impact.value}`;
                  const cellRisks = risksByCell.get(cellKey) || [];
                  const isSelected =
                    selectedCell?.probability === prob.value &&
                    selectedCell?.impact === impact.value;
                  const maxVisibleDots = 5;
                  const overflowCount = Math.max(
                    0,
                    cellRisks.length - maxVisibleDots
                  );

                  return (
                    <button
                      key={cellKey}
                      type="button"
                      onClick={() => onCellClick(prob.value, impact.value)}
                      className={cn(
                        "relative flex flex-col items-center justify-center min-h-[72px] rounded-lg border-2 transition-all cursor-pointer",
                        getCellColor(score),
                        isSelected
                          ? "border-blue-600 ring-2 ring-blue-300 shadow-md"
                          : getCellBorderColor(score)
                      )}
                    >
                      {/* Score label */}
                      <span className="text-[10px] font-medium text-gray-500 absolute top-1 right-1.5">
                        {score}
                      </span>

                      {/* Risk count */}
                      {cellRisks.length > 0 && (
                        <span className="text-sm font-bold text-gray-800 mb-1">
                          {cellRisks.length}
                        </span>
                      )}

                      {/* Risk dots */}
                      {cellRisks.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-0.5 px-1">
                          {cellRisks.slice(0, maxVisibleDots).map((risk) => (
                            <div
                              key={risk.id}
                              className={cn(
                                "w-2 h-2 rounded-full",
                                CATEGORY_COLORS[risk.category] || "bg-gray-400"
                              )}
                              title={`${risk.title} (${risk.category})`}
                            />
                          ))}
                          {overflowCount > 0 && (
                            <span className="text-[9px] text-gray-600 font-medium ml-0.5">
                              +{overflowCount}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </>
            ))}
          </div>

          {/* X-axis label */}
          <div className="text-center mt-3">
            <span className="text-xs font-semibold text-gray-500">Impact</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-gray-200">
        <span className="text-xs font-medium text-gray-500">Categories:</span>
        {Object.entries(CATEGORY_COLORS).map(([category, colorClass]) => (
          <div key={category} className="flex items-center gap-1.5">
            <div className={cn("w-2.5 h-2.5 rounded-full", colorClass)} />
            <span className="text-xs text-gray-600">
              {category.replace(/_/g, " ")}
            </span>
          </div>
        ))}
      </div>

      {/* Score ranges legend */}
      <div className="flex flex-wrap items-center gap-4 mt-2">
        <span className="text-xs font-medium text-gray-500">Risk Level:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded bg-green-100 border border-green-300" />
          <span className="text-xs text-gray-600">Low (1-3)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded bg-yellow-100 border border-yellow-300" />
          <span className="text-xs text-gray-600">Medium (4-6)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded bg-orange-100 border border-orange-300" />
          <span className="text-xs text-gray-600">High (8-12)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-3 rounded bg-red-100 border border-red-300" />
          <span className="text-xs text-gray-600">Critical (15-25)</span>
        </div>
      </div>
    </div>
  );
}
