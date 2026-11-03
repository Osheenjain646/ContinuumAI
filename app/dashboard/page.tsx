import { redirect } from "next/navigation";

export default function OldDashboardPage() {
  // Old mock dashboard — redirect to the real dossiers list
  redirect("/dossiers");
}
