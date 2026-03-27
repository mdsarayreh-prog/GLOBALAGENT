import { redirect } from "next/navigation";

import { Chat } from "@/components/Chat";
import { getServerSession } from "@/lib/server/authSession";

export default async function UserPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/sign-in");
  }

  return <Chat workspaceMode="user" />;
}
