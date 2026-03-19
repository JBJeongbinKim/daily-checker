import { WorkoutDashboard } from "@/components/workout-dashboard";
import { getWorkoutProgram } from "@/lib/workout-storage";

export const dynamic = "force-dynamic";

export default async function WorkoutPage() {
  const program = await getWorkoutProgram();

  return <WorkoutDashboard program={program} />;
}
