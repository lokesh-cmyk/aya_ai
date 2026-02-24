"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { VendorDetailView } from "@/components/vendors/VendorDetailView";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

function DetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-start gap-4">
        <Skeleton className="w-10 h-10 rounded" />
        <div className="flex items-center gap-4 flex-1">
          <Skeleton className="w-14 h-14 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <Skeleton className="h-10 w-96" />

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-5 w-28" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VendorDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["vendor", id],
    queryFn: async () => {
      const res = await fetch(`/api/vendors/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Vendor not found");
        throw new Error("Failed to fetch vendor");
      }
      return res.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (error || !data?.vendor) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-red-50 rounded-full mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {error?.message === "Vendor not found"
                ? "Vendor Not Found"
                : "Failed to Load Vendor"}
            </h3>
            <p className="text-gray-500 text-center max-w-md mb-6">
              {error?.message === "Vendor not found"
                ? "The vendor you are looking for does not exist or you do not have access to it."
                : "There was an error loading the vendor details. Please try again."}
            </p>
            <Link href="/vendors/list">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Vendor List
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <VendorDetailView vendor={data.vendor} />;
}
