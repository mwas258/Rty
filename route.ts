import { handle, ok, requireUser } from "@/lib/api";
import { getDashboard } from "@/lib/services/dashboard";
import { runSync } from "@/lib/services/sync";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const user = await requireUser();
  // Opportunistic refresh (respects the provider interval; no-op when fresh).
  void runSync({ trigger: "auto" }).catch(() => undefined);
  return ok(await getDashboard(user));
});
