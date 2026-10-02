export function isSimulationMode() {
  return process.env.NEXT_PUBLIC_BACKEND_MODE === "simulation";
}