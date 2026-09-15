import { useQuery } from '@tanstack/react-query';
import { getReadiness } from '../lib/api-client';

export function useReadiness() {
  return useQuery({
    queryKey: ['api-readiness'],
    queryFn: getReadiness,
    retry: 1,
    refetchOnWindowFocus: true,
    refetchInterval: false,
  });
}
