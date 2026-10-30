"use client";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const QueryClint = ({ children }: { children: React.ReactNode }) => {
  const [queryClient]=React.useState(()=>new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      {process.env.NODE_ENV === "development"&&<ReactQueryDevtools buttonPosition="bottom-right" />}

      {children}
    </QueryClientProvider>
  );
};

export default QueryClint;
