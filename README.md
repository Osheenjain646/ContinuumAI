This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## User accounts and integrations

Register an account, sign in, and open **Integrations** to configure sources for that account. Integration settings and dossiers are stored per user; all integrations are optional. A refresh reads only configured targets:

- GitHub repositories or organization, GitLab projects, and Bitbucket repositories: up to the latest 10 commits per selected repo/project (an organization URL is capped at 10 commits total).
- Slack channels, Notion pages/databases, Jira projects for the configured employee, and Linear teams/member.
- Confluence spaces, Asana tasks for the configured user/workspace, direct meeting transcript URLs, Google Docs transcripts, and custom company-specific HTTPS URLs.

Do not add a credential unless the selected source requires it. Credentials are stored server-side and masked in the settings response. Saving settings without changing a masked credential preserves the existing value; clearing the field removes it.

Meeting sources must point to an existing text transcript or an accessible Google Doc. This project does not currently transcribe audio/video recordings. Custom sources are single URLs returning text, HTML, JSON, or XML; an optional token is sent as a Bearer token only to that configured URL.

Use **Fetch Data** on a dossier the first time and **Re-fetch** after changing integrations or when you want the report refreshed. User notes and section overrides are retained across refreshes.

## Configuration and persistence

Copy `.env.example` to `.env.local` and fill in the values:

```powershell
Copy-Item .env.example .env.local
```

- `AUTH_SECRET` is required. Generate a strong value with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` and paste it into `.env.local`.
- `MONGODB_URI` is required. Create a MongoDB Atlas cluster (or use your own MongoDB server), create a database user, allow your app's IP address in Network Access, and paste the driver's connection string here. URL-encode special characters in the database user's password.
- `MONGODB_DB_NAME` is optional and defaults to `continuumai`.
- `GEMINI_API_KEY` is required for AI report synthesis and chat. Create a key in Google AI Studio.
- `GITHUB_TOKEN`, `SLACK_BOT_TOKEN`, and `SLACK_USER_TOKEN` are optional fallbacks for the legacy standalone API routes. For user-specific data, configure each provider in the app's **Integrations** page instead.

Never commit `.env.local` or real credentials. Without `GEMINI_API_KEY`, AI synthesis may return empty fallback sections.

The application stores users, per-user integration settings, and dossiers in MongoDB collections named `users`, `integrations`, and `dossiers`. It creates unique indexes for normalized user emails and per-user records automatically.

If you have existing JSON data in `data/`, migrate it after configuring `.env.local`:

```powershell
npm run db:migrate-json
```

The migration copies users, integrations, and dossiers into MongoDB and leaves the original files unchanged. Back up the data before running it.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
