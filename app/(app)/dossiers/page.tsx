import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserDossiers } from "@/lib/db/store";
import DossiersClient from "@/components/dossiers/DossiersClient";

export default async function DossiersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const dossiers = await getUserDossiers(session.user.id);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <DossiersClient initialDossiers={dossiers} />
    </div>
  );
}
