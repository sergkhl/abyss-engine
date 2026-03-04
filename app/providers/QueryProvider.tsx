'use client';

import { ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { pubSubClient } from '@/infrastructure/pubsub';

interface QueryProviderProps {
  children: ReactNode;
}

export default function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: Number.POSITIVE_INFINITY,
            retry: 0,
          },
        },
      }),
  );

  useEffect(() => {
    pubSubClient.bindQueryClient(queryClient);
    const connection = pubSubClient.connect();
    return () => {
      connection.close();
    };
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
