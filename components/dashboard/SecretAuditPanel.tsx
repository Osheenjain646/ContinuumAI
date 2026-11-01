"use client";

import {
  ShieldAlert,
  KeyRound,
  Cloud,
  AlertOctagon,
  CheckCircle2,
  ExternalLink,
  ClipboardList,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@/components/ui";
import { cn, formatRelativeTime, severityColor } from "@/lib/utils";
import type { SecretAuditSection, SecretRiskAlert } from "@/types";

const alertTypeIcon = (type: SecretRiskAlert["type"]) => {
  switch (type) {
    case "hardcoded-pat":
    case "api-key":
    case "unrotated-secret":
      return <KeyRound size={14} className="shrink-0" />;
    case "ssh-key":
      return <ShieldAlert size={14} className="shrink-0" />;
    case "cloud-resource":
      return <Cloud size={14} className="shrink-0" />;
    default:
      return <AlertOctagon size={14} className="shrink-0" />;
  }
};

const alertTypeLabel: Record<string, string> = {
  "hardcoded-pat": "Hardcoded PAT",
  "api-key": "API Key",
  "ssh-key": "SSH Key",
  "cloud-resource": "Cloud Resource",
  "unrotated-secret": "Unrotated Secret",
};

const cloudStatusColor: Record<string, string> = {
  active: "text-blue-700 bg-blue-100",
  idle: "text-yellow-700 bg-yellow-100",
  orphaned: "text-red-700 bg-red-100",
};

export function SecretAuditPanel({ section }: { section: SecretAuditSection }) {
  const { alerts, cloudResources, accessRecommendations } = section;

  const critical = alerts.filter((a) => a.severity === "critical");
  const high = alerts.filter((a) => a.severity === "high");
  const others = alerts.filter(
    (a) => a.severity !== "critical" && a.severity !== "high"
  );

  const sortedAlerts = [...critical, ...high, ...others];

  return (
    <div className="space-y-4">
      {/* Critical Banner */}
      {critical.length > 0 && (
        <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <AlertOctagon size={18} className="text-red-600 shrink-0" />
            <p className="text-sm font-bold text-red-800">
              {critical.length} CRITICAL Security Alert
              {critical.length > 1 ? "s" : ""} Require Immediate Action
            </p>
          </div>
          <ul className="mt-2 space-y-1">
            {critical.map((a) => (
              <li key={a.id} className="text-xs text-red-700 ml-6">
                • {a.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-red-500" />
            Security & Access Alerts
            <Badge variant="secondary" className="ml-auto">
              {alerts.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {alerts.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-6">
              <CheckCircle2 size={28} className="text-emerald-400" />
              <p className="text-sm text-zinc-400">No security alerts detected.</p>
            </div>
          )}
          {sortedAlerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "rounded-lg border p-4",
                alert.severity === "critical"
                  ? "border-red-300 bg-red-50"
                  : alert.severity === "high"
                  ? "border-orange-200 bg-orange-50/50"
                  : alert.severity === "medium"
                  ? "border-yellow-200 bg-yellow-50/30"
                  : "border-zinc-200 bg-zinc-50/30"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5",
                    severityColor(alert.severity).split(" ")[0]
                  )}
                >
                  {alertTypeIcon(alert.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border",
                          severityColor(alert.severity)
                        )}
                      >
                        {alert.severity}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {alertTypeLabel[alert.type] ?? alert.type}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      {formatRelativeTime(alert.detected)}
                    </span>
                  </div>

                  <p className="mt-2 text-xs font-medium text-zinc-800">
                    {alert.description}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500 font-mono bg-zinc-100 rounded px-2 py-1">
                    {alert.location}
                  </p>

                  <div className="mt-2.5 rounded-md bg-white/80 border border-zinc-200 p-2">
                    <p className="text-[11px] font-medium text-zinc-700">
                      💡 Recommendation:
                    </p>
                    <p className="text-[11px] text-zinc-600 mt-0.5 leading-relaxed">
                      {alert.recommendation}
                    </p>
                  </div>

                  {alert.sourceUrl && (
                    <a
                      href={alert.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink size={11} />
                      View source
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Cloud Resources */}
      {cloudResources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud size={16} className="text-sky-500" />
              Linked Cloud Resources
              <Badge variant="secondary" className="ml-auto">
                {cloudResources.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {cloudResources.map((resource, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50/50 p-3"
              >
                <Cloud size={14} className="shrink-0 text-sky-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900">
                    {resource.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {resource.type} · {resource.provider}
                    {resource.region ? ` · ${resource.region}` : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                    cloudStatusColor[resource.status] ??
                      "text-zinc-600 bg-zinc-100"
                  )}
                >
                  {resource.status}
                </span>
                {resource.url && (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-zinc-400 hover:text-zinc-600"
                  >
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Access Recommendations Checklist */}
      {accessRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList size={16} className="text-emerald-500" />
              Access Revocation Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {accessRecommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-zinc-300 bg-white text-[10px] font-bold text-zinc-500">
                    {i + 1}
                  </span>
                  <span className="text-sm text-zinc-700 leading-relaxed">
                    {rec}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

