import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: 'category' | 'kpi';
  itemId: string;
  itemName: string;
}

export function DeleteConfirmDialog({ 
  open, 
  onOpenChange, 
  itemType, 
  itemId, 
  itemName 
}: DeleteConfirmDialogProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const table = itemType === 'category' ? 'sfm_categories' : 'kpis';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [itemType === 'category' ? 'categories' : 'kpis'] });
      toast.success(`${itemType === 'category' ? 'Catégorie' : 'KPI'} supprimé(e)`);
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Error deleting:', error);
      if (error.message?.includes('violates foreign key constraint')) {
        toast.error(`Impossible de supprimer: des données sont liées à ${itemType === 'category' ? 'cette catégorie' : 'ce KPI'}`);
      } else {
        toast.error('Erreur lors de la suppression');
      }
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir supprimer "{itemName}" ? Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMutation.mutate()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
