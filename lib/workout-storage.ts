import dataset from "@/data/running-program.json";
import type { WorkoutProgram } from "@/lib/workout-types";

export async function getWorkoutProgram(): Promise<WorkoutProgram> {
  return dataset as WorkoutProgram;
}
