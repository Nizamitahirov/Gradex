import { redirect } from "next/navigation";

// No public landing page — opening the platform goes straight to the app.
// Unauthenticated users are bounced to /login by middleware.
export default function RootPage() {
  redirect("/dashboard");
}
