import { redirect } from "next/navigation";

export default function LegacyWaiterPage() {
  redirect("/staff/floor");
}
