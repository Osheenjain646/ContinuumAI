import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getDossierById } from "@/lib/db/store";
import DossierDashboard from "@/components/dashboard/DossierDashboard";

type Params = { params: Promise<{ dossierId: string }> };

export default async function DossierDashboardPage({ params }: Params) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { dossierId } = await params;
  const dossier = await getDossierById(session.user.id, dossierId);
  if (!dossier) notFound();

  return <DossierDashboard dossier={dossier} />;
}
