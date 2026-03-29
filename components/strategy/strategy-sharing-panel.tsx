"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  inviteUserToStrategy,
  revokeStrategyInvite,
  revokeStrategyShare,
} from "@/app/actions/strategy-share-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Trash2, UserPlus } from "lucide-react";

export type ShareRow = {
  id: string;
  user_id: string;
  /** Primary label: email when available, else display name fallback. */
  displayName: string;
  /** Optional second line (e.g. profile full name under the email). */
  subtitle?: string | null;
};

export type InviteRow = {
  id: string;
  invitee_email: string;
  token: string;
};

export function StrategySharingPanel({
  strategyId,
  inviteBaseUrl,
  initialShares,
  initialInvites,
}: {
  strategyId: string;
  inviteBaseUrl: string;
  initialShares: ShareRow[];
  initialInvites: InviteRow[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();

  function onInvite(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await inviteUserToStrategy(strategyId, trimmed);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.kind === "shared") {
        toast.success("Strategy shared — they can open it from “Shared with me”.");
        setEmail("");
        router.refresh();
        return;
      }
      const link = `${inviteBaseUrl.replace(/\/$/, "")}/invite/${res.token}`;
      await navigator.clipboard.writeText(link).catch(() => {});
      toast.success(
        "No account with that email yet. Invite link copied — send it to them."
      );
      setEmail("");
      router.refresh();
    });
  }

  function onRevokeShare(id: string) {
    startTransition(async () => {
      try {
        await revokeStrategyShare(id);
        toast.success("Access removed");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to remove");
      }
    });
  }

  function onRevokeInvite(id: string) {
    startTransition(async () => {
      try {
        await revokeStrategyInvite(id);
        toast.success("Invite removed");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to remove");
      }
    });
  }

  async function copyInviteLink(token: string) {
    const link = `${inviteBaseUrl.replace(/\/$/, "")}/invite/${token}`;
    await navigator.clipboard.writeText(link);
    toast.success("Link copied");
  }

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="text-base">Share strategy</CardTitle>
        <p className="text-xs text-muted-foreground">
          Collaborators sign in with the same app and get view-only access to this
          strategy (documentation, files, analytics). Editing stays with you.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={onInvite} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1">
            <label htmlFor="share-email" className="text-xs text-muted-foreground">
              Email address
            </label>
            <Input
              id="share-email"
              type="email"
              autoComplete="email"
              placeholder="friend@example.com"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              disabled={pending}
            />
          </div>
          <Button type="submit" disabled={pending || !email.trim()}>
            <UserPlus className="mr-2 h-4 w-4" />
            Share
          </Button>
        </form>

        {initialShares.length > 0 ? (
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase text-muted-foreground">
              People with access
            </p>
            <ul className="divide-y divide-border rounded-md border border-border">
              {initialShares.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <span className="block truncate font-mono text-xs">{s.displayName}</span>
                    {s.subtitle ? (
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {s.subtitle}
                      </span>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={pending}
                    onClick={() => onRevokeShare(s.id)}
                    aria-label={`Remove access for ${s.displayName}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {initialInvites.length > 0 ? (
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase text-muted-foreground">
              Pending email invites
            </p>
            <ul className="divide-y divide-border rounded-md border border-border">
              {initialInvites.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-col gap-2 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="min-w-0 truncate font-mono text-xs">
                    {inv.invitee_email}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={pending}
                      onClick={() => void copyInviteLink(inv.token)}
                    >
                      Copy link
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={pending}
                      onClick={() => onRevokeInvite(inv.id)}
                      aria-label="Remove invite"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
