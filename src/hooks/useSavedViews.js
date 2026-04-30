import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const fetchSavedViews = async () => {
  const res = await base44.get('/api/v1/functions/savedViews');
  if (!res.data?.success) throw new Error(res.data?.error || 'Failed to load views');
  return res.data.views;
};

const createView = async ({ name, filters }) => {
  const res = await base44.post('/api/v1/functions/savedViews', { name, filters });
  if (!res.data?.success) throw new Error(res.data?.error || 'Failed to save view');
  return res.data.view;
};

const deleteView = async (id) => {
  const res = await base44.delete(`/api/v1/functions/savedViews/${id}`);
  if (!res.data?.success) throw new Error(res.data?.error || 'Failed to delete view');
};

export function useSavedViews() {
  const queryClient = useQueryClient();

  const { data: views, isLoading } = useQuery({
    queryKey: ['savedViews'],
    queryFn: fetchSavedViews,
  });

  const createMutation = useMutation({
    mutationFn: createView,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savedViews'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteView,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savedViews'] }),
  });

  return {
    views: views || [],
    isLoading,
    createView: createMutation.mutate,
    deleteView: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
