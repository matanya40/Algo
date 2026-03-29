import Link from "next/link";
import { TradovateConnectionForm } from "@/components/tradovate/tradovate-connection-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NewBrokerConnectionPage() {
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
          <h1 className="font-mono text-2xl font-semibold tracking-tight">New Tradovate connection</h1>
          <p className="text-sm text-muted-foreground">
            You need at least username and password. App ID / CID / Secret are optional unless Tradovate
            issued you API keys. Secrets are encrypted with TRADOVATE_ENCRYPTION_KEY on the server.
          </p>
        </div>
      </div>

      <TradovateConnectionForm mode="create" />
    </div>
  );
}
