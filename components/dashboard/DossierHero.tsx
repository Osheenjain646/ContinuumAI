"use client";

import {
  GitBranch,
  GitPullRequest,
  AlertTriangle,
  Clock,
  TrendingUp,
  Activity,
  Shield,
  Layers,
} from "lucide-react";
import { Card, CardContent, Avatar, Progress } from "@/components/ui";
import { cn, scoreToColor, scoreToRingColor, formatRelativeTime } from "@/lib/utils";
import type { HandoverDossier } from "@/types";

// ─── Circular Readiness Score Gauge ──────────────────────────────────────────

function ReadinessGauge({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="130" height="130" className="-rotate-90">
        <circle
          cx="65"
          cy="65"
          r={r}
          fill="none"
          stroke="#f4f4f5"
          strokeWidth="10"
        />
        <circle
          cx="65"
          cy="65"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          className={cn("transition-all duration-700", scoreToRingColor(score))}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn("text-3xl font-bold", scoreToColor(score))}>
          {score}%
        </span>
        <span className="text-xs text-zinc-500 mt-0.5">Readiness</span>
      </div>
    </div>
  );
}

// ─── Sub-score mini-bars ──────────────────────────────────────────────────────

function SubScore({
  label,
  score,
  icon: Icon,
}: {
  label: string;
  score: number;
  icon: React.ElementType;
}) {
  const colorClass =
    score >= 80
      ? "bg-emerald-500"
      : score >= 60
      ? "bg-yellow-500"
      : score >= 40
      ? "bg-orange-500"
      : "bg-red-500";

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 shrink-0">
        <Icon size={14} className="text-zinc-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-zinc-600 truncate">{label}</span>
          <span className={cn("text-xs font-semibold", scoreToColor(score))}>
            {score}%
          </span>
        </div>
        <Progress value={score} colorClass={colorClass} />
      </div>
    </div>
  );
}

// ─── Summary Stats Row ────────────────────────────────────────────────────────

function StatChip({
  label,
  value,
  icon: Icon,
  alert,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  alert?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg p-3 border",
        alert && value > 0
          ? "border-red-200 bg-red-50"
          : "border-zinc-200 bg-zinc-50"
      )}
    >
      <Icon
        size={16}
        className={alert && value > 0 ? "text-red-500" : "text-zinc-500"}
      />
      <div>
        <div
          className={cn(
            "text-xl font-bold leading-none",
            alert && value > 0 ? "text-red-700" : "text-zinc-900"
          )}
        >
          {value}
        </div>
        <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ─── Main Hero Panel ──────────────────────────────────────────────────────────

export function DossierHero({ dossier }: { dossier: HandoverDossier }) {
  const { departingEmployee: emp, readinessScore, readinessBreakdown, sections } = dossier;

  const criticalAlerts = sections.secretAudit.alerts.filter(
    (a) => a.severity === "critical"
  ).length;
  const openPRs = sections.activeWork.pendingPRReviews.length;
  const blockedTasks = sections.activeWork.inFlightTasks.filter(
    (t) => t.status === "blocked"
  ).length;
  const ownedServices = sections.serviceOwnership.ownedServices.length;

  return (
    <Card className="overflow-hidden">
      {/* Header gradient band */}
      <div className="h-2 bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400" />

      <CardContent className="pt-5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Employee Info */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <Avatar
              src={emp.avatarUrl}
              alt={emp.name}
              fallback={emp.name}
              size="lg"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-semibold text-zinc-900">
                  {emp.name}
                </h2>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  Departing
                </span>
              </div>
              <p className="text-sm text-zinc-500 mt-0.5">
                {emp.role} · {emp.team}
              </p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {emp.githubUsername && (
                  <a
                    href={`https://github.com/${emp.githubUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900"
                  >
                    <GitBranch size={12} />
                    @{emp.githubUsername}
                  </a>
                )}
                <span className="text-xs text-zinc-400">{emp.email}</span>
                {emp.lastActiveDate && (
                  <span className="text-xs text-zinc-400">
                    Last active {formatRelativeTime(emp.lastActiveDate)}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1.5">
                Dossier generated {formatRelativeTime(dossier.generatedAt)} ·
                Updated {formatRelativeTime(dossier.lastUpdated)}
              </p>
            </div>
          </div>

          {/* Readiness Gauge */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <ReadinessGauge score={readinessScore} />
            <div className="w-full max-w-[200px] space-y-2">
              <SubScore
                label="Active Work"
                score={readinessBreakdown.activeWork}
                icon={Activity}
              />
              <SubScore
                label="Service Ownership"
                score={readinessBreakdown.serviceOwnership}
                icon={Layers}
              />
              <SubScore
                label="Implicit Knowledge"
                score={readinessBreakdown.implicitKnowledge}
                icon={TrendingUp}
              />
              <SubScore
                label="Security Audit"
                score={readinessBreakdown.securityAudit}
                icon={Shield}
              />
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatChip
            label="Open PRs"
            value={openPRs}
            icon={GitPullRequest}
            alert={openPRs > 2}
          />
          <StatChip
            label="Blocked Tasks"
            value={blockedTasks}
            icon={Clock}
            alert={blockedTasks > 0}
          />
          <StatChip
            label="Owned Services"
            value={ownedServices}
            icon={Layers}
          />
          <StatChip
            label="Security Alerts"
            value={criticalAlerts}
            icon={AlertTriangle}
            alert={criticalAlerts > 0}
          />
        </div>
      </CardContent>
    </Card>
  );
}

