"use client";

import { useState } from "react";
import {
  Activity,
  Layers,
  Brain,
  ShieldAlert,
  MessageSquare,
  RefreshCw,
  Settings,
  Bell,
  Zap,
  ChevronDown,
} from "lucide-react";
import { DossierHero } from "@/components/dashboard/DossierHero";
import { ActiveWorkPanel } from "@/components/dashboard/ActiveWorkPanel";
import { ServiceOwnershipPanel } from "@/components/dashboard/ServiceOwnershipPanel";
import { ImplicitKnowledgePanel } from "@/components/dashboard/ImplicitKnowledgePanel";
import { SecretAuditPanel } from "@/components/dashboard/SecretAuditPanel";
import { AskDepartureChat } from "@/components/chat/AskDepartureChat";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui";
import { generateMockDossier } from "@/lib/mock-data";
import type { HandoverDossier } from "@/types";

const dossier: HandoverDossier = generateMockDossier();

const tabs = [
  {
    value: "active-work",
    label: "Active Work",
    icon: Activity,
    alertCount: dossier.sections.activeWork.inFlightTasks.filter(
      (t) => t.status === "blocked"
    ).length,
    alertColor: "bg-red-500",
  },
  {
    value: "ownership",
    label: "Ownership Map",
    icon: Layers,
    alertCount: dossier.sections.serviceOwnership.ownedServices.filter(
      (s) => !s.coOwners || s.coOwners.length === 0
    ).length,
    alertColor: "bg-orange-500",
  },
  {
    value: "knowledge",
    label: "Implicit Knowledge",
    icon: Brain,
    alertCount: dossier.sections.implicitKnowledge.techDebt.filter(
      (d) => d.severity === "high"
    ).length,
    alertColor: "bg-yellow-500",
  },
  {
    value: "security",
    label: "Security Audit",
    icon: ShieldAlert,
    alertCount: dossier.sections.secretAudit.alerts.filter(
      (a) => a.severity === "critical" || a.severity === "high"
    ).length,
    alertColor: "bg-red-600",
  },
  {
    value: "chat",
    label: "Ask Departure Bot",
    icon: MessageSquare,
    alertCount: 0,
    alertColor: "",
  },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("active-work");

  const totalAlerts = dossier.sections.secretAudit.alerts.filter(
    (a) => a.severity === "critical"
  ).length;

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-blue-500 shadow-sm">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-base font-bold text-zinc-900">
              Continuum
              <span className="ml-1 text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-500">
                AI
              </span>
            </span>
          </div>

          <div className="mx-4 h-5 w-px bg-zinc-200" />

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm text-zinc-500 min-w-0">
            <span className="hidden sm:block">Dossiers</span>
            <ChevronDown size={14} className="hidden sm:block rotate-[-90deg]" />
            <span className="font-medium text-zinc-900 truncate">
              {dossier.departingEmployee.name}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {totalAlerts > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-2.5 py-1">
                <Bell size={13} className="text-red-600" />
                <span className="text-xs font-medium text-red-700">
                  {totalAlerts} critical alert{totalAlerts > 1 ? "s" : ""}
                </span>
              </div>
            )}
            <Button variant="outline" size="sm">
              <RefreshCw size={13} />
              <span className="hidden sm:block">Refresh</span>
            </Button>
            <Button variant="ghost" size="icon">
              <Settings size={16} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Hero */}
        <DossierHero dossier={dossier} />

        {/* Tabbed Dossier */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Tab Bar */}
          <TabsList className="flex h-auto flex-wrap gap-1 bg-zinc-100 p-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-1.5"
              >
                <tab.icon size={14} />
                <span className="hidden sm:block">{tab.label}</span>
                <span className="sm:hidden">
                  {tab.label.split(" ")[0]}
                </span>
                {tab.alertCount > 0 && (
                  <span
                    className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white ${tab.alertColor}`}
                  >
                    {tab.alertCount}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="active-work">
            <ActiveWorkPanel section={dossier.sections.activeWork} />
          </TabsContent>

          <TabsContent value="ownership">
            <ServiceOwnershipPanel
              section={dossier.sections.serviceOwnership}
            />
          </TabsContent>

          <TabsContent value="knowledge">
            <ImplicitKnowledgePanel
              section={dossier.sections.implicitKnowledge}
            />
          </TabsContent>

          <TabsContent value="security">
            <SecretAuditPanel section={dossier.sections.secretAudit} />
          </TabsContent>

          <TabsContent value="chat">
            <AskDepartureChat dossier={dossier} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-zinc-200 bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-between">
          <p className="text-xs text-zinc-400">
            Continuum AI · Automated Knowledge Transfer Engine
          </p>
          <p className="text-xs text-zinc-400">
            Powered by Gemini 3.8 Flash
          </p>
        </div>
      </footer>
    </div>
  );
}

