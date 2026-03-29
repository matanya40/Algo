"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ConnectionStatusBadge } from "@/components/tradovate/connection-status-badge";

export type ConnectionListRow = {
  id: string;
  display_name: string;
  environment: string;
  is_active: boolean;
  last_status: string | null;
  last_error: string | null;
  last_sync_at: string | null;
  accountsCount?: number;
};

export function TradovateConnectionsTable({
  initialRows,
}: {
  initialRows: ConnectionListRow[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);
  const [confirmDisable, setConfirmDisable] = useState<ConnectionListRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConnectionListRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/tradovate/connections");
    const json = await res.json();
    if (res.ok && Array.isArray(json.data)) {
      setRows(json.data);
    }
    router.refresh();
  }

  async function syncNow(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/tradovate/connections/${id}/sync`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message ?? "Synced");
      } else {
        toast.error(json.message ?? "Sync failed");
      }
      await refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setBusyId(null);
    }
  }

  async function testConn(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/tradovate/connections/${id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message ?? "OK");
      } else {
        toast.error(json.message ?? "Failed");
      }
      await refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setBusyId(null);
    }
  }

  async function patchConnection(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/tradovate/connections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Request failed");
      return false;
    }
    toast.success("Updated");
    await refresh();
    return true;
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No Tradovate connections yet.{" "}
        <Link href="/dashboard/broker-connections/new" className="text-primary underline">
          Add one
        </Link>
        .
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 font-mono text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Env</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Last sync</th>
              <th className="px-3 py-2">Accounts</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-border/80">
                <td className="px-3 py-2 font-medium">{c.display_name}</td>
                <td className="px-3 py-2 capitalize">{c.environment}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-1">
                    <ConnectionStatusBadge status={c.last_status} isActive={c.is_active} />
                    {c.last_error && c.is_active ? (
                      <span className="max-w-[220px] truncate text-xs text-rose-600 dark:text-rose-400">
                        {c.last_error}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {c.last_sync_at
                    ? new Date(c.last_sync_at).toLocaleString()
                    : "—"}
                </td>
                <td className="px-3 py-2 tabular-nums">{c.accountsCount ?? 0}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busyId === c.id || !c.is_active}
                      onClick={() => void testConn(c.id)}
                    >
                      Test
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busyId === c.id || !c.is_active}
                      onClick={() => void syncNow(c.id)}
                    >
                      {busyId === c.id ? "…" : "Sync"}
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/broker-connections/${c.id}/edit`}>Edit</Link>
                    </Button>
                    {c.is_active ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmDisable(c)}
                      >
                        Disable
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void patchConnection(c.id, { isActive: true })}
                      >
                        Enable
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setConfirmDelete(c)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!confirmDisable} onOpenChange={() => setConfirmDisable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable connection?</AlertDialogTitle>
            <AlertDialogDescription>
              The connection will stop syncing until you enable it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const c = confirmDisable;
                setConfirmDisable(null);
                if (c) void patchConnection(c.id, { isActive: false });
              }}
            >
              Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove connection?</AlertDialogTitle>
            <AlertDialogDescription>
              This soft-deletes the connection and keeps historical data in the database until you run a hard
              delete from the database. Trading accounts linked to it may remain until cleaned up.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const c = confirmDelete;
                setConfirmDelete(null);
                if (c) void patchConnection(c.id, { deletedAt: new Date().toISOString() });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
