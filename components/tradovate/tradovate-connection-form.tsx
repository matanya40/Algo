"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Mode = "create" | "edit";

type EditDefaults = {
  id: string;
  display_name: string;
  environment: string;
  username: string;
  app_id: string;
  app_version: string;
  cid: string;
};

export function TradovateConnectionForm({
  mode,
  defaults,
}: {
  mode: Mode;
  defaults?: EditDefaults;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(defaults?.display_name ?? "");
  const [environment, setEnvironment] = useState(defaults?.environment ?? "demo");
  const [username, setUsername] = useState(defaults?.username ?? "");
  const [password, setPassword] = useState("");
  const [appId, setAppId] = useState(defaults?.app_id ?? "");
  const [appVersion, setAppVersion] = useState(defaults?.app_version ?? "1.0");
  const [cid, setCid] = useState(defaults?.cid ?? "");
  const [sec, setSec] = useState("");
  const [busy, setBusy] = useState<"test" | "save" | null>(null);

  async function runTest() {
    setBusy("test");
    try {
      if (mode === "create") {
        const res = await fetch("/api/tradovate/connections/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: displayName || "Test",
            environment,
            username,
            password,
            appId,
            appVersion,
            cid,
            sec,
          }),
        });
        const json = await res.json();
        if (json.success) {
          toast.success(json.message ?? "Connection OK");
        } else {
          toast.error(json.message ?? "Test failed");
        }
      } else if (defaults) {
        const body: Record<string, string> = {};
        if (password) body.password = password;
        if (sec) body.sec = sec;
        if (username !== defaults.username) body.username = username;
        if (environment !== defaults.environment) body.environment = environment;
        if (appId !== defaults.app_id) body.appId = appId;
        if (appVersion !== defaults.app_version) body.appVersion = appVersion;
        if (cid !== defaults.cid) body.cid = cid;

        const res = await fetch(`/api/tradovate/connections/${defaults.id}/test`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (json.success) {
          toast.success(json.message ?? "Connection OK");
        } else {
          toast.error(json.message ?? "Test failed");
        }
      }
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy("save");
    try {
      if (mode === "create") {
        const res = await fetch("/api/tradovate/connections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName,
            environment,
            username,
            password,
            appId,
            appVersion,
            cid,
            sec,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.error ?? "Save failed");
          return;
        }
        toast.success("Connection saved");
        router.push("/dashboard/broker-connections");
        router.refresh();
        return;
      }

      if (!defaults) return;
      const patch: Record<string, unknown> = {
        displayName,
        environment,
        username,
        appId,
        appVersion,
        cid,
      };
      if (password.length > 0) patch.password = password;
      if (sec.length > 0) patch.sec = sec;

      const res = await fetch(`/api/tradovate/connections/${defaults.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Update failed");
        return;
      }
      toast.success("Connection updated");
      router.push("/dashboard/broker-connections");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <Label>Environment</Label>
        <Select value={environment} onValueChange={setEnvironment}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="demo">Demo</SelectItem>
            <SelectItem value="live">Live</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "edit" ? "Leave blank to keep current password" : ""}
          autoComplete="new-password"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Tradovate treats App ID, CID, and Secret as optional in the auth API. Leave them empty if you only
        have username and password; add them later if Tradovate gives you partner API keys.
      </p>

      <div className="space-y-2">
        <Label htmlFor="appId">App ID (optional)</Label>
        <Input id="appId" value={appId} onChange={(e) => setAppId(e.target.value)} autoComplete="off" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="appVersion">App version (optional)</Label>
        <Input
          id="appVersion"
          value={appVersion}
          onChange={(e) => setAppVersion(e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cid">CID (optional)</Label>
        <Input id="cid" value={cid} onChange={(e) => setCid(e.target.value)} autoComplete="off" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sec">Secret (optional)</Label>
        <Input
          id="sec"
          type="password"
          value={sec}
          onChange={(e) => setSec(e.target.value)}
          placeholder={mode === "edit" ? "Leave blank to keep current secret" : ""}
          autoComplete="new-password"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={busy !== null}
          onClick={() => void runTest()}
        >
          {busy === "test" ? "Testing…" : "Test connection"}
        </Button>
        <Button type="button" disabled={busy !== null} onClick={() => void save()}>
          {busy === "save" ? "Saving…" : mode === "create" ? "Save connection" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
