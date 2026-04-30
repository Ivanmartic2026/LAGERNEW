import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useBoard(filters = {}) {
  return useQuery({
    queryKey: ['board', filters],
    queryFn: async () => {
      const res = await base44.functions.invoke('getBoard', filters);
      return res?.data || { columns: {}, totals: {} };
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
}
