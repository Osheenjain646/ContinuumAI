/**
 * Mock data generator for demo/development purposes
 * Generates a realistic HandoverDossier without requiring real API keys
 */

import type { HandoverDossier } from "@/types";

export function generateMockDossier(): HandoverDossier {
  return {
    id: "demo-001",
    departingEmployee: {
      name: "Alex Rivera",
      email: "alex.rivera@acmecorp.com",
      githubUsername: "alexrivera",
      slackUserId: "U04XYZ123",
      role: "Senior Platform Engineer",
      team: "Infrastructure",
      lastActiveDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
    },
    generatedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    readinessScore: 62,
    readinessBreakdown: {
      activeWork: 55,
      serviceOwnership: 70,
      implicitKnowledge: 50,
      securityAudit: 40,
    },
    sections: {
      activeWork: {
        inFlightTasks: [
          {
            title: "Migrate auth service to JWT RS256",
            description:
              "Half-done migration from HS256 to RS256 for the auth-gateway service. Keys are stored in Vault at /secret/auth/jwt-keys. PR #847 has the new key rotation script but hasn't been reviewed.",
            status: "in-progress",
            priority: "urgent",
            sourceUrl: "https://github.com/acmecorp/auth-gateway/pull/847",
            crossRefs: [
              {
                slackThreadUrl:
                  "https://acmecorp.slack.com/archives/C01INFRA/p1699451234",
                githubPrUrl:
                  "https://github.com/acmecorp/auth-gateway/pull/847",
                summary:
                  "Slack discussion where Alex explained why RS256 was needed for multi-service SSO",
              },
            ],
          },
          {
            title: "Fix memory leak in telemetry collector",
            description:
              "The Prometheus collector in services/telemetry leaks ~50MB/day due to label cardinality explosion. Alex had a fix partially committed but it needs the metrics_filter config to be updated in Kubernetes manifests.",
            status: "blocked",
            priority: "high",
            sourceUrl:
              "https://github.com/acmecorp/platform/issues/1203",
            crossRefs: [
              {
                slackThreadUrl:
                  "https://acmecorp.slack.com/archives/C01OPS/p1699384521",
                summary:
                  "Thread where Alex diagnosed the cardinality issue and outlined fix steps",
              },
            ],
          },
          {
            title: "Postgres connection pool exhaustion runbook",
            description:
              "Started writing a runbook for the recurring Postgres connection pool exhaustion that happens during Black Friday traffic spikes. Partial draft is in Notion under Engineering > Runbooks > DB.",
            status: "needs-review",
            priority: "high",
            sourceUrl:
              "https://notion.so/acmecorp/db-connection-pool-runbook-draft",
          },
          {
            title: "Upgrade Terraform modules to v5.x",
            description:
              "Scheduled upgrade for infra/terraform/modules. Currently blocked because AWS provider v5 has breaking changes for our EKS node group config. Alex identified the specific config changes needed.",
            status: "upcoming",
            priority: "medium",
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            sourceUrl:
              "https://github.com/acmecorp/infra/issues/567",
          },
        ],
        pendingPRReviews: [
          {
            id: 847,
            number: 847,
            title: "feat: Migrate auth gateway to RS256 JWT signing",
            state: "open",
            url: "https://github.com/acmecorp/auth-gateway/pull/847",
            repo: "acmecorp/auth-gateway",
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            reviewers: ["sam_devops", "priya_sec"],
            labels: ["security", "needs-review"],
            draft: false,
          },
          {
            id: 912,
            number: 912,
            title: "fix: Reduce Prometheus label cardinality in telemetry service",
            state: "open",
            url: "https://github.com/acmecorp/platform/pull/912",
            repo: "acmecorp/platform",
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            labels: ["bug", "observability"],
            draft: false,
          },
        ],
        openBugs: [
          {
            title: "auth-gateway: token refresh occasionally returns 500",
            url: "https://github.com/acmecorp/auth-gateway/issues/1044",
            severity: "P1",
            assignedTo: "alex.rivera",
          },
          {
            title: "K8s HPA not scaling down after traffic drop",
            url: "https://github.com/acmecorp/platform/issues/1287",
            severity: "P2",
          },
        ],
        upcomingDeadlines: [
          {
            title: "Q4 Infra Cost Review",
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            description:
              "Alex was leading the Q4 infra cost review with Finance. All EC2 rightsizing recommendations are in a spreadsheet shared with the team.",
          },
        ],
      },
      serviceOwnership: {
        ownedServices: [
          {
            name: "auth-gateway",
            type: "microservice",
            description:
              "Central authentication and authorization gateway. Handles JWT issuance, validation, and RBAC policy enforcement for all internal services.",
            repo: "acmecorp/auth-gateway",
            deploymentUrl: "https://auth.internal.acmecorp.com",
            lastDeployed: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
            coOwners: ["priya_sec"],
            tags: ["critical", "security", "jwt"],
          },
          {
            name: "platform-infra",
            type: "infra",
            description:
              "All Terraform IaC for AWS: EKS clusters, RDS, VPC, IAM roles, S3 buckets. Alex was the primary author of 80% of the modules.",
            repo: "acmecorp/infra",
            coOwners: [],
            tags: ["terraform", "aws", "eks"],
          },
          {
            name: "telemetry-collector",
            type: "microservice",
            description:
              "Prometheus-compatible metrics collection sidecar. Deployed as DaemonSet across all EKS nodes.",
            repo: "acmecorp/platform",
            deploymentUrl: "https://metrics.internal.acmecorp.com",
            coOwners: ["devops_team"],
            tags: ["observability", "prometheus", "kubernetes"],
          },
          {
            name: "deploy-pipeline",
            type: "pipeline",
            description:
              "GitHub Actions workflows for CI/CD across all services. Alex created the reusable workflow library at .github/workflows/.",
            repo: "acmecorp/platform",
            tags: ["ci-cd", "github-actions"],
          },
          {
            name: "secret-rotation-cron",
            type: "script",
            description:
              "Python script running as a K8s CronJob to auto-rotate Vault secrets every 30 days. Only Alex knows the Vault AppRole credentials.",
            repo: "acmecorp/infra",
            tags: ["security", "vault", "secrets"],
          },
        ],
        repositories: [
          {
            name: "acmecorp/auth-gateway",
            url: "https://github.com/acmecorp/auth-gateway",
            primaryLanguage: "Go",
            description: "Authentication and authorization gateway service",
            isPrivate: true,
          },
          {
            name: "acmecorp/infra",
            url: "https://github.com/acmecorp/infra",
            primaryLanguage: "HCL",
            description: "Terraform infrastructure-as-code",
            isPrivate: true,
          },
          {
            name: "acmecorp/platform",
            url: "https://github.com/acmecorp/platform",
            primaryLanguage: "TypeScript",
            description: "Platform services monorepo",
            isPrivate: true,
          },
        ],
        deploymentPipelines: [
          {
            name: "auth-gateway-prod",
            description: "Production deployment pipeline for auth-gateway. Requires manual approval from @sec-team.",
            environment: "production",
            lastRun: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
            url: "https://github.com/acmecorp/auth-gateway/actions",
          },
          {
            name: "terraform-apply",
            description: "Atlantis-based Terraform apply pipeline. Alex had admin access to the Atlantis server.",
            environment: "all",
            lastRun: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            url: "https://atlantis.internal.acmecorp.com",
          },
        ],
      },
      implicitKnowledge: {
        techDebt: [
          {
            id: "td-001",
            title: "Auth service silently swallows validation errors",
            description:
              "In auth-gateway/internal/validator.go line 187, there's a bare error swallow (err = nil) that was added as a quick fix for a prod incident. The root cause (malformed OIDC payloads from Google Workspace) was never resolved.",
            source: "github-pr",
            sourceUrl: "https://github.com/acmecorp/auth-gateway/pull/612#discussion_r1234567",
            severity: "high",
            category: "workaround",
            tags: ["auth", "security", "silent-failure"],
          },
          {
            id: "td-002",
            title: "Terraform state is split across 3 S3 buckets",
            description:
              "Legacy decision: infra state was never consolidated. Bucket A has prod VPC/IAM, Bucket B has EKS, Bucket C has RDS. The state split causes drift detection issues. Alex had a migration plan drafted but never executed.",
            source: "slack",
            sourceUrl: "https://acmecorp.slack.com/archives/C01INFRA/p1698123456",
            severity: "medium",
            category: "architectural-debt",
            tags: ["terraform", "s3", "state"],
          },
          {
            id: "td-003",
            title: "Hardcoded staging DB password in K8s ConfigMap",
            description:
              'In namespace "staging", ConfigMap "api-config" has DB_PASSWORD as a plaintext field (not a Secret). Was never migrated to ExternalSecrets due to time constraints.',
            source: "github-commit",
            sourceUrl: "https://github.com/acmecorp/platform/commit/3a7f891",
            severity: "high",
            category: "workaround",
            tags: ["security", "kubernetes", "secrets"],
          },
        ],
        workarounds: [
          {
            title: "Manual Vault token refresh for secret-rotation-cron",
            description:
              "The Vault AppRole token used by the secret-rotation-cron expires every 90 days. Alex would manually SSH into the cron pod and re-authenticate. There is no automated renewal. Next expiry: Dec 15, 2026.",
            affectedSystem: "secret-rotation-cron",
            sourceUrl:
              "https://acmecorp.slack.com/archives/C01OPS/p1699001234",
            crossRefs: [
              {
                slackThreadUrl:
                  "https://acmecorp.slack.com/archives/C01OPS/p1699001234",
                summary:
                  "Alex explained the manual process in this Slack thread after an on-call incident",
              },
            ],
          },
          {
            title: "EKS node drain requires specific label order",
            description:
              "When draining EKS nodes during upgrades, you MUST set the 'drain-ready=true' label before running kubectl drain, otherwise the PodDisruptionBudget for auth-gateway blocks the drain indefinitely. Alex documented the exact command sequence in Notion.",
            affectedSystem: "platform-infra / EKS",
            sourceUrl:
              "https://notion.so/acmecorp/eks-node-drain-procedure",
          },
        ],
        architecturalDecisions: [
          {
            title: "Chose Vault over AWS Secrets Manager for secrets",
            rationale:
              "AWS Secrets Manager was evaluated but rejected due to cost ($0.40/secret/month × 400+ secrets) and multi-cloud requirements. HashiCorp Vault on EKS was chosen for flexibility and cost efficiency.",
            alternatives:
              "AWS Secrets Manager, GCP Secret Manager, Kubernetes Secrets with SOPS encryption",
            date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
            participants: ["alex.rivera", "cto_team", "sec_lead"],
            sourceUrl:
              "https://notion.so/acmecorp/adr-0012-secrets-management",
          },
          {
            title: "Auth gateway uses RS256 (not HS256) for JWT signing",
            rationale:
              "Migrating to RS256 to support multi-service verification without sharing the signing secret. Services can independently verify tokens using the public key from /.well-known/jwks.json.",
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            participants: ["alex.rivera", "priya_sec"],
            sourceUrl:
              "https://github.com/acmecorp/auth-gateway/pull/847",
          },
        ],
      },
      secretAudit: {
        alerts: [
          {
            id: "sa-001",
            severity: "critical",
            type: "unrotated-secret",
            description:
              "Vault AppRole credentials for secret-rotation-cron have not been rotated in 85 days (5 days until expiry). Only Alex has the root credentials to regenerate them.",
            location: "K8s: namespace=infra / CronJob=secret-rotation-cron",
            sourceUrl:
              "https://acmecorp.slack.com/archives/C01OPS/p1699001234",
            detected: new Date().toISOString(),
            recommendation:
              "URGENT: Contact Alex immediately to hand over Vault root credentials. Generate new AppRole and update K8s Secret before Dec 15.",
          },
          {
            id: "sa-002",
            severity: "critical",
            type: "cloud-resource",
            description:
              "AWS IAM user 'alex-rivera-personal' with AdministratorAccess policy is still active. This was Alex's personal IAM user used for infra testing.",
            location: "AWS IAM: us-east-1 / iam::user/alex-rivera-personal",
            detected: new Date().toISOString(),
            recommendation:
              "Disable and delete this IAM user immediately. Audit CloudTrail for actions taken with this user in the last 90 days.",
          },
          {
            id: "sa-003",
            severity: "high",
            type: "hardcoded-pat",
            description:
              "GitHub PAT referenced in commit 3a7f891 message for authenticating to private package registry. PAT appears to be Alex's personal token with read:packages scope.",
            location: "github:acmecorp/platform#commit/3a7f891",
            sourceUrl: "https://github.com/acmecorp/platform/commit/3a7f891",
            detected: new Date().toISOString(),
            recommendation:
              "Revoke this PAT. Generate a new GitHub Actions bot token for package registry auth and update CI/CD secrets.",
          },
          {
            id: "sa-004",
            severity: "high",
            type: "ssh-key",
            description:
              "SSH key 'alex-macbook-work' still authorized on 3 EC2 bastion hosts. Alex's laptop SSH key needs to be removed from authorized_keys.",
            location: "AWS EC2: bastion-prod-1, bastion-prod-2, bastion-staging",
            detected: new Date().toISOString(),
            recommendation:
              "Remove 'alex-macbook-work' public key from all bastion hosts. Audit recent SSH sessions.",
          },
          {
            id: "sa-005",
            severity: "medium",
            type: "api-key",
            description:
              "Datadog API key in staging ConfigMap appears to be registered under Alex's personal Datadog account, not the org account.",
            location: "K8s: namespace=staging / ConfigMap=monitoring-config",
            detected: new Date().toISOString(),
            recommendation:
              "Generate a new Datadog API key under the service account. Update the ConfigMap.",
          },
        ],
        cloudResources: [
          {
            name: "alex-test-cluster",
            type: "EKS Cluster",
            provider: "AWS",
            region: "us-west-2",
            linkedToUser: true,
            status: "idle",
            url: "https://console.aws.amazon.com/eks/home?region=us-west-2#/clusters/alex-test-cluster",
          },
          {
            name: "alex-rivera-personal",
            type: "IAM User",
            provider: "AWS",
            region: "us-east-1",
            linkedToUser: true,
            status: "active",
            url: "https://console.aws.amazon.com/iam/home#/users/alex-rivera-personal",
          },
          {
            name: "alex-vault-dev",
            type: "EC2 Instance",
            provider: "AWS",
            region: "us-east-1",
            linkedToUser: true,
            status: "orphaned",
            url: "https://console.aws.amazon.com/ec2/home?region=us-east-1#instances",
          },
        ],
        accessRecommendations: [
          "Revoke GitHub PAT belonging to Alex (check organization → Settings → Personal access tokens)",
          "Remove SSH authorized key 'alex-macbook-work' from all bastion and EC2 instances",
          "Disable AWS IAM user 'alex-rivera-personal' and rotate any credentials it created",
          "Transfer Vault root token to security team and regenerate AppRole for secret-rotation-cron",
          "Transfer ownership of Datadog monitors and dashboards from Alex's account to team service account",
          "Reassign PagerDuty on-call schedule covering auth-gateway and platform-infra",
          "Revoke Atlantis server admin access tied to Alex's GitHub OAuth token",
          "Archive or reassign Alex's 1Password vault items shared with the team",
        ],
      },
    },
    rawActivity: {
      commits: [
        {
          sha: "3a7f891",
          message: "fix: add null check for OIDC payload validation",
          author: "Alex Rivera",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          url: "https://github.com/acmecorp/platform/commit/3a7f891",
          repo: "acmecorp/platform",
        },
        {
          sha: "b2c4d56",
          message: "feat: implement RS256 JWT signing in auth-gateway",
          author: "Alex Rivera",
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          url: "https://github.com/acmecorp/auth-gateway/commit/b2c4d56",
          repo: "acmecorp/auth-gateway",
        },
        {
          sha: "e9f1234",
          message: "chore: update Terraform AWS provider to 5.x - WIP",
          author: "Alex Rivera",
          date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          url: "https://github.com/acmecorp/infra/commit/e9f1234",
          repo: "acmecorp/infra",
        },
      ],
      pullRequests: [
        {
          id: 847,
          number: 847,
          title: "feat: Migrate auth gateway to RS256 JWT signing",
          state: "open",
          url: "https://github.com/acmecorp/auth-gateway/pull/847",
          repo: "acmecorp/auth-gateway",
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      slackMessages: [
        {
          id: "msg-001",
          channel: "infra-ops",
          channelId: "C01INFRA",
          text: "Hey team — the Vault AppRole for secret-rotation-cron expires Dec 15. I was going to handle the renewal but now with my transition I'll need to hand this over. The root creds are in my 1Pass vault under 'Vault Root Token'.",
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          url: "https://acmecorp.slack.com/archives/C01INFRA/p1699451234",
        },
      ],
      meetingTranscripts: [
        {
          id: "meet-001",
          title: "Alex's Handover Walkthrough - Auth Gateway",
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          duration: 60,
          participants: ["alex.rivera", "priya_sec", "new_infra_lead"],
          actionItems: [
            "Priya to take ownership of auth-gateway prod deployments",
            "New infra lead to get Atlantis admin access transferred",
            "Sec team to audit and remove Alex's IAM user",
          ],
          decisions: [
            "RS256 migration PR #847 to be reviewed by priya_sec before merge",
            "secret-rotation-cron ownership transferred to devops_team",
          ],
          summary:
            "Alex walked through auth-gateway architecture, deployment process, and the in-flight RS256 migration. Handed over Vault root token to Priya.",
          sourceUrl: "https://meet.google.com/abc-defg-hij",
        },
      ],
      docs: [
        {
          id: "doc-001",
          title: "ADR-0012: Secrets Management Strategy",
          url: "https://notion.so/acmecorp/adr-0012-secrets-management",
          source: "notion",
          lastModified: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          snippet:
            "This document records the decision to use HashiCorp Vault over AWS Secrets Manager for centralized secrets management...",
        },
        {
          id: "doc-002",
          title: "EKS Node Drain Procedure",
          url: "https://notion.so/acmecorp/eks-node-drain-procedure",
          source: "notion",
          lastModified: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          snippet:
            "CRITICAL: You MUST set drain-ready=true label before running kubectl drain or PDB for auth-gateway will block indefinitely...",
        },
      ],
    },
  };
}

