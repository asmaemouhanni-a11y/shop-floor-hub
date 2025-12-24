import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useCreateNote, useCategories } from '@/hooks/useSfmData';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const noteSchema = z.object({
  content: z.string().min(1, 'Contenu requis').max(500, 'Maximum 500 caractères'),
  category_id: z.string().uuid().optional().nullable(),
});

type NoteFormData = z.infer<typeof noteSchema>;

interface CreateNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateNoteDialog({ open, onOpenChange }: CreateNoteDialogProps) {
  const { user } = useAuth();
  const { data: categories } = useCategories();
  const createNote = useCreateNote();

  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      content: '',
      category_id: null,
    },
  });

  const onSubmit = async (data: NoteFormData) => {
    await createNote.mutateAsync({
      content: data.content,
      category_id: data.category_id || undefined,
      created_by: user?.id,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Ajouter une note</DialogTitle>
          <DialogDescription>
            Notez une information importante pour l'équipe
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Votre note..." 
                      className="resize-none" 
                      rows={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie (optionnel)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Aucune catégorie" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createNote.isPending}>
                {createNote.isPending ? 'Ajout...' : 'Ajouter la note'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
