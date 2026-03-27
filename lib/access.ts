import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type AppRole = "user" | "admin";

export async function getCurrentRole(): Promise<AppRole> {
  const cookieStore = await cookies();
  return cookieStore.get("role")?.value === "admin" ? "admin" : "user";
}

export async function requireAdminRole() {
  if ((await getCurrentRole()) !== "admin") {
    redirect("/user");
  }
}
