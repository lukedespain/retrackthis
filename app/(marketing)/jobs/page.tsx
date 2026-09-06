import { redirect } from "next/navigation";

/** Public /jobs bookmark → Musicians hub (Browse jobs). */
export default function PublicJobsRedirect() {
  redirect("/musicians");
}
