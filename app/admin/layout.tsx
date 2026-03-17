import { ReactNode } from "react";

import { requireAdminRole } from "@/lib/access";

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requireAdminRole();
  return children;
}
