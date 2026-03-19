import { RentDashboard } from "@/components/rent-dashboard";
import { getRentDataset } from "@/lib/rent-storage";

export const dynamic = "force-dynamic";

export default async function RentPage() {
  const dataset = await getRentDataset();

  return <RentDashboard dataset={dataset} />;
}
