import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { Chat } from "@/components/Chat";
import { getServerSession, getSessionCookieName } from "@/lib/server/authSession";

export default async function UserPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/sign-in");
  }

  const cookieStore = await cookies();
  const sessionHandle = cookieStore.get(getSessionCookieName())?.value;

  return (
    <Chat
      workspaceMode="user"
      requestContextHeaders={{
        "x-app-session": sessionHandle,
        "x-user-id": session.user.id,
        "x-tenant-id": session.user.tenantId,
        "x-access-token": session.accessToken,
      }}
    />
  );
}
