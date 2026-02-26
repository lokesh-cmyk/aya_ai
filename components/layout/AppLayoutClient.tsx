"use client";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { CommandPalette } from "@/components/search/CommandPalette";
import { PipedreamClientProvider } from "@/components/integrations/PipedreamClientProvider";
import { PageTransition } from "@/components/layout/PageTransition";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { HamburgerMenu } from "@/components/layout/HamburgerMenu";
import { cn } from "@/lib/utils";
import { CommandCenterProvider, CommandCenterSidebar } from "@/components/command-center";
import { PlatformTourProvider } from "@/components/tour/PlatformTourProvider";

export function AppLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAIChatPage = pathname === "/ai-chat";

  return (
    <PipedreamClientProvider>
      <CommandCenterProvider>
        <PlatformTourProvider>
        <div className="flex h-screen bg-gray-50 overflow-hidden transition-all duration-300">
          {!isAIChatPage && <AppSidebar />}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
            {isAIChatPage ? <HamburgerMenu /> : <AppHeader />}
            <main className={cn("flex-1 min-w-0", isAIChatPage ? "overflow-hidden" : "overflow-auto")}>
              <PageTransition>
                {children}
              </PageTransition>
            </main>
          </div>
          <CommandPalette />
          <CommandCenterSidebar />
        </div>
        </PlatformTourProvider>
      </CommandCenterProvider>
    </PipedreamClientProvider>
  );
}
