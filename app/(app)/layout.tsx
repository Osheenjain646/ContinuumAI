import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import AppShell from "@/components/auth/AppShell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AppShell user={{ id: session.user.id!, name: session.user.name!, email: session.user.email!, avatarUrl: session.user.image ?? undefined }}>
      {children}
    </AppShell>
  );
}

