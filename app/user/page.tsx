import { Chat } from "@/components/Chat";
import { buildUserThreads } from "@/lib/utils";

export default function UserPage() {
  return <Chat initialThreads={buildUserThreads()} workspaceMode="user" />;
}
