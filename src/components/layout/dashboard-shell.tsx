"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-10rem] h-72 w-72 rounded-full bg-primary/18 blur-3xl" />
        <div className="absolute right-[-6rem] top-[10rem] h-80 w-80 rounded-full bg-secondary/18 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-[24%] h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      </div>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <Topbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="mx-auto max-w-[1500px] p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
