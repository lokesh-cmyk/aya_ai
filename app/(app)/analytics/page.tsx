import { Suspense } from "react";
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';

// Note: With cacheComponents enabled, ISR is handled via fetch options (next: { revalidate })
// in the components themselves, not via route segment config

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4 animate-pulse"></div>
          <div className="h-96 bg-gray-100 rounded-lg animate-pulse"></div>
        </div>
      }
    >
      <AnalyticsDashboard />
    </Suspense>
  );
}

