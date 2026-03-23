"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { EXTENSION_ROUTES } from "@/lib/extension/constants";

const items = [
  { href: EXTENSION_ROUTES.hub, label: "Hub" },
  { href: EXTENSION_ROUTES.post, label: "Extension Post" },
  { href: EXTENSION_ROUTES.testLab, label: "Test Lab" },
  { href: EXTENSION_ROUTES.jobs, label: "Jobs" },
  { href: EXTENSION_ROUTES.logs, label: "Logs" },
  { href: EXTENSION_ROUTES.context, label: "Facebook Context" },
];

export function ExtensionNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-border/80 bg-card/70 p-2 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition",
              active ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
