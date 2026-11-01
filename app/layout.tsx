import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Continuum AI — Living Knowledge Transfer Engine",
  description:
    "Automated handover dossier generation for departing team members. Synthesizes GitHub, Slack, meetings, and docs into a structured knowledge transfer.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body
        className="min-h-full bg-zinc-50 text-zinc-900"
        style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
