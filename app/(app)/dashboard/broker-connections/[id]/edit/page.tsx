import Link from "next/link";
import { notFound } from "next/navigation";
import { TradovateConnectionForm } from "@/components/tradovate/tradovate-connection-form";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";

export default async function EditBrokerConnectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("broker_connections")
    .select("id, display_name, environment, username, app_id, app_version, cid")
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error.message}
      </div>
    );
  }
  if (!data) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href="/dashboard/broker-connections">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="font-mono text-2xl font-semibold tracking-tight">Edit connection</h1>
          <p className="text-sm text-muted-foreground">
            Password and secret fields are empty; leave them blank to keep stored values.
          </p>
        </div>
      </div>

      <TradovateConnectionForm
        mode="edit"
        defaults={{
          id: data.id,
          display_name: data.display_name,
          environment: data.environment,
          username: data.username,
          app_id: data.app_id,
          app_version: data.app_version,
          cid: data.cid,
        }}
      />
    </div>
  );
}
