import { type ReactNode } from "react";
import { useLocation, Link } from "react-router-dom";
import { LayoutDashboard, ShoppingBag, Users, Wallet, Plane, Settings, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "工作台", icon: LayoutDashboard, path: "/" },
  { label: "订单", icon: ShoppingBag, path: "/orders" },
  { label: "客户", icon: Users, path: "/customers" },
  { label: "财务", icon: Wallet, path: "/finance" },
  { label: "出行", icon: Plane, path: "/trips" },
  { label: "设置", icon: Settings, path: "/settings" },
];

export default function Sidebar({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="flex h-screen">
      <aside className="flex w-64 shrink-0 flex-col bg-[#1e3a5f]">
        <div className="flex items-center gap-2 px-6 py-5">
          <Crown className="h-5 w-5 text-[#d4a853]" />
          <span className="font-display text-xl font-bold text-white">
            代购管家
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3 pt-2">
          {navItems.map(({ label, icon: Icon, path }) => {
            const active = path === '/' ? pathname === '/' : pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-body transition-colors",
                  active
                    ? "border-l-[3px] border-amber-500 bg-[#264a73] text-amber-400"
                    : "text-slate-300 hover:bg-[#264a73] hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-6 py-4 text-xs text-slate-400 font-body">
          © 2026 代购管家
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-warm-100 font-body">
        {children}
      </main>
    </div>
  );
}
