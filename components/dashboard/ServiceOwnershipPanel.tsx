"use client";

import {
  Server,
  GitBranch,
  Workflow,
  ExternalLink,
  Users,
  Tag,
  Box,
  Code2,
  Globe,
  Cpu,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@/components/ui";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { ServiceOwnershipSection, OwnedService } from "@/types";

const serviceTypeIcon = (type: OwnedService["type"]) => {
  const icons = {
    microservice: <Server size={14} className="text-blue-500" />,
    repository: <GitBranch size={14} className="text-zinc-500" />,
    api: <Globe size={14} className="text-emerald-500" />,
    script: <Code2 size={14} className="text-yellow-500" />,
    pipeline: <Workflow size={14} className="text-purple-500" />,
    infra: <Cpu size={14} className="text-orange-500" />,
  };
  return icons[type] ?? <Box size={14} />;
};

const serviceTypeBadgeColor = (type: OwnedService["type"]) => {
  const colors: Record<string, string> = {
    microservice: "bg-blue-100 text-blue-800",
    repository: "bg-zinc-100 text-zinc-700",
    api: "bg-emerald-100 text-emerald-800",
    script: "bg-yellow-100 text-yellow-800",
    pipeline: "bg-purple-100 text-purple-800",
    infra: "bg-orange-100 text-orange-800",
  };
  return colors[type] ?? "bg-zinc-100 text-zinc-700";
};

export function ServiceOwnershipPanel({
  section,
}: {
  section: ServiceOwnershipSection;
}) {
  const { ownedServices, repositories, deploymentPipelines } = section;

  const orphanedServices = ownedServices.filter(
    (s) => !s.coOwners || s.coOwners.length === 0
  );

  return (
    <div className="space-y-4">
      {/* Alert for orphaned services */}
      {orphanedServices.length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <p className="text-sm font-medium text-orange-800">
            ⚠️ {orphanedServices.length} service
            {orphanedServices.length > 1 ? "s have" : " has"} no co-owner:
          </p>
          <p className="text-xs text-orange-700 mt-1">
            {orphanedServices.map((s) => s.name).join(", ")} — assign
            successors immediately.
          </p>
        </div>
      )}

      {/* Owned Services Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server size={16} className="text-blue-500" />
            Owned Services & Systems
            <Badge variant="secondary" className="ml-auto">
              {ownedServices.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ownedServices.length === 0 && (
            <p className="text-sm text-zinc-400 text-center py-4">
              No services detected.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {ownedServices.map((service, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg border p-4 transition-colors",
                  (!service.coOwners || service.coOwners.length === 0)
                    ? "border-orange-200 bg-orange-50/40"
                    : "border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 hover:bg-zinc-50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {serviceTypeIcon(service.type)}
                    <span className="text-sm font-semibold text-zinc-900">
                      {service.name}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize shrink-0",
                      serviceTypeBadgeColor(service.type)
                    )}
                  >
                    {service.type}
                  </span>
                </div>

                <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">
                  {service.description}
                </p>

                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  {service.repo && (
                    <a
                      href={`https://github.com/${service.repo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                    >
                      <GitBranch size={10} />
                      {service.repo}
                    </a>
                  )}
                  {service.deploymentUrl && (
                    <a
                      href={service.deploymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800"
                    >
                      <ExternalLink size={10} />
                      Deployment
                    </a>
                  )}
                </div>

                <div className="mt-2.5 flex items-center justify-between">
                  {service.coOwners && service.coOwners.length > 0 ? (
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Users size={11} />
                      {service.coOwners.join(", ")}
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-orange-600">
                      ⚠ No co-owner
                    </span>
                  )}
                  {service.lastDeployed && (
                    <span className="text-xs text-zinc-400">
                      {formatRelativeTime(service.lastDeployed)}
                    </span>
                  )}
                </div>

                {service.tags && service.tags.length > 0 && (
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {service.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px]">
                        <Tag size={8} className="mr-0.5" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Repositories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch size={16} className="text-zinc-500" />
              Repositories
              <Badge variant="secondary" className="ml-auto">
                {repositories.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {repositories.map((repo, i) => (
              <a
                key={i}
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 hover:border-zinc-200 hover:bg-zinc-50 transition-colors group"
              >
                <GitBranch size={14} className="shrink-0 text-zinc-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">
                    {repo.name}
                  </p>
                  {repo.description && (
                    <p className="text-xs text-zinc-400 truncate">
                      {repo.description}
                    </p>
                  )}
                </div>
                {repo.primaryLanguage && (
                  <span className="shrink-0 text-xs text-zinc-500">
                    {repo.primaryLanguage}
                  </span>
                )}
                <ExternalLink
                  size={12}
                  className="shrink-0 text-zinc-300 group-hover:text-zinc-500"
                />
              </a>
            ))}
          </CardContent>
        </Card>

        {/* Deployment Pipelines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow size={16} className="text-purple-500" />
              Deployment Pipelines
              <Badge variant="secondary" className="ml-auto">
                {deploymentPipelines.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {deploymentPipelines.map((pipeline, i) => (
              <div
                key={i}
                className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-900">
                    {pipeline.name}
                  </p>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {pipeline.environment}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {pipeline.description}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  {pipeline.url && (
                    <a
                      href={pipeline.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      View pipeline →
                    </a>
                  )}
                  {pipeline.lastRun && (
                    <span className="text-xs text-zinc-400">
                      Last run {formatRelativeTime(pipeline.lastRun)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

