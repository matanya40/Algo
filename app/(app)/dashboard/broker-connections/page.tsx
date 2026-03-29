import Link from "next/link";
import { TradovateConnectionsTable } from "@/components/tradovate/tradovate-connections-table";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { Plus } from "lucide-react";

export default async function BrokerConnectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("broker_connections")
    .select(
      `
      id,
      display_name,
      environment,
      is_active,
      last_status,
      last_error,
      last_sync_at,
      trading_accounts (id)
    `
    )
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  const rows = (data ?? []).map((r) => {
    const ta = r.trading_accounts as { id: string }[] | null;
    return {
      id: r.id,
      display_name: r.display_name,
      environment: r.environment,
      is_active: r.is_active,
      last_status: r.last_status,
      last_error: r.last_error,
      last_sync_at: r.last_sync_at,
      accountsCount: Array.isArray(ta) ? ta.length : 0,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-mono text-2xl font-semibold tracking-tight">Broker connections</h1>
          <p className="text-sm text-muted-foreground">
            Tradovate credentials stay encrypted on the server; the UI only reads from your database.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/broker-connections/new">
            <Plus className="mr-2 h-4 w-4" />
            New connection
          </Link>
        </Button>
      </div>

      <TradovateConnectionsTable initialRows={rows} />
    </div>
  );
}
