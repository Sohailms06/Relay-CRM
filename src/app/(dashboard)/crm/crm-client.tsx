"use client";

// ==============================================================================
// RELAY CRM — UNIFIED CRM CLIENT INTERFACE (Phase 4)
// Contacts, Companies, Kanban Sales Pipelines, Custom Fields & Saved Filters
// ==============================================================================

import * as React from "react";
import { useState } from "react";
import {
  Users2,
  Building2,
  TrendingUp,
  SlidersHorizontal,
  Plus,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  MessageSquare,
  Lock,
  ChevronRight,
  X,
  FileText,
  DollarSign,
  AlertCircle,
  Tag,
  Trash2,
  Kanban,
  Table as TableIcon,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Feedback } from "@/components/ui/feedback";
import { EmptyState } from "@/components/ui/empty-state";
import {
  createContactAction,
  updateContactAction,
  getContact360Action,
  createCompanyAction,
  createOpportunityAction,
  updateOpportunityStageAction,
  savePipelineStageAction,
  createCustomFieldDefinitionAction,
  createSavedFilterAction,
  deleteSavedFilterAction,
} from "@/app/actions/crm";
import type { ContactRecord, CompanyRecord, ContactDetails360 } from "@/lib/services/crm";
import type { PipelineRecord, OpportunityRecord } from "@/lib/services/pipeline";
import type { CustomFieldDefinition } from "@/lib/services/custom-fields";
import type { SavedFilterRecord } from "@/lib/services/saved-filters";

interface CrmClientProps {
  initialContacts: ContactRecord[];
  initialCompanies: CompanyRecord[];
  initialPipelines: PipelineRecord[];
  initialOpportunities: OpportunityRecord[];
  customFieldDefs: CustomFieldDefinition[];
  savedFilters: SavedFilterRecord[];
  workspaceId: string;
  userRole: string;
  canViewFinancials: boolean;
  defaultTab?: "contacts" | "companies" | "pipeline" | "settings";
}

