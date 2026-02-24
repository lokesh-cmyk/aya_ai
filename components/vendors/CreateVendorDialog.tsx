"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

interface CreateVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ContactForm {
  name: string;
  email: string;
  phone: string;
  role: string;
  isPrimary: boolean;
}

interface SlaForm {
  name: string;
  metric: string;
  target: string;
}

const CATEGORIES = [
  "SaaS",
  "Consulting",
  "Infrastructure",
  "Hardware",
  "Services",
  "Other",
];

const RENEWAL_TYPES = [
  { value: "AUTO", label: "Auto-renew" },
  { value: "MANUAL", label: "Manual" },
];

const BILLING_CYCLES = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ANNUAL", label: "Annual" },
];

const emptyContact = (): ContactForm => ({
  name: "",
  email: "",
  phone: "",
  role: "",
  isPrimary: false,
});

const emptySla = (): SlaForm => ({
  name: "",
  metric: "",
  target: "",
});

export function CreateVendorDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateVendorDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);

  // Step 1: Basic Info
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");

  // Step 2: Contacts
  const [contacts, setContacts] = useState<ContactForm[]>([emptyContact()]);

  // Step 3: Contract & SLAs
  const [contractStart, setContractStart] = useState("");
  const [contractEnd, setContractEnd] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [renewalType, setRenewalType] = useState("");
  const [billingCycle, setBillingCycle] = useState("");
  const [contractValue, setContractValue] = useState("");
  const [slas, setSlas] = useState<SlaForm[]>([]);

  const resetForm = () => {
    setStep(1);
    setName("");
    setCategory("");
    setWebsite("");
    setDescription("");
    setContacts([emptyContact()]);
    setContractStart("");
    setContractEnd("");
    setRenewalDate("");
    setRenewalType("");
    setBillingCycle("");
    setContractValue("");
    setSlas([]);
  };

  const createVendorMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create vendor");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const handleSubmit = () => {
    // Filter out empty contacts
    const validContacts = contacts.filter((c) => c.name.trim());
    const validSlas = slas.filter(
      (s) => s.name.trim() && s.metric.trim() && s.target.trim()
    );

    const payload: Record<string, unknown> = {
      name,
      category,
      website: website || undefined,
      description: description || undefined,
      contractStart: contractStart || undefined,
      contractEnd: contractEnd || undefined,
      renewalDate: renewalDate || undefined,
      renewalType: renewalType || undefined,
      billingCycle: billingCycle || undefined,
      contractValue: contractValue ? parseFloat(contractValue) : undefined,
      contacts: validContacts.length > 0 ? validContacts : undefined,
      slas: validSlas.length > 0 ? validSlas : undefined,
    };

    createVendorMutation.mutate(payload);
  };

  const addContact = () => {
    setContacts([...contacts, emptyContact()]);
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const updateContact = (
    index: number,
    field: keyof ContactForm,
    value: string | boolean
  ) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  };

  const addSla = () => {
    setSlas([...slas, emptySla()]);
  };

  const removeSla = (index: number) => {
    setSlas(slas.filter((_, i) => i !== index));
  };

  const updateSla = (index: number, field: keyof SlaForm, value: string) => {
    const updated = [...slas];
    updated[index] = { ...updated[index], [field]: value };
    setSlas(updated);
  };

  const canProceedStep1 = name.trim() && category;
  const canSubmit = canProceedStep1;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Create Vendor - Basic Info"}
            {step === 2 && "Create Vendor - Contacts"}
            {step === 3 && "Create Vendor - Contract & SLAs"}
          </DialogTitle>
          <DialogDescription>
            Step {step} of 3 &mdash;{" "}
            {step === 1 && "Enter the vendor's basic information."}
            {step === 2 && "Add vendor contacts (optional)."}
            {step === 3 && "Set contract details and SLAs (optional)."}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 pb-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-blue-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="vendor-name" className="text-gray-700 font-medium">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="vendor-name"
                placeholder="Acme Corp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white border-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full bg-white border-gray-300">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor-website" className="text-gray-700 font-medium">
                Website
              </Label>
              <Input
                id="vendor-website"
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="bg-white border-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor-description" className="text-gray-700 font-medium">
                Description
              </Label>
              <Input
                id="vendor-description"
                placeholder="Brief description of the vendor"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-white border-gray-300"
              />
            </div>
          </div>
        )}

        {/* Step 2: Contacts */}
        {step === 2 && (
          <div className="flex flex-col gap-4 py-2">
            {contacts.map((contact, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Contact {index + 1}
                  </span>
                  {contacts.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeContact(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">
                      Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="Jane Doe"
                      value={contact.name}
                      onChange={(e) =>
                        updateContact(index, "name", e.target.value)
                      }
                      className="bg-white border-gray-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Email <span className="text-red-500">*</span></Label>
                    <Input
                      type="email"
                      required
                      placeholder="jane@example.com"
                      value={contact.email}
                      onChange={(e) =>
                        updateContact(index, "email", e.target.value)
                      }
                      className="bg-white border-gray-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Phone</Label>
                    <Input
                      placeholder="+1 555 000 0000"
                      value={contact.phone}
                      onChange={(e) =>
                        updateContact(index, "phone", e.target.value)
                      }
                      className="bg-white border-gray-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Role</Label>
                    <Input
                      placeholder="Account Manager"
                      value={contact.role}
                      onChange={(e) =>
                        updateContact(index, "role", e.target.value)
                      }
                      className="bg-white border-gray-300"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`primary-${index}`}
                    checked={contact.isPrimary}
                    onCheckedChange={(checked) =>
                      updateContact(index, "isPrimary", !!checked)
                    }
                  />
                  <Label
                    htmlFor={`primary-${index}`}
                    className="text-sm text-gray-600 cursor-pointer"
                  >
                    Primary contact
                  </Label>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addContact}
              className="border-dashed border-gray-300 text-gray-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
          </div>
        )}

        {/* Step 3: Contract & SLAs */}
        {step === 3 && (
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">
                  Contract Start
                </Label>
                <Input
                  type="date"
                  value={contractStart}
                  onChange={(e) => setContractStart(e.target.value)}
                  className="bg-white border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">
                  Contract End
                </Label>
                <Input
                  type="date"
                  value={contractEnd}
                  onChange={(e) => setContractEnd(e.target.value)}
                  className="bg-white border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">
                  Renewal Date
                </Label>
                <Input
                  type="date"
                  value={renewalDate}
                  onChange={(e) => setRenewalDate(e.target.value)}
                  className="bg-white border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">
                  Renewal Type
                </Label>
                <Select value={renewalType} onValueChange={setRenewalType}>
                  <SelectTrigger className="w-full bg-white border-gray-300">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {RENEWAL_TYPES.map((rt) => (
                      <SelectItem key={rt.value} value={rt.value}>
                        {rt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">
                  Billing Cycle
                </Label>
                <Select value={billingCycle} onValueChange={setBillingCycle}>
                  <SelectTrigger className="w-full bg-white border-gray-300">
                    <SelectValue placeholder="Select cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_CYCLES.map((bc) => (
                      <SelectItem key={bc.value} value={bc.value}>
                        {bc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">
                  Contract Value
                </Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={contractValue}
                  onChange={(e) => setContractValue(e.target.value)}
                  className="bg-white border-gray-300"
                />
              </div>
            </div>

            {/* SLAs */}
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-gray-700 font-medium">
                  Service Level Agreements
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSla}
                  className="border-dashed border-gray-300 text-gray-600"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add SLA
                </Button>
              </div>
              {slas.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  No SLAs added yet. Click &quot;Add SLA&quot; to define service
                  level agreements.
                </p>
              )}
              {slas.map((sla, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-3 space-y-2 mb-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      SLA {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSla(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600">Name</Label>
                      <Input
                        placeholder="Uptime SLA"
                        value={sla.name}
                        onChange={(e) =>
                          updateSla(index, "name", e.target.value)
                        }
                        className="bg-white border-gray-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600">Metric</Label>
                      <Input
                        placeholder="uptime_percent"
                        value={sla.metric}
                        onChange={(e) =>
                          updateSla(index, "metric", e.target.value)
                        }
                        className="bg-white border-gray-300"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600">Target</Label>
                      <Input
                        placeholder="99.9%"
                        value={sla.target}
                        onChange={(e) =>
                          updateSla(index, "target", e.target.value)
                        }
                        className="bg-white border-gray-300"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer with navigation */}
        <DialogFooter>
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="border-gray-300 text-gray-700"
            >
              Back
            </Button>
          )}
          {step === 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="border-gray-300 text-gray-700"
            >
              Cancel
            </Button>
          )}
          {step < 3 ? (
            <Button
              type="button"
              disabled={step === 1 && !canProceedStep1}
              onClick={() => setStep(step + 1)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Next
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!canSubmit || createVendorMutation.isPending}
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {createVendorMutation.isPending
                ? "Creating..."
                : "Create Vendor"}
            </Button>
          )}
        </DialogFooter>

        {createVendorMutation.isError && (
          <p className="text-sm text-red-600 text-center">
            {createVendorMutation.error?.message || "Failed to create vendor"}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
