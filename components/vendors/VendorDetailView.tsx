"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { VendorStatusBadge } from "@/components/vendors/VendorStatusBadge";
import { VendorSLAList } from "@/components/vendors/VendorSLAList";
import { VendorChangeRequests } from "@/components/vendors/VendorChangeRequests";
import { VendorRisks } from "@/components/vendors/VendorRisks";
import {
  ArrowLeft,
  Globe,
  Calendar,
  DollarSign,
  User,
  Phone,
  Mail,
  Star,
  Plus,
  Loader2,
  ShieldCheck,
  FileText,
  Shield,
  Info,
  RefreshCw,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";

interface VendorDetailViewProps {
  vendor: any;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(value: number | null): string {
  if (value == null) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function getDaysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getRenewalCountdown(dateStr: string | null): {
  text: string;
  className: string;
} | null {
  const days = getDaysUntil(dateStr);
  if (days === null) return null;
  if (days < 0) {
    return {
      text: `${Math.abs(days)} days overdue`,
      className: "text-red-600 font-medium",
    };
  }
  if (days < 7) {
    return {
      text: `${days} days remaining`,
      className: "text-red-600 font-medium",
    };
  }
  if (days < 30) {
    return {
      text: `${days} days remaining`,
      className: "text-amber-600 font-medium",
    };
  }
  return {
    text: `${days} days remaining`,
    className: "text-green-600",
  };
}

function formatRenewalType(type: string | null): string {
  if (!type) return "--";
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function formatBillingCycle(cycle: string | null): string {
  if (!cycle) return "--";
  return cycle.charAt(0) + cycle.slice(1).toLowerCase();
}

const categoryGradients: Record<string, string> = {
  SaaS: "from-blue-500 to-cyan-500",
  Consulting: "from-purple-500 to-pink-500",
  Infrastructure: "from-orange-500 to-red-500",
  Hardware: "from-slate-500 to-gray-600",
  Services: "from-green-500 to-emerald-500",
  Other: "from-indigo-500 to-violet-500",
};

export function VendorDetailView({ vendor }: VendorDetailViewProps) {
  const queryClient = useQueryClient();
  const [showAddContactDialog, setShowAddContactDialog] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    isPrimary: false,
  });

  const gradient =
    categoryGradients[vendor.category] || categoryGradients.Other;

  const renewalCountdown = getRenewalCountdown(vendor.renewalDate);

  const addContactMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      phone: string;
      role: string;
      isPrimary: boolean;
    }) => {
      const res = await fetch(`/api/vendors/${vendor.id}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add contact");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor", vendor.id] });
      setShowAddContactDialog(false);
      setContactForm({
        name: "",
        email: "",
        phone: "",
        role: "",
        isPrimary: false,
      });
      toast.success("Contact added successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name) {
      toast.error("Name is required");
      return;
    }
    addContactMutation.mutate(contactForm);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-start gap-4">
        <Link href="/vendors/list">
          <Button variant="ghost" size="icon" className="mt-1">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-4 flex-1">
          <div
            className={`w-14 h-14 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-semibold text-xl shrink-0`}
          >
            {vendor.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                {vendor.name}
              </h1>
              <VendorStatusBadge status={vendor.status || "ACTIVE"} />
            </div>
            <p className="text-sm text-gray-500">
              {vendor.category || "Uncategorized"}
              {vendor.website && (
                <>
                  {" "}
                  &middot;{" "}
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    <Globe className="w-3 h-3" />
                    {new URL(vendor.website).hostname}
                  </a>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      {vendor.description && (
        <p className="text-sm text-gray-600 ml-[4.5rem]">
          {vendor.description}
        </p>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <Info className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="slas" className="gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            SLAs
            {vendor.slas?.length > 0 && (
              <Badge
                variant="secondary"
                className="text-xs ml-1 bg-blue-100 text-blue-700"
              >
                {vendor.slas.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="change-requests" className="gap-1.5">
            <FileText className="w-4 h-4" />
            Change Requests
            {vendor.changeRequests?.length > 0 && (
              <Badge
                variant="secondary"
                className="text-xs ml-1 bg-amber-100 text-amber-700"
              >
                {vendor.changeRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="risks" className="gap-1.5">
            <Shield className="w-4 h-4" />
            Risks
            {vendor.risks?.length > 0 && (
              <Badge
                variant="secondary"
                className="text-xs ml-1 bg-red-100 text-red-700"
              >
                {vendor.risks.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contract Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="w-5 h-5 text-gray-500" />
                  Contract Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
                        Start Date
                      </p>
                      <p className="text-sm text-gray-900">
                        {formatDate(vendor.contractStart)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
                        End Date
                      </p>
                      <p className="text-sm text-gray-900">
                        {formatDate(vendor.contractEnd)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
                        Renewal Date
                      </p>
                      <div>
                        <p className="text-sm text-gray-900">
                          {formatDate(vendor.renewalDate)}
                        </p>
                        {renewalCountdown && (
                          <p className={`text-xs mt-0.5 ${renewalCountdown.className}`}>
                            {renewalCountdown.text}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
                        Renewal Type
                      </p>
                      <div className="flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-sm text-gray-900">
                          {formatRenewalType(vendor.renewalType)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
                        Billing Cycle
                      </p>
                      <p className="text-sm text-gray-900">
                        {formatBillingCycle(vendor.billingCycle)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
                        Contract Value
                      </p>
                      <p className="text-sm text-gray-900 font-medium flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                        {formatCurrency(vendor.contractValue)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Contacts Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5 text-gray-500" />
                  Key Contacts
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddContactDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Contact
                </Button>
              </CardHeader>
              <CardContent>
                {(!vendor.contacts || vendor.contacts.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <User className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">No contacts added yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {vendor.contacts.map((contact: any) => (
                      <div
                        key={contact.id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-medium shrink-0">
                          {contact.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {contact.name}
                            </p>
                            {contact.isPrimary && (
                              <Badge
                                variant="outline"
                                className="bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50 text-xs"
                              >
                                <Star className="w-3 h-3 mr-0.5 fill-yellow-500" />
                                Primary
                              </Badge>
                            )}
                          </div>
                          {contact.role && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {contact.role}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5">
                            {contact.email && (
                              <a
                                href={`mailto:${contact.email}`}
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <Mail className="w-3 h-3" />
                                {contact.email}
                              </a>
                            )}
                            {contact.phone && (
                              <a
                                href={`tel:${contact.phone}`}
                                className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3" />
                                {contact.phone}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Created By info */}
          {vendor.createdBy && (
            <div className="flex items-center gap-2 text-xs text-gray-500 border-t pt-4">
              <User className="w-3.5 h-3.5" />
              <span>
                Created by{" "}
                <span className="font-medium text-gray-700">
                  {vendor.createdBy.name || vendor.createdBy.email}
                </span>
                {vendor.createdAt && (
                  <> on {formatDate(vendor.createdAt)}</>
                )}
              </span>
            </div>
          )}
        </TabsContent>

        {/* SLAs Tab */}
        <TabsContent value="slas">
          <VendorSLAList vendorId={vendor.id} slas={vendor.slas || []} />
        </TabsContent>

        {/* Change Requests Tab */}
        <TabsContent value="change-requests">
          <VendorChangeRequests
            vendorId={vendor.id}
            changeRequests={vendor.changeRequests || []}
          />
        </TabsContent>

        {/* Risks Tab */}
        <TabsContent value="risks">
          <VendorRisks vendorId={vendor.id} risks={vendor.risks || []} />
        </TabsContent>
      </Tabs>

      {/* Add Contact Dialog */}
      <Dialog open={showAddContactDialog} onOpenChange={setShowAddContactDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddContact} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Name *</Label>
              <Input
                id="contact-name"
                placeholder="Full name"
                value={contactForm.name}
                onChange={(e) =>
                  setContactForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="email@example.com"
                value={contactForm.email}
                onChange={(e) =>
                  setContactForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input
                id="contact-phone"
                placeholder="+1 (555) 000-0000"
                value={contactForm.phone}
                onChange={(e) =>
                  setContactForm((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-role">Role</Label>
              <Input
                id="contact-role"
                placeholder="e.g., Account Manager"
                value={contactForm.role}
                onChange={(e) =>
                  setContactForm((prev) => ({ ...prev, role: e.target.value }))
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="contact-primary"
                type="checkbox"
                className="rounded border-gray-300"
                checked={contactForm.isPrimary}
                onChange={(e) =>
                  setContactForm((prev) => ({
                    ...prev,
                    isPrimary: e.target.checked,
                  }))
                }
              />
              <Label htmlFor="contact-primary" className="text-sm font-normal">
                Primary contact
              </Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddContactDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addContactMutation.isPending}>
                {addContactMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Add Contact
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
