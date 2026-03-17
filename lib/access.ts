import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export type AppRole = "user" | "admin";

type PrincipalClaim = {
  typ?: string;
  val?: string;
};

type ClientPrincipal = {
  auth_typ?: string;
  claims?: PrincipalClaim[];
  name_typ?: string;
  role_typ?: string;
};

export type AuthContext = {
  isAuthenticated: boolean;
  role: AppRole;
  principalName: string | null;
  principalId: string | null;
  tenantId: string | null;
  identityProvider: string | null;
  roles: string[];
  groups: string[];
};

const ROLE_CLAIM_TYPES = new Set([
  "roles",
  "role",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
]);

const GROUP_CLAIM_TYPES = new Set([
  "groups",
  "http://schemas.microsoft.com/claims/groups",
]);

const OBJECT_ID_CLAIM_TYPES = new Set([
  "oid",
  "http://schemas.microsoft.com/identity/claims/objectidentifier",
]);

const TENANT_ID_CLAIM_TYPES = new Set([
  "tid",
  "http://schemas.microsoft.com/identity/claims/tenantid",
]);

const DISPLAY_NAME_CLAIM_TYPES = new Set([
  "name",
  "preferred_username",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn",
  "emails",
]);

function parseCsvEnv(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function getFirstClaimValue(claims: PrincipalClaim[], claimTypes: Set<string>): string | null {
  for (const claim of claims) {
    if (claim.typ && claim.val && claimTypes.has(claim.typ)) {
      return claim.val;
    }
  }

  return null;
}

function getClaimValues(claims: PrincipalClaim[], claimTypes: Set<string>): string[] {
  return claims
    .filter((claim) => claim.typ && claim.val && claimTypes.has(claim.typ))
    .map((claim) => claim.val as string);
}

function decodeClientPrincipal(encoded: string | null): ClientPrincipal | null {
  if (!encoded) {
    return null;
  }

  try {
    const json = Buffer.from(encoded, "base64").toString("utf8");
    return JSON.parse(json) as ClientPrincipal;
  } catch {
    return null;
  }
}

function hasIntersection(values: string[], allowed: string[]): boolean {
  if (values.length === 0 || allowed.length === 0) {
    return false;
  }

  const allowedSet = new Set(allowed.map((value) => value.toLowerCase()));
  return values.some((value) => allowedSet.has(value.toLowerCase()));
}

async function getDevelopmentRole(): Promise<AppRole | null> {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const cookieStore = await cookies();
  return cookieStore.get("role")?.value === "admin" ? "admin" : "user";
}

export async function getAuthContext(): Promise<AuthContext> {
  const headerStore = await headers();
  const principal = decodeClientPrincipal(headerStore.get("x-ms-client-principal"));
  const claims = principal?.claims ?? [];

  const principalName =
    headerStore.get("x-ms-client-principal-name") ??
    getFirstClaimValue(claims, DISPLAY_NAME_CLAIM_TYPES);
  const principalId =
    headerStore.get("x-ms-client-principal-id") ??
    getFirstClaimValue(claims, OBJECT_ID_CLAIM_TYPES);
  const tenantId = getFirstClaimValue(claims, TENANT_ID_CLAIM_TYPES);
  const identityProvider = headerStore.get("x-ms-client-principal-idp") ?? principal?.auth_typ ?? null;
  const roles = getClaimValues(claims, ROLE_CLAIM_TYPES);
  const groups = getClaimValues(claims, GROUP_CLAIM_TYPES);
  const adminRoleNames = parseCsvEnv("ADMIN_ROLE_NAMES");
  const adminGroupIds = parseCsvEnv("ADMIN_GROUP_IDS");
  const adminUserIds = parseCsvEnv("ADMIN_USER_IDS");
  const allowedTenantIds = parseCsvEnv("ALLOWED_TENANT_IDS");
  const isAuthenticated = Boolean(principalName || principalId || principal);
  const tenantAllowed =
    allowedTenantIds.length === 0 || (tenantId !== null && hasIntersection([tenantId], allowedTenantIds));

  let role: AppRole = "user";

  if (
    isAuthenticated &&
    tenantAllowed &&
    (hasIntersection(roles, adminRoleNames) ||
      hasIntersection(groups, adminGroupIds) ||
      (principalId !== null && hasIntersection([principalId], adminUserIds)))
  ) {
    role = "admin";
  }

  const developmentRole = await getDevelopmentRole();

  if (!isAuthenticated && developmentRole) {
    role = developmentRole;
  }

  return {
    isAuthenticated: isAuthenticated || Boolean(developmentRole),
    role,
    principalName,
    principalId,
    tenantId,
    identityProvider,
    roles,
    groups,
  };
}

export async function getCurrentRole(): Promise<AppRole> {
  return (await getAuthContext()).role;
}

export async function requireAdminRole() {
  const auth = await getAuthContext();

  if (auth.role !== "admin") {
    redirect("/user");
  }
}
