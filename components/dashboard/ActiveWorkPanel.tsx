"use client";

import {
  GitPullRequest,
  Clock,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Tag,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";
import { cn, formatRelativeTime, statusColor, prStateColor } from "@/lib/utils";
import type { ActiveWorkSection } from "@/types";

function statusIcon(status: string) {
  switch (status) {
    case "blocked":
      return <AlertCircle size={14} className="text-red-500 shrink-0" />;
    case "in-progress":
      return <Clock size={14} className="text-blue-500 shrink-0" />;
    case "needs-review":
      return <ChevronRight size={14} className="text-purple-500 shrink-0" />;
    default:
      return <CheckCircle2 size={14} className="text-zinc-400 shrink-0" />;
  }
}

function priorityDot(priority: string) {
  const colors = {
    urgent: "bg-red-500",
    high: "bg-orange-400",
    medium: "bg-yellow-400",
    low: "bg-zinc-300",
  };
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full shrink-0",
        colors[priority as keyof typeof colors] ?? "bg-zinc-300"
      )}
    />
  );
}

export function ActiveWorkPanel({ section }: { section: ActiveWorkSection }) {
  const { inFlightTasks, pendingPRReviews, openBugs, upcomingDeadlines } = section;

  return (
    <div className="space-y-4">
      {/* In-flight Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={16} className="text-blue-500" />
            In-Flight Tasks
            <Badge variant="secondary" className="ml-auto">
              {inFlightTasks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {inFlightTasks.length === 0 && (
            <p className="text-sm text-zinc-400 text-center py-4">No active tasks found.</p>
          )}
          {inFlightTasks.map((task, i) => (
            <div
              key={i}
              className="group rounded-lg border border-zinc-100 bg-zinc-50/50 p-3.5 hover:border-zinc-200 hover:bg-zinc-50 transition-colors"
            >
              <div className="flex items-start gap-2.5">
                {statusIcon(task.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      {priorityDot(task.priority)}
                      <span className="text-sm font-medium text-zinc-900">
                        {task.title}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        statusColor(
                          task.status as "blocked" | "in-progress" | "needs-review" | "upcoming"
                        )
                      )}
                    >
                      {task.status.replace("-", " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                    {task.description}
                  </p>
                  <div className="mt-2 flex items-center gap-3 flex-wrap">
                    {task.sourceUrl && (
                      <a
                        href={task.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink size={11} />
                        Source
                      </a>
                    )}
                    {task.dueDate && (
                      <span className="text-xs text-zinc-400">
                        Due {formatRelativeTime(task.dueDate)}
                      </span>
                    )}
                    {task.crossRefs?.map((ref, j) => (
                      <span key={j} className="text-xs text-zinc-400">
                        ↔ {ref.summary.slice(0, 60)}…
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pending PR Reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitPullRequest size={16} className="text-purple-500" />
              Open PRs Awaiting Review
              <Badge variant="secondary" className="ml-auto">
                {pendingPRReviews.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {pendingPRReviews.length === 0 && (
              <p className="text-sm text-zinc-400 text-center py-3">No pending PRs.</p>
            )}
            {pendingPRReviews.map((pr) => (
              <a
                key={pr.id}
                href={pr.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2.5 rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 hover:border-zinc-200 hover:bg-zinc-50 transition-colors group"
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                    prStateColor(pr.state)
                  )}
                >
                  {pr.state}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-zinc-900 truncate">
                      #{pr.number} {pr.title}
                    </span>
                    <ArrowUpRight
                      size={12}
                      className="shrink-0 text-zinc-400 group-hover:text-zinc-600"
                    />
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {pr.repo} · {formatRelativeTime(pr.updatedAt)}
                  </p>
                  {pr.labels && pr.labels.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {pr.labels.map((label) => (
                        <Badge key={label} variant="outline" className="text-[10px]">
                          <Tag size={9} className="mr-0.5" />
                          {label}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </a>
            ))}
          </CardContent>
        </Card>

        {/* Open Bugs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500" />
              Open Bugs
              <Badge variant="secondary" className="ml-auto">
                {openBugs.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {openBugs.length === 0 && (
              <p className="text-sm text-zinc-400 text-center py-3">No open bugs found.</p>
            )}
            {openBugs.map((bug, i) => (
              <a
                key={i}
                href={bug.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 hover:border-zinc-200 hover:bg-zinc-50 transition-colors group"
              >
                <Badge
                  variant={
                    bug.severity === "P1" ? "destructive" : "secondary"
                  }
                  className="shrink-0 text-[10px]"
                >
                  {bug.severity}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">
                    {bug.title}
                  </p>
                  {bug.assignedTo && (
                    <p className="text-xs text-zinc-400">
                      Assigned to {bug.assignedTo}
                    </p>
                  )}
                </div>
                <ArrowUpRight
                  size={12}
                  className="shrink-0 text-zinc-400 group-hover:text-zinc-600"
                />
              </a>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Deadlines */}
      {upcomingDeadlines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {upcomingDeadlines.map((deadline, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50/50 p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900">{deadline.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{deadline.description}</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-amber-700">
                  {formatRelativeTime(deadline.dueDate)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

