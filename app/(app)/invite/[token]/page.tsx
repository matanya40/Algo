import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: ok, error } = await supabase.rpc("accept_strategy_invite", {
    p_token: token,
  });

  if (error) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-sm">
        <p className="font-medium text-destructive">Could not accept invite</p>
        <p className="text-muted-foreground">{error.message}</p>
        <Button variant="secondary" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (!ok) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-lg border border-border bg-card p-6 text-sm">
        <p className="font-medium">Invite not valid</p>
        <p className="text-muted-foreground">
          This link may have expired, was already used, or does not match your
          signed-in email.
        </p>
        <Button variant="secondary" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  redirect("/dashboard?tab=shared");
}
