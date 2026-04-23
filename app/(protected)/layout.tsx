"use client";

import * as React from "react";
import { SidebarProvider, Sidebar, SidebarFooter } from "@/components/ui/sidebar";
import { AppNavbar } from "@/modules/dashboard/ui/navbar";
import { AppSidebar } from "@/modules/dashboard/ui/sidebar";
import BreadcrumbsFromUrl from "@/modules/dashboard/ui/breadcrumbsFromUrl";
import ContextGate from "@/providers/contextProvider";
import { PermissionsProvider } from "@/providers/PermissionsProvider";
import ContextDialog from "@/modules/dashboard/ui/contextDialog";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ContextGate>
      <PermissionsProvider>
        <SidebarProvider
          style={
            {
              "--sidebar-width": "18rem",
              "--sidebar-width-icon": "6.5rem",
            } as React.CSSProperties
          }
        >
          <div className="h-screen w-full overflow-hidden flex flex-col">
            {/* HEADER */}
            <header className="h-14 shrink-0 border-b w-full">
              <AppNavbar />
            </header>

            {/* BODY */}
            <div className="flex-1 min-h-0 flex w-full overflow-hidden">
              <Sidebar className="top-14 bg-muted" collapsible="icon">
                <AppSidebar />
                <SidebarFooter className="bg-primary h-full">
                  <div className="mobile">
                    <ContextDialog />
                    <div className="mobile">
                      <span className="sm:hidden">XSM (Below 640px)</span>
                      <span className="hidden sm:inline md:hidden">SM (640px+)</span>
                      <span className="hidden md:inline lg:hidden">MD (768px+)</span>
                      <span className="hidden lg:inline xl:hidden">LG (1024px+)</span>
                      <span className="hidden xl:inline 2xl:hidden">XL (1280px+)</span>
                      <span className="hidden 2xl:inline">2XL (1536px+)</span>
                    </div>
                  </div>
                </SidebarFooter>
              </Sidebar>

              <main className="flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden pl-2 relative">
                {/* área que sí puede scrollear */}
                <div className="flex-1 min-h-0 overflow-auto pt-2 pb-16 justify-center items-center">
                  <div className="xl2:max-w-7xl xl:max-w-7xl lg:max-w-5xl md:max-w-4xl mx-auto">{children}</div>
                </div>

                {/* footer visual fijo */}
                <div className="absolute bottom-0 left-0 w-full bg-muted p-3">
                  <BreadcrumbsFromUrl />
                </div>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </PermissionsProvider>
    </ContextGate>
  );
}
