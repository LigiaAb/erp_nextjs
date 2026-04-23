"use client";

import React from "react";
// import { useRouter } from "next/navigation";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ThemeProvider } from "@/components/theme-provider";
import { Provider } from "react-redux";
import { store } from "@/store";
import SessionProvider from "./sessionProvider";
import { createAppQueryClient } from "@/lib/query/queryClient";
const Providers = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  const [queryClient] = React.useState(() => createAppQueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <SessionProvider>{children}</SessionProvider>
        </Provider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default Providers;
