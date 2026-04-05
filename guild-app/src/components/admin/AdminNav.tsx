"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { path: "/admin", label: "Overview" },
  { path: "/admin/proposals", label: "Proposals" },
  { path: "/admin/charter", label: "Charter" },
  { path: "/admin/xp", label: "XP" },
  { path: "/admin/bounties", label: "Bounties" },
  { path: "/admin/health", label: "Health" },
];

export function AdminNav() {
  const rawPath = usePathname();
  const pathname = rawPath.replace(/^\/guild/, "") || "/";

  return (
    <div className="flex gap-0.5 border-b overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 mb-4">
      {TABS.map((t) => {
        const isActive =
          t.path === "/admin" ? pathname === "/admin" : pathname.startsWith(t.path);
        return (
          <Link
            key={t.path}
            href={t.path}
            className={`px-3 sm:px-4 py-2.5 text-[12px] font-medium no-underline whitespace-nowrap border-b-2 transition-colors ${
              isActive
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