export function CrmClient({
  initialContacts,
  initialCompanies,
  initialPipelines,
  initialOpportunities,
  customFieldDefs,
  savedFilters,
  workspaceId,
  userRole,
  canViewFinancials,
  defaultTab = "contacts",
}: CrmClientProps) {
  const [activeTab, setActiveTab] = useState<"contacts" | "companies" | "pipeline" | "settings">(defaultTab);
  const [contacts, setContacts] = useState<ContactRecord[]>(initialContacts);
  const [companies, setCompanies] = useState<CompanyRecord[]>(initialCompanies);
  const [pipelines, setPipelines] = useState<PipelineRecord[]>(initialPipelines);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>(initialOpportunities);
  const [filters, setFilters] = useState<SavedFilterRecord[]>(savedFilters);

  // Search & Filtering States
  const [contactSearch, setContactSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [oppSearch, setOppSearch] = useState("");
  const [pipelineViewMode, setPipelineViewMode] = useState<"kanban" | "table">("kanban");

  // Modals & Drawers
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isAddOppOpen, setIsAddOppOpen] = useState(false);
  const [isAddStageOpen, setIsAddStageOpen] = useState(false);
  const [isAddCustomFieldOpen, setIsAddCustomFieldOpen] = useState(false);
  const [isSaveFilterOpen, setIsSaveFilterOpen] = useState(false);
  const [selectedContact360, setSelectedContact360] = useState<ContactDetails360 | null>(null);
  const [loadingContactId, setLoadingContactId] = useState<string | null>(null);

  // Action Feedback & Submitting State
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms State
  const [contactForm, setContactForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: "",
    companyId: "",
  });

  const [companyForm, setCompanyForm] = useState({
    name: "",
    domain: "",
    industry: "",
    phone: "",
  });

  const [oppForm, setOppForm] = useState({
    title: "",
    stageId: "",
    monetaryValue: 500,
    currency: "USD",
    contactId: "",
    companyId: "",
    expectedCloseDate: "",
  });

  const [stageForm, setStageForm] = useState({
    name: "",
    isWon: false,
    isLost: false,
  });

  const [customFieldForm, setCustomFieldForm] = useState({
    entityType: "contact" as "contact" | "company" | "opportunity",
    fieldLabel: "",
    fieldType: "text" as "text" | "number" | "boolean" | "date" | "select",
    optionsStr: "",
    isRequired: false,
  });

  const [filterFormName, setFilterFormName] = useState("");

  const activePipeline = pipelines[0] || null;

  // Modal & Drawer keyboard accessibility (Escape to close) & scroll locking
  React.useEffect(() => {
    const isAnyModalOpen =
      isAddContactOpen ||
      isAddCompanyOpen ||
      isAddOppOpen ||
      isAddStageOpen ||
      isAddCustomFieldOpen ||
      isSaveFilterOpen ||
      selectedContact360 !== null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAddContactOpen(false);
        setIsAddCompanyOpen(false);
        setIsAddOppOpen(false);
        setIsAddStageOpen(false);
        setIsAddCustomFieldOpen(false);
        setIsSaveFilterOpen(false);
        setSelectedContact360(null);
      }
    };

    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isAddContactOpen,
    isAddCompanyOpen,
    isAddOppOpen,
    isAddStageOpen,
    isAddCustomFieldOpen,
    isSaveFilterOpen,
    selectedContact360,
  ]);

  // ---------------------------------------------------------------------------
  // CONTACT ACTIONS
  // ---------------------------------------------------------------------------
  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    const res = await createContactAction({
      firstName: contactForm.firstName,
      lastName: contactForm.lastName || undefined,
      email: contactForm.email || undefined,
      phone: contactForm.phone || undefined,
      jobTitle: contactForm.jobTitle || undefined,
      companyId: contactForm.companyId || null,
    });

    setIsSubmitting(false);
    if (!res.success || !res.contact) {
      setFeedback({ type: "error", text: res.error || "Failed to create contact" });
    } else {
      setContacts((prev) => [res.contact!, ...prev]);
      setIsAddContactOpen(false);
      setContactForm({ firstName: "", lastName: "", email: "", phone: "", jobTitle: "", companyId: "" });
      setFeedback({ type: "success", text: `Contact "${res.contact.first_name} ${res.contact.last_name || ""}" created successfully.` });
    }
  };

  const handleOpen360Drawer = async (contactId: string) => {
    setLoadingContactId(contactId);
    setFeedback(null);
    const res = await getContact360Action(contactId);
    setLoadingContactId(null);

    if (res.success && res.details) {
      setSelectedContact360(res.details);
    } else {
      setFeedback({ type: "error", text: res.error || "Failed to load customer profile" });
    }
  };

  // ---------------------------------------------------------------------------
  // COMPANY ACTIONS
  // ---------------------------------------------------------------------------
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    const res = await createCompanyAction({
      name: companyForm.name,
      domain: companyForm.domain || undefined,
      industry: companyForm.industry || undefined,
      phone: companyForm.phone || undefined,
    });

    setIsSubmitting(false);
    if (!res.success || !res.company) {
      setFeedback({ type: "error", text: res.error || "Failed to create company" });
    } else {
      setCompanies((prev) => [res.company!, ...prev]);
      setIsAddCompanyOpen(false);
      setCompanyForm({ name: "", domain: "", industry: "", phone: "" });
      setFeedback({ type: "success", text: `Company "${res.company.name}" created.` });
    }
  };

  // ---------------------------------------------------------------------------
  // OPPORTUNITY ACTIONS
  // ---------------------------------------------------------------------------
  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePipeline) return;
    setIsSubmitting(true);
    setFeedback(null);

    const targetStageId = oppForm.stageId || activePipeline.stages[0]?.id;
    if (!targetStageId) {
      setFeedback({ type: "error", text: "Please create a pipeline stage first" });
      setIsSubmitting(false);
      return;
    }

    const res = await createOpportunityAction({
      title: oppForm.title,
      pipelineId: activePipeline.id,
      stageId: targetStageId,
      monetaryValue: Number(oppForm.monetaryValue) || 0,
      currency: oppForm.currency,
      contactId: oppForm.contactId || undefined,
      companyId: oppForm.companyId || undefined,
      expectedCloseDate: oppForm.expectedCloseDate || undefined,
    });

    setIsSubmitting(false);
    if (!res.success || !res.opportunity) {
      setFeedback({ type: "error", text: res.error || "Failed to create opportunity" });
    } else {
      setOpportunities((prev) => [res.opportunity!, ...prev]);
      setIsAddOppOpen(false);
      setOppForm({
        title: "",
        stageId: "",
        monetaryValue: 500,
        currency: "USD",
        contactId: "",
        companyId: "",
        expectedCloseDate: "",
      });
      setFeedback({ type: "success", text: `Deal "${res.opportunity.title}" added to pipeline.` });
    }
  };

  const handleMoveStage = async (oppId: string, newStageId: string) => {
    setFeedback(null);
    const res = await updateOpportunityStageAction(oppId, newStageId);
    if (!res.success || !res.opportunity) {
      setFeedback({ type: "error", text: res.error || "Failed to move deal" });
    } else {
      setOpportunities((prev) =>
        prev.map((o) => (o.id === oppId ? { ...o, stage_id: newStageId } : o))
      );
      setFeedback({ type: "success", text: "Deal moved to new pipeline stage." });
    }
  };

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePipeline) return;
    setIsSubmitting(true);
    setFeedback(null);

    const res = await savePipelineStageAction({
      pipelineId: activePipeline.id,
      name: stageForm.name,
      isWon: stageForm.isWon,
      isLost: stageForm.isLost,
    });

    setIsSubmitting(false);
    if (!res.success || !res.stage) {
      setFeedback({ type: "error", text: res.error || "Failed to create stage" });
    } else {
      setPipelines((prev) =>
        prev.map((p) =>
          p.id === activePipeline.id
            ? { ...p, stages: [...p.stages, res.stage!] }
            : p
        )
      );
      setIsAddStageOpen(false);
      setStageForm({ name: "", isWon: false, isLost: false });
      setFeedback({ type: "success", text: `Stage "${res.stage.name}" added to pipeline.` });
    }
  };

  // ---------------------------------------------------------------------------
  // CUSTOM FIELDS & SAVED FILTERS
  // ---------------------------------------------------------------------------
  const handleCreateCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    const options = customFieldForm.optionsStr
      ? customFieldForm.optionsStr.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const res = await createCustomFieldDefinitionAction({
      entityType: customFieldForm.entityType,
      fieldLabel: customFieldForm.fieldLabel,
      fieldType: customFieldForm.fieldType,
      options,
      isRequired: customFieldForm.isRequired,
    });

    setIsSubmitting(false);
    if (!res.success || !res.definition) {
      setFeedback({ type: "error", text: res.error || "Failed to create custom field" });
    } else {
      setIsAddCustomFieldOpen(false);
      setCustomFieldForm({
        entityType: "contact",
        fieldLabel: "",
        fieldType: "text",
        optionsStr: "",
        isRequired: false,
      });
      setFeedback({ type: "success", text: `Custom field "${res.definition.field_label}" registered.` });
    }
  };

  const handleSaveFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filterFormName.trim()) return;
    setIsSubmitting(true);
    setFeedback(null);

    const res = await createSavedFilterAction({
      entityType: activeTab,
      name: filterFormName.trim(),
      filterConfig: {
        criteria: [
          {
            field: "search",
            operator: "contains",
            value: activeTab === "contacts" ? contactSearch : companySearch,
          },
        ],
      },
    });

    setIsSubmitting(false);
    if (!res.success || !res.filter) {
      setFeedback({ type: "error", text: res.error || "Failed to save filter" });
    } else {
      setFilters((prev) => [res.filter!, ...prev]);
      setIsSaveFilterOpen(false);
      setFilterFormName("");
      setFeedback({ type: "success", text: `Filter preset "${res.filter.name}" saved.` });
    }
  };

  const handleDeleteFilter = async (filterId: string) => {
    const res = await deleteSavedFilterAction(filterId);
    if (res.success) {
      setFilters((prev) => prev.filter((f) => f.id !== filterId));
      setFeedback({ type: "success", text: "Filter deleted." });
    }
  };

  // Filtered Lists
  const filteredContacts = contacts.filter((c) => {
    if (!contactSearch.trim()) return true;
    const term = contactSearch.toLowerCase();
    const fullName = `${c.first_name} ${c.last_name || ""}`.toLowerCase();
    const email = (c.email || "").toLowerCase();
    const phone = (c.phone || "").toLowerCase();
    const comp = (c.companies?.name || "").toLowerCase();
    return fullName.includes(term) || email.includes(term) || phone.includes(term) || comp.includes(term);
  });

  const filteredCompanies = companies.filter((comp) => {
    if (!companySearch.trim()) return true;
    const term = companySearch.toLowerCase();
    return comp.name.toLowerCase().includes(term) || (comp.industry || "").toLowerCase().includes(term);
  });

  const filteredOpportunities = opportunities.filter((o) => {
    if (!oppSearch.trim()) return true;
    const term = oppSearch.toLowerCase();
    return o.title.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Page Title & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E5E0] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#18181B]">
            CRM
          </h1>
          <p className="mt-0.5 text-xs text-[#71717A]">
            Contacts, accounts, and deal pipelines.
          </p>
        </div>

        {/* Action Buttons based on active tab */}
        <div className="flex items-center gap-2">
          {activeTab === "contacts" && (
            <Button
              size="sm"
              onClick={() => setIsAddContactOpen(true)}
              className="bg-[#1E3A2F] text-white hover:bg-[#162C24]"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Contact
            </Button>
          )}

          {activeTab === "companies" && (
            <Button
              size="sm"
              onClick={() => setIsAddCompanyOpen(true)}
              className="bg-[#1E3A2F] text-white hover:bg-[#162C24]"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Company
            </Button>
          )}

          {activeTab === "pipeline" && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPipelineViewMode(pipelineViewMode === "kanban" ? "table" : "kanban")}
              >
                {pipelineViewMode === "kanban" ? (
                  <>
                    <TableIcon className="h-3.5 w-3.5 mr-1" />
                    Table View
                  </>
                ) : (
                  <>
                    <Kanban className="h-3.5 w-3.5 mr-1" />
                    Kanban View
                  </>
                )}
              </Button>
              <Button
                size="sm"
                onClick={() => setIsAddOppOpen(true)}
                className="bg-[#1E3A2F] text-white hover:bg-[#162C24]"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                New Deal
              </Button>
            </div>
          )}

          {activeTab === "settings" && (
            <Button
              size="sm"
              onClick={() => setIsAddCustomFieldOpen(true)}
              className="bg-[#1E3A2F] text-white hover:bg-[#162C24]"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Custom Field
            </Button>
          )}
        </div>
      </div>

      {feedback && (
        <Feedback variant={feedback.type === "success" ? "success" : "error"}>
          {feedback.text}
        </Feedback>
      )}

      {/* Tabs Header */}
      <div className="flex items-center gap-1 border-b border-[#E5E5E0] text-xs font-medium">
        <button
          onClick={() => setActiveTab("contacts")}
          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 transition-colors ${
            activeTab === "contacts"
              ? "border-[#1E3A2F] text-[#1E3A2F] font-semibold"
              : "border-transparent text-[#71717A] hover:text-[#18181B]"
          }`}
        >
          <Users2 className="h-3.5 w-3.5" />
          Contacts ({contacts.length})
        </button>

        <button
          onClick={() => setActiveTab("companies")}
          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 transition-colors ${
            activeTab === "companies"
              ? "border-[#1E3A2F] text-[#1E3A2F] font-semibold"
              : "border-transparent text-[#71717A] hover:text-[#18181B]"
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          Companies ({companies.length})
        </button>

        <button
          onClick={() => setActiveTab("pipeline")}
          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 transition-colors ${
            activeTab === "pipeline"
              ? "border-[#1E3A2F] text-[#1E3A2F] font-semibold"
              : "border-transparent text-[#71717A] hover:text-[#18181B]"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Deals Pipeline ({opportunities.length})
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 transition-colors ${
            activeTab === "settings"
              ? "border-[#1E3A2F] text-[#1E3A2F] font-semibold"
              : "border-transparent text-[#71717A] hover:text-[#18181B]"
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Custom Fields & Filters
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: CONTACTS DIRECTORY */}
      {/* ===================================================================== */}
      {activeTab === "contacts" && (
        <div className="space-y-4">
          {/* Search & Saved Filters Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#71717A]" />
              <input
                type="text"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder="Search contacts by name, email, phone..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E5E5E0] bg-white focus:outline-none focus:border-[#1E3A2F]"
              />
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {filters.filter((f) => f.entity_type === "contacts").map((f) => (
                <Badge
                  key={f.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-[#FAFAF8] gap-1 py-1"
                >
                  <Filter className="h-2.5 w-2.5" />
                  {f.name}
                  <button
                    onClick={() => handleDeleteFilter(f.id)}
                    className="ml-1 hover:text-[#991B1B]"
                  >
                    ×
                  </button>
                </Badge>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSaveFilterOpen(true)}
                className="text-[11px] h-7"
              >
                Save View
              </Button>
            </div>
          </div>

          {/* Contacts Table */}
          <Card className="border-[#E5E5E0]">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAFAF8] border-b border-[#E5E5E0] text-[#71717A] uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Contact Name</th>
                      <th className="py-2.5 px-4 font-semibold">Company</th>
                      <th className="py-2.5 px-4 font-semibold">Communication</th>
                      <th className="py-2.5 px-4 font-semibold">Source</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFEFEA] text-[#18181B]">
                    {filteredContacts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-[#71717A]">
                          No contacts found matching your query. Click "New Contact" to add your first customer record.
                        </td>
                      </tr>
                    ) : (
                      filteredContacts.map((c) => (
                        <tr key={c.id} className="hover:bg-[#FAFAF8]/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[#18181B]">
                              {c.first_name} {c.last_name || ""}
                            </div>
                            {c.job_title && (
                              <div className="text-[11px] text-[#71717A]">{c.job_title}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {c.companies ? (
                              <Badge variant="outline" className="font-medium">
                                {c.companies.name}
                              </Badge>
                            ) : (
                              <span className="text-[#A1A1AA]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 space-y-0.5">
                            {c.email && (
                              <div className="flex items-center gap-1.5 text-[#52525B]">
                                <Mail className="h-3 w-3 text-[#71717A]" />
                                <span>{c.email}</span>
                              </div>
                            )}
                            {c.phone && (
                              <div className="flex items-center gap-1.5 text-[#52525B]">
                                <Phone className="h-3 w-3 text-[#71717A]" />
                                <span>{c.phone}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 capitalize text-[#71717A]">
                            <Badge variant="sage" className="text-[10px]">
                              {c.source}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpen360Drawer(c.id)}
                              isLoading={loadingContactId === c.id}
                              className="text-[11px] h-7"
                            >
                              Customer 360° →
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: COMPANIES ACCOUNTS */}
      {/* ===================================================================== */}
      {activeTab === "companies" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#71717A]" />
              <input
                type="text"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                placeholder="Search companies by name or industry..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E5E5E0] bg-white focus:outline-none focus:border-[#1E3A2F]"
              />
            </div>
          </div>

          <Card className="border-[#E5E5E0]">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAFAF8] border-b border-[#E5E5E0] text-[#71717A] uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Company Name</th>
                      <th className="py-2.5 px-4 font-semibold">Industry</th>
                      <th className="py-2.5 px-4 font-semibold">Contacts</th>
                      <th className="py-2.5 px-4 font-semibold">Open Deals</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Pipeline Potential</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFEFEA] text-[#18181B]">
                    {filteredCompanies.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-[#71717A]">
                          No company accounts created yet. Click "New Company" to register an enterprise client.
                        </td>
                      </tr>
                    ) : (
                      filteredCompanies.map((comp) => (
                        <tr key={comp.id} className="hover:bg-[#FAFAF8]/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-[#18181B]">{comp.name}</div>
                            {comp.domain && (
                              <div className="text-[11px] text-[#71717A] flex items-center gap-1">
                                <span>{comp.domain}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {comp.industry ? (
                              <Badge variant="outline">{comp.industry}</Badge>
                            ) : (
                              <span className="text-[#A1A1AA]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium text-[#18181B]">
                            {comp.contacts_count || 0} Associated
                          </td>
                          <td className="py-3 px-4 font-medium text-[#18181B]">
                            {comp.open_deals_count || 0} Deals
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-[#18181B]">
                            {canViewFinancials ? (
                              `$${Number(comp.total_deal_value || 0).toLocaleString()}`
                            ) : (
                              <span className="text-[#A1A1AA] flex items-center justify-end gap-1">
                                <Lock className="h-3 w-3" /> Masked
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: SALES PIPELINE (KANBAN & TABLE VIEW) */}
      {/* ===================================================================== */}
      {activeTab === "pipeline" && activePipeline && (
        <div className="space-y-4">
          {/* Pipeline Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#18181B]">Active Pipeline:</span>
              <span className="text-xs font-medium text-[#1E3A2F] bg-[#E8EFE9] px-2 py-0.5 rounded">
                {activePipeline.name}
              </span>

              {(userRole === "Owner" || userRole === "Admin") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddStageOpen(true)}
                  className="text-[11px] h-7"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Stage
                </Button>
              )}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#71717A]" />
              <input
                type="text"
                value={oppSearch}
                onChange={(e) => setOppSearch(e.target.value)}
                placeholder="Search deals..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E5E5E0] bg-white focus:outline-none focus:border-[#1E3A2F]"
              />
            </div>
          </div>

          {/* KANBAN VIEW */}
          {pipelineViewMode === "kanban" && (
            <div className="flex gap-4 overflow-x-auto pb-6">
              {activePipeline.stages.map((stage) => {
                const stageOpps = filteredOpportunities.filter((o) => o.stage_id === stage.id);
                const stageSum = stageOpps.reduce((acc, o) => acc + (Number(o.monetary_value) || 0), 0);

                return (
                  <div
                    key={stage.id}
                    className="flex flex-col shrink-0 w-72 rounded-xl bg-[#FAFAF8] border border-[#E5E5E0] p-3 shadow-xs"
                  >
                    {/* Stage Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E0] mb-3">
                      <div>
                        <div className="text-xs font-semibold text-[#18181B] flex items-center gap-1.5">
                          <span>{stage.name}</span>
                          <span className="rounded-full bg-white border border-[#E5E5E0] px-1.5 py-0.2 text-[10px] text-[#71717A]">
                            {stageOpps.length}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#71717A] mt-0.5">
                          {canViewFinancials ? (
                            `$${stageSum.toLocaleString()}`
                          ) : (
                            <span className="flex items-center gap-1">
                              <Lock className="h-2.5 w-2.5" /> Masked
                            </span>
                          )}
                        </div>
                      </div>

                      {stage.is_won && <Badge variant="success" className="text-[10px]">Won</Badge>}
                      {stage.is_lost && <Badge variant="destructive" className="text-[10px]">Lost</Badge>}
                    </div>

                    {/* Stage Deal Cards */}
                    <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[500px]">
                      {stageOpps.length === 0 ? (
                        <div className="py-8 text-center text-[11px] text-[#A1A1AA] border border-dashed border-[#E5E5E0] rounded-lg">
                          No deals in this stage
                        </div>
                      ) : (
                        stageOpps.map((opp) => (
                          <div
                            key={opp.id}
                            className="p-3 bg-white rounded-lg border border-[#E5E5E0] shadow-xs hover:border-[#1E3A2F] transition-all group"
                          >
                            <div className="font-semibold text-xs text-[#18181B]">
                              {opp.title}
                            </div>

                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#EFEFEA] text-[11px]">
                              <span className="font-semibold text-[#1E3A2F]">
                                {canViewFinancials ? (
                                  `$${Number(opp.monetary_value || 0).toLocaleString()} ${opp.currency}`
                                ) : (
                                  <span className="text-[#A1A1AA] flex items-center gap-1 font-normal">
                                    <Lock className="h-2.5 w-2.5" /> Confidential
                                  </span>
                                )}
                              </span>

                              {/* Quick Move Dropdown */}
                              <select
                                value={opp.stage_id}
                                onChange={(e) => handleMoveStage(opp.id, e.target.value)}
                                className="text-[10px] bg-[#FAFAF8] border border-[#E5E5E0] rounded px-1.5 py-0.5 text-[#52525B] focus:outline-none"
                              >
                                {activePipeline.stages.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    Move → {s.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {opp.contacts && (
                              <div className="mt-1.5 text-[10px] text-[#71717A] flex items-center gap-1">
                                <Users2 className="h-2.5 w-2.5" />
                                <span>{opp.contacts.first_name} {opp.contacts.last_name || ""}</span>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TABLE VIEW */}
          {pipelineViewMode === "table" && (
            <Card className="border-[#E5E5E0]">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAFAF8] border-b border-[#E5E5E0] text-[#71717A] uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Deal Title</th>
                        <th className="py-2.5 px-4 font-semibold">Stage</th>
                        <th className="py-2.5 px-4 font-semibold">Contact / Account</th>
                        <th className="py-2.5 px-4 font-semibold">Monetary Value</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Advance Stage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFEFEA] text-[#18181B]">
                      {filteredOpportunities.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-[#71717A]">
                            No deals in this pipeline. Click "New Deal" to register a sales opportunity.
                          </td>
                        </tr>
                      ) : (
                        filteredOpportunities.map((opp) => {
                          const currentStageIdx = activePipeline.stages.findIndex((s) => s.id === opp.stage_id);
                          const nextStage = activePipeline.stages[currentStageIdx + 1];

                          return (
                            <tr key={opp.id} className="hover:bg-[#FAFAF8]/80 transition-colors">
                              <td className="py-3 px-4 font-semibold text-[#18181B]">
                                {opp.title}
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="outline">
                                  {opp.pipeline_stages?.name || "Stage"}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-[#71717A]">
                                {opp.contacts ? `${opp.contacts.first_name} ${opp.contacts.last_name || ""}` : "Unassigned"}
                              </td>
                              <td className="py-3 px-4 font-semibold text-[#18181B]">
                                {canViewFinancials ? (
                                  `$${Number(opp.monetary_value || 0).toLocaleString()} ${opp.currency}`
                                ) : (
                                  <span className="text-[#A1A1AA] flex items-center gap-1 font-normal">
                                    <Lock className="h-3 w-3" /> Masked
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {nextStage ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleMoveStage(opp.id, nextStage.id)}
                                    className="text-[11px] h-7"
                                  >
                                    Move to {nextStage.name} →
                                  </Button>
                                ) : (
                                  <Badge variant="success">Completed</Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: CUSTOM FIELDS & SAVED FILTERS */}
      {/* ===================================================================== */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Custom Fields Registry */}
          <Card className="border-[#E5E5E0]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#18181B]">
                Workspace Custom Field Schemas
              </CardTitle>
              <CardDescription className="text-xs text-[#71717A]">
                Configure workspace-specific data attributes for contacts, companies, opportunities, and leads.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customFieldDefs.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#71717A]">
                  No custom fields defined yet. Click "Add Custom Field" to build your custom data model.
                </div>
              ) : (
                <div className="divide-y divide-[#EFEFEA] text-xs">
                  {customFieldDefs.map((def) => (
                    <div key={def.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-[#18181B]">{def.field_label}</div>
                        <div className="text-[11px] text-[#71717A]">
                          Key: <code className="font-mono">{def.field_key}</code> • Type: {def.field_type}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {def.entity_type}
                        </Badge>
                        {def.is_required && (
                          <Badge variant="warning" className="text-[10px]">
                            Required
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saved Filters Registry */}
          <Card className="border-[#E5E5E0]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#18181B]">
                Saved Filter Views & Presets
              </CardTitle>
              <CardDescription className="text-xs text-[#71717A]">
                Manage persistent multi-criteria views that survive page reloads and user sessions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filters.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#71717A]">
                  No saved views created yet. Use the "Save View" button on any table to preserve your search filters.
                </div>
              ) : (
                <div className="divide-y divide-[#EFEFEA] text-xs">
                  {filters.map((f) => (
                    <div key={f.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-[#18181B]">{f.name}</div>
                        <div className="text-[11px] text-[#71717A] capitalize">
                          Entity: {f.entity_type} • Saved on {new Date(f.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteFilter(f.id)}
                        className="h-7 text-[10px]"
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* CUSTOMER 360° PROFILE DRAWER */}
      {/* ===================================================================== */}
      {selectedContact360 && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#E5E5E0] flex items-center justify-between bg-[#FAFAF8]">
              <div>
                <h2 className="text-base font-bold text-[#18181B]">
                  {selectedContact360.first_name} {selectedContact360.last_name || ""}
                </h2>
                <p className="text-xs text-[#71717A]">
                  {selectedContact360.job_title || "Customer Record"}{" "}
                  {selectedContact360.companies ? `at ${selectedContact360.companies.name}` : ""}
                </p>
              </div>
              <button
                onClick={() => setSelectedContact360(null)}
                className="p-1.5 rounded-lg text-[#71717A] hover:bg-[#EFEFEA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-4 gap-2 p-4 border-b border-[#E5E5E0] bg-[#FFFFFF] text-center">
              <div className="p-2 rounded-lg bg-[#FAFAF8] border border-[#E5E5E0]">
                <div className="text-xs text-[#71717A]">Leads</div>
                <div className="text-base font-bold text-[#18181B]">{selectedContact360.leads.length}</div>
              </div>
              <div className="p-2 rounded-lg bg-[#FAFAF8] border border-[#E5E5E0]">
                <div className="text-xs text-[#71717A]">Deals</div>
                <div className="text-base font-bold text-[#18181B]">{selectedContact360.opportunities.length}</div>
              </div>
              <div className="p-2 rounded-lg bg-[#FAFAF8] border border-[#E5E5E0]">
                <div className="text-xs text-[#71717A]">Consults</div>
                <div className="text-base font-bold text-[#18181B]">{selectedContact360.appointments.length}</div>
              </div>
              <div className="p-2 rounded-lg bg-[#FAFAF8] border border-[#E5E5E0]">
                <div className="text-xs text-[#71717A]">Payments</div>
                <div className="text-base font-bold text-[#18181B]">{selectedContact360.payments.length}</div>
              </div>
            </div>

            {/* Chronological Customer Activity Timeline */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-[#18181B] uppercase tracking-wider">
                  Customer Activity Timeline
                </span>
                <span className="text-[11px] text-[#71717A]">
                  {selectedContact360.timeline.length} Events Logged
                </span>
              </div>

              {selectedContact360.timeline.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#71717A]">
                  No activity history recorded for this contact yet.
                </div>
              ) : (
                <div className="relative border-l border-[#E5E5E0] ml-3 space-y-4 py-2">
                  {selectedContact360.timeline.map((item) => (
                    <div key={item.id} className="relative pl-6">
                      {/* Timeline dot */}
                      <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#1E3A2F]" />

                      <div className="p-3 rounded-lg border border-[#E5E5E0] bg-[#FAFAF8] shadow-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs text-[#18181B]">{item.title}</span>
                          {item.badge && (
                            <Badge variant={item.badgeVariant || "outline"} className="text-[10px]">
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-[#71717A]">{item.description}</p>
                        <span className="mt-1.5 block text-[10px] text-[#A1A1AA]">
                          {new Date(item.timestamp).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-[#E5E5E0] bg-[#FAFAF8] flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedContact360(null)}>
                Close Profile
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CREATE CONTACT */}
      {/* ===================================================================== */}
      {isAddContactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-[#E5E5E0]">
            <h2 className="text-sm font-bold text-[#18181B]">Create Customer Contact</h2>
            <p className="text-xs text-[#71717A] mt-0.5">
              Enter customer details. Duplicate phone or email matches will be prevented.
            </p>

            <form onSubmit={handleCreateContact} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#18181B]">First Name *</label>
                  <input
                    required
                    type="text"
                    value={contactForm.firstName}
                    onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                    className="w-full mt-1 p-2 border border-[#E5E5E0] rounded-lg text-xs"
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#18181B]">Last Name</label>
                  <input
                    type="text"
                    value={contactForm.lastName}
                    onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                    className="w-full mt-1 p-2 border border-[#E5E5E0] rounded-lg text-xs"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#18181B]">Email Address</label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full mt-1 p-2 border border-[#E5E5E0] rounded-lg text-xs"
                  placeholder="jane.doe@example.com"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#18181B]">Phone Number</label>
                <input
                  type="tel"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  className="w-full mt-1 p-2 border border-[#E5E5E0] rounded-lg text-xs"
                  placeholder="+15550192834"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#18181B]">Job Title</label>
                <input
                  type="text"
                  value={contactForm.jobTitle}
                  onChange={(e) => setContactForm({ ...contactForm, jobTitle: e.target.value })}
                  className="w-full mt-1 p-2 border border-[#E5E5E0] rounded-lg text-xs"
                  placeholder="Procurement Director"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#18181B]">Company</label>
                <select
                  value={contactForm.companyId}
                  onChange={(e) => setContactForm({ ...contactForm, companyId: e.target.value })}
                  className="w-full mt-1 p-2 border border-[#E5E5E0] rounded-lg text-xs bg-white"
                >
                  <option value="">No Company Account</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EFEFEA]">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddContactOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={isSubmitting} className="bg-[#1E3A2F] text-white">
                  Save Contact
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CREATE COMPANY */}
      {/* ===================================================================== */}
      {isAddCompanyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-[#E5E5E0]">
            <h2 className="text-sm font-bold text-[#18181B]">Create Company Account</h2>
            <p className="text-xs text-[#71717A] mt-0.5">
              Register a business client to link multiple contacts and track deal values.
            </p>

            <form onSubmit={handleCreateCompany} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#18181B]">Company Name *</label>
                <input
                  required
                  type="text"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  className="w-full mt-1 p-2 border border-[#E5E5E0] rounded-lg text-xs"
                  placeholder="Acme Industrial Corp"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#18181B]">Domain / Website</label>
                <input
                  type="text"
                  value={companyForm.domain}
                  onChange={(e) => setCompanyForm({ ...companyForm, domain: e.target.value })}
                  className="w-full mt-1 p-2 border border-[#E5E5E0] rounded-lg text-xs"
                  placeholder="acmeindustrial.com"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#18181B]">Industry</label>
                <input
                  type="text"
                  value={companyForm.industry}
                  onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                  className="w-full mt-1 p-2 border border-[#E5E5E0] rounded-lg text-xs"
                  placeholder="Manufacturing, Logistics, Healthcare..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#18181B]">Office Phone</label>
                <input
                  type="tel"
                  value={companyForm.phone}
                  onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                  className="w-full mt-1 p-2 border border-[#E5E5E0] rounded-lg text-xs"
                  placeholder="+15550001122"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EFEFEA]">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddCompanyOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={isSubmitting} className="bg-[#1E3A2F] text-white">
                  Save Company
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CREATE DEAL / OPPORTUNITY */}
      {/* ===================================================================== */}
      {isAddOppOpen && activePipeline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-[#E5E5E0]">
            <h2 className="text-sm font-bold text-[#18181B]">Create Sales Deal</h2>
            <p className="text-xs text-[#71717A] mt-0.5">
              Add a deal to the sales pipeline to track revenue potential and milestones.
            </p>

            <form onSubmit={handleCreateOpportunity} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#18181B]">Deal Title *</label>
                <input
                  required
                  type="text"
                  value={oppForm.title}
                  onChange={(e) => setOppForm({ ...oppForm, title: e.target.value })}
                  className="w-full mt-1 p-2 border border-[#E5E5E0] rounded-lg text-xs"
                  placeholder="Annual HVAC Maintenance Contract"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#18181B]">Pipeline Stage *</label>
                  <select
                    value={oppForm.stageId || activePipeline.stages[0]?.id}
                    onChange={(e) => setOppForm({ ...oppForm, stageId: e.target.value })}
                    className="w-full mt-1 p-2 border border-[#E5E5E0] rounded-lg text-xs bg-white"
                  >
                    {activePipeline.stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#18181B]">Monetary Value ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={oppForm.monetaryValue}
                    onChange={(e) => setOppForm({ ...oppForm, monetaryValue: Number(e.target.value) })}
                    className="w-full mt-1 p-2 border border-[#E5E5E0] rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#18181B]">Associated Contact</label>
                <select
                  value={oppForm.contactId}
                  onChange={(e) => setOppForm({ ...oppForm, contactId: e.target.value })}
                  className="w-full mt-1 p-2 border border-[#E5E5E0] rounded-lg text-xs bg-white"
                >
                  <option value="">No Contact Linked</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name || ""} ({c.email || c.phone || "No direct phone"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#18181B]">Associated Company</label>
                <select
                  value={oppForm.companyId}
                  onChange={(e) => setOppForm({ ...oppForm, companyId: e.target.value })}
                  className="w-full mt-1 p-2 border border-[#E5E5E0] rounded-lg text-xs bg-white"
                >
                  <option value="">No Company Linked</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#18181B]">Expected Close Date</label>
                <input
                  type="date"
                  value={oppForm.expectedCloseDate}
                  onChange={(e) => setOppForm({ ...oppForm, expectedCloseDate: e.target.value })}
                  className="w-full mt-1 p-2 border border-[#E5E5E0] rounded-lg text-xs bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EFEFEA]">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOppOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={isSubmitting} className="bg-[#1E3A2F] text-white">
                  Add Deal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADD STAGE (OWNER / ADMIN) */}
      {/* ===================================================================== */}
      {isAddStageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl border border-[#E5E5E0]">
            <h2 className="text-sm font-bold text-[#18181B]">Add Pipeline Stage</h2>
            <p className="text-xs text-[#71717A] mt-0.5">
              Insert a new milestone column into the sales pipeline.
            </p>

            <form onSubmit={handleCreateStage} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#18181B]">Stage Name *</label>
                <input
                  required
                  type="text"
                  value={stageForm.name}
                  onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
                  className="w-full mt-1 p-2 border border-[#E5E5E0] rounded-lg text-xs"
                  placeholder="Contract Review"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={stageForm.isWon}
                    onChange={(e) => setStageForm({ ...stageForm, isWon: e.target.checked, isLost: false })}
                    className="rounded border-[#E5E5E0] text-[#1E3A2F]"
                  />
                  <span>Won Stage</span>
                </label>

                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={stageForm.isLost}
                    onChange={(e) => setStageForm({ ...stageForm, isLost: e.target.checked, isWon: false })}
                    className="rounded border-[#E5E5E0] text-[#991B1B]"
                  />
                  <span>Lost Stage</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EFEFEA]">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddStageOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={isSubmitting} className="bg-[#1E3A2F] text-white">
                  Save Stage
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADD CUSTOM FIELD */}
      {/* ===================================================================== */}
      {isAddCustomFieldOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-[#E5E5E0]">
            <h2 className="text-sm font-bold text-[#18181B]">Register Custom Field</h2>
            <p className="text-xs text-[#71717A] mt-0.5">
              Add a typed schema field to contacts, companies, or opportunities.
            </p>

            <form onSubmit={handleCreateCustomField} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#18181B]">Applies To *</label>
                <select
                  value={customFieldForm.entityType}
                  onChange={(e) => setCustomFieldForm({ ...customFieldForm, entityType: e.target.value as any })}
                  className="w-full mt-1 p-2 border border-[#E5E5E0] rounded-lg text-xs bg-white"
                >
                  <option value="contact">Contact</option>
                  <option value="company">Company</option>
                  <option value="opportunity">Opportunity</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#18181B]">Field Label *</label>
                <input
                  required
                  type="text"
                  value={customFieldForm.fieldLabel}
                  onChange={(e) => setCustomFieldForm({ ...customFieldForm, fieldLabel: e.target.value })}
                  className="w-full mt-1 p-2 border border-[#E5E5E0] rounded-lg text-xs"
                  placeholder="Client Priority Tier"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#18181B]">Field Type *</label>
                <select
                  value={customFieldForm.fieldType}
                  onChange={(e) => setCustomFieldForm({ ...customFieldForm, fieldType: e.target.value as any })}
                  className="w-full mt-1 p-2 border border-[#E5E5E0] rounded-lg text-xs bg-white"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean (Checkbox)</option>
                  <option value="date">Date</option>
                  <option value="select">Dropdown Select</option>
                </select>
              </div>

              {customFieldForm.fieldType === "select" && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#18181B]">
                    Options (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={customFieldForm.optionsStr}
                    onChange={(e) => setCustomFieldForm({ ...customFieldForm, optionsStr: e.target.value })}
                    className="w-full mt-1 p-2 border border-[#E5E5E0] rounded-lg text-xs"
                    placeholder="Gold, Silver, Bronze"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isRequiredField"
                  checked={customFieldForm.isRequired}
                  onChange={(e) => setCustomFieldForm({ ...customFieldForm, isRequired: e.target.checked })}
                  className="rounded border-[#E5E5E0] text-[#1E3A2F]"
                />
                <label htmlFor="isRequiredField" className="text-xs text-[#18181B]">
                  Mark field as mandatory (Required)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EFEFEA]">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddCustomFieldOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={isSubmitting} className="bg-[#1E3A2F] text-white">
                  Register Field
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: SAVE FILTER VIEW */}
      {/* ===================================================================== */}
      {isSaveFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl border border-[#E5E5E0]">
            <h2 className="text-sm font-bold text-[#18181B]">Save Current Filter View</h2>
            <p className="text-xs text-[#71717A] mt-0.5">
              Preserve this query preset for easy one-click filtering.
            </p>

            <form onSubmit={handleSaveFilter} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#18181B]">View Name *</label>
                <input
                  required
                  type="text"
                  value={filterFormName}
                  onChange={(e) => setFilterFormName(e.target.value)}
                  className="w-full mt-1 p-2 border border-[#E5E5E0] rounded-lg text-xs"
                  placeholder="High Priority Accounts"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EFEFEA]">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsSaveFilterOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={isSubmitting} className="bg-[#1E3A2F] text-white">
                  Save Preset
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
