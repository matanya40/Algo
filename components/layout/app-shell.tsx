import Link from "next/link";
import { LayoutDashboard, Plus, Settings, Unplug, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopBar } from "@/components/layout/app-top-bar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/broker-connections", label: "Broker connections", icon: Unplug },
  { href: "/dashboard/trading-accounts", label: "Trading accounts", icon: Wallet },
  { href: "/strategies/new", label: "New strategy", icon: Plus },
  { href: "/settings", label: "Settings", icon: Settings },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  let user = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-surface md:flex md:flex-col">
        <AppSidebar nav={nav} user={user} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b border-border bg-surface-2/80 px-4 backdrop-blur md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                Menu
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="border-b border-border p-4 font-mono text-sm font-semibold">
                Strategy Vault
              </div>
              <nav className="flex flex-col gap-1 p-2">
                {nav.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <Link href="/dashboard" className="font-mono text-sm font-semibold">
            Strategy Vault
          </Link>
        </header>
        <AppTopBar />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
