import { redirect } from "next/navigation";

// The configured Persona sandbox callback appends `/home` to its web return
// base. Keep that provider-owned callback URL valid, then hand off to the
// authenticated clinician screen.
export default function PersonaClinicianCallback() {
  redirect("/clinician");
}
