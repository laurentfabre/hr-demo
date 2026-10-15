import { ThemeProvider } from "@/components/apx/theme-provider";
import { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { CockpitShell } from "@/components/cockpit/shell";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: () => (
    <ThemeProvider defaultTheme="light" storageKey="hr-demo-theme">
      <CockpitShell />
      <Toaster richColors />
    </ThemeProvider>
  ),
});
