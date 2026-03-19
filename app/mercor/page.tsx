import { MercorDashboard } from "@/components/mercor-dashboard";
import { getMercorSnapshot } from "@/lib/mercor-storage";

export const dynamic = "force-dynamic";

export default async function MercorPage() {
  const snapshot = await getMercorSnapshot();

  return <MercorDashboard snapshot={snapshot} />;
}
