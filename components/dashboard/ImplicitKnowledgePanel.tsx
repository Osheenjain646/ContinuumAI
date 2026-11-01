"use client";

import {
  Wrench,
  AlertTriangle,
  BookOpen,
  ExternalLink,
  Link2,
  Lightbulb,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@/components/ui";
import { cn, formatDate, severityColor } from "@/lib/utils";
import type { ImplicitKnowledgeSection } from "@/types";

const categoryLabel: Record<string, string> = {
  workaround: "Workaround",
  "unwritten-rule": "Unwritten Rule",
  "architectural-debt": "Arch. Debt",
  "edge-case": "Edge Case",
};

const sourceLabel: Record<string, string> = {
  slack: "Slack",
  "github-pr": "GitHub PR",
  "github-commit": "GitHub Commit",
  notion: "Notion",
  "google-docs": "Google Docs",
};

export function ImplicitKnowledgePanel({
  section,
}: {
  section: ImplicitKnowledgeSection;
}) {
  const { techDebt, workarounds, architecturalDecisions } = section;

  const highSeverity = techDebt.filter((d) => d.severity === "high");

  return (
    <div className="space-y-4">
      {highSeverity.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">
            🔴 {highSeverity.length} high-severity technical debt item
            {highSeverity.length > 1 ? "s" : ""} require immediate attention
          </p>
          <p className="text-xs text-red-700 mt-1">
            {highSeverity.map((d) => d.title).join(" · ")}
          </p>
        </div>
      )}

      {/* Tech Debt */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench size={16} className="text-orange-500" />
            Technical Debt & Known Issues
            <Badge variant="secondary" className="ml-auto">
              {techDebt.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {techDebt.length === 0 && (
            <p className="text-sm text-zinc-400 text-center py-4">
              No tech debt items detected.
            </p>
          )}
          {techDebt.map((item) => (
            <div
              key={item.id}
              className={cn(
                "rounded-lg border p-4",
                item.severity === "high"
                  ? "border-red-200 bg-red-50/40"
                  : item.severity === "medium"
                  ? "border-yellow-200 bg-yellow-50/30"
                  : "border-zinc-200 bg-zinc-50/40"
              )}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={15}
                  className={cn(
                    "mt-0.5 shrink-0",
                    item.severity === "high"
                      ? "text-red-500"
                      : item.severity === "medium"
                      ? "text-yellow-500"
                      : "text-zinc-400"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-zinc-900">
                      {item.title}
                    </span>
                    <div className="flex gap-1.5 shrink-0">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize border",
                          severityColor(item.severity as "high" | "medium" | "low")
                        )}
                      >
                        {item.severity}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {categoryLabel[item.category] ?? item.category}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-600 leading-relaxed">
                    {item.description}
                  </p>
                  <div className="mt-2.5 flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] text-zinc-400">
                      Source: {sourceLabel[item.source] ?? item.source}
                    </span>
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink size={11} />
                      View source
                    </a>
                  </div>
                  {item.tags && item.tags.length > 0 && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Workarounds */}
      {workarounds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb size={16} className="text-yellow-500" />
              Undocumented Workarounds
              <Badge variant="secondary" className="ml-auto">
                {workarounds.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {workarounds.map((w, i) => (
              <div
                key={i}
                className="rounded-lg border border-yellow-200 bg-yellow-50/40 p-4"
              >
                <div className="flex items-start gap-2">
                  <Wrench size={14} className="mt-0.5 shrink-0 text-yellow-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">
                      {w.title}
                    </p>
                    <Badge
                      variant="outline"
                      className="mt-1 text-[10px] border-yellow-300"
                    >
                      Affects: {w.affectedSystem}
                    </Badge>
                    <p className="mt-2 text-xs text-zinc-600 leading-relaxed">
                      {w.description}
                    </p>
                    <div className="mt-2.5 flex items-center gap-3 flex-wrap">
                      <a
                        href={w.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink size={11} />
                        Source discussion
                      </a>
                      {w.crossRefs?.map((ref, j) => (
                        <a
                          key={j}
                          href={ref.slackThreadUrl ?? ref.githubPrUrl ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800"
                        >
                          <Link2 size={11} />
                          {ref.summary.slice(0, 50)}…
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Architectural Decisions */}
      {architecturalDecisions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen size={16} className="text-indigo-500" />
              Architectural Decisions (ADRs)
              <Badge variant="secondary" className="ml-auto">
                {architecturalDecisions.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {architecturalDecisions.map((adr, i) => (
              <div
                key={i}
                className="rounded-lg border border-indigo-100 bg-indigo-50/30 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-900">
                    {adr.title}
                  </p>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {formatDate(adr.date)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-zinc-600 leading-relaxed">
                  <span className="font-medium text-zinc-700">Rationale:</span>{" "}
                  {adr.rationale}
                </p>
                {adr.alternatives && (
                  <p className="mt-1.5 text-xs text-zinc-500">
                    <span className="font-medium">Alternatives considered:</span>{" "}
                    {adr.alternatives}
                  </p>
                )}
                <div className="mt-2.5 flex items-center gap-3 flex-wrap">
                  {adr.participants && (
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Users size={11} />
                      {adr.participants.join(", ")}
                    </div>
                  )}
                  {adr.sourceUrl && (
                    <a
                      href={adr.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink size={11} />
                      View ADR
                    </a>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

