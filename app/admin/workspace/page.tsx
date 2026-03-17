import { Chat } from "@/components/Chat";
import { buildMockThreads } from "@/lib/utils";

export default function AdminWorkspacePage() {
  return <Chat initialThreads={buildMockThreads()} workspaceMode="admin" />;
}
