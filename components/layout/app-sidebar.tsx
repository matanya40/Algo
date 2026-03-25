import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import type { LucideIcon } from "lucide-react";
import { UserNav } from "@/components/layout/user-nav";

export function AppSidebar({
  nav,
  user,
}: {
  nav: { href: string; label: string; icon: LucideIcon }[];
  user: User | null;
}) {
  return (
    <>
      <div className="border-b border-border p-4">
        <Link href="/dashboard" className="font-mono text-sm font-semibold tracking-tight">
          Strategy Vault
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">Desk</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-border p-2">
        <UserNav user={user} />
      </div>
    </>
  );
}
