import { useState } from 'react';
import { Plus, AlertCircle, FileText, StickyNote } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { CreateActionDialog } from './CreateActionDialog';
import { CreateProblemDialog } from './CreateProblemDialog';
import { CreateNoteDialog } from './CreateNoteDialog';

export function QuickActions() {
  const { hasPermission } = useAuth();
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [problemDialogOpen, setProblemDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);

  const canCreateActions = hasPermission(['admin', 'manager', 'team_leader']);

  return (
    <>
      <div className="flex items-center gap-2">
        {canCreateActions && (
          <Button 
            onClick={() => setActionDialogOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Nouvelle action
          </Button>
        )}
        
        <Button 
          variant="outline" 
          onClick={() => setProblemDialogOpen(true)}
          className="gap-2"
        >
          <AlertCircle className="h-4 w-4" />
          Signaler un problème
        </Button>

        <Button 
          variant="ghost" 
          onClick={() => setNoteDialogOpen(true)}
          className="gap-2"
        >
          <StickyNote className="h-4 w-4" />
          Ajouter une note
        </Button>
      </div>

      <CreateActionDialog 
        open={actionDialogOpen} 
        onOpenChange={setActionDialogOpen} 
      />
      
      <CreateProblemDialog 
        open={problemDialogOpen} 
        onOpenChange={setProblemDialogOpen} 
      />

      <CreateNoteDialog 
        open={noteDialogOpen} 
        onOpenChange={setNoteDialogOpen} 
      />
    </>
  );
}
