import { AlertTriangle, AlertCircle, Clock, CheckCircle, MoreHorizontal } from 'lucide-react';
import { useProblems, useUpdateProblem } from '@/hooks/useSfmData';
import { useAuth } from '@/hooks/useAuth';
import { Problem } from '@/types/sfm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const severityConfig = {
  low: { label: 'Faible', color: 'bg-muted text-muted-foreground' },
  medium: { label: 'Moyenne', color: 'bg-primary/20 text-primary' },
  high: { label: 'Élevée', color: 'bg-status-orange/20 text-status-orange' },
  critical: { label: 'Critique', color: 'bg-destructive/20 text-destructive' },
};

const statusConfig = {
  open: { label: 'Ouvert', icon: AlertCircle, color: 'text-status-orange' },
  in_progress: { label: 'En cours', icon: Clock, color: 'text-primary' },
  resolved: { label: 'Résolu', icon: CheckCircle, color: 'text-status-green' },
};

function ProblemCard({ problem }: { problem: Problem }) {
  const { hasPermission } = useAuth();
  const updateProblem = useUpdateProblem();

  const severity = severityConfig[problem.severity];
  const status = statusConfig[problem.status];
  const StatusIcon = status.icon;

  const canManage = hasPermission(['admin', 'manager', 'team_leader']);

  const handleStatusChange = (newStatus: 'open' | 'in_progress' | 'resolved') => {
    updateProblem.mutate({
      id: problem.id,
      status: newStatus,
      resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null,
    });
  };

  return (
    <div className="industrial-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <StatusIcon className={`h-4 w-4 flex-shrink-0 ${status.color}`} />
            <h3 className="font-semibold text-foreground truncate">{problem.title}</h3>
            {problem.escalated && (
              <Badge variant="destructive" className="text-[10px]">
                Escaladé
              </Badge>
            )}
          </div>
          
          {problem.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {problem.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {problem.category && (
              <div className="flex items-center gap-1">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: problem.category.color }}
                />
                <span>{problem.category.name}</span>
              </div>
            )}
            <span>
              {formatDistanceToNow(new Date(problem.created_at), { addSuffix: true, locale: fr })}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Badge className={severity.color}>
            {severity.label}
          </Badge>
          
          {canManage && problem.status !== 'resolved' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {problem.status === 'open' && (
                  <DropdownMenuItem onClick={() => handleStatusChange('in_progress')}>
                    Prendre en charge
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleStatusChange('resolved')}>
                  Marquer résolu
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProblemsPanel() {
  const { data: problems, isLoading } = useProblems();

  const openProblems = problems?.filter(p => p.status !== 'resolved') || [];
  const criticalCount = openProblems.filter(p => p.severity === 'critical').length;
  const highCount = openProblems.filter(p => p.severity === 'high').length;

  if (isLoading) {
    return (
      <div className="industrial-card p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-48 mb-4"></div>
        <div className="space-y-3">
          <div className="h-24 bg-muted rounded"></div>
          <div className="h-24 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="industrial-card overflow-hidden">
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Problèmes ouverts</h2>
              <p className="text-xs text-muted-foreground">
                Problèmes signalés à traiter
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            {openProblems.length} ouverts
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4">
          {criticalCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="status-dot status-red"></div>
              <span className="text-muted-foreground">
                <span className="font-medium text-destructive">{criticalCount}</span> critique(s)
              </span>
            </div>
          )}
          {highCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="status-dot status-orange"></div>
              <span className="text-muted-foreground">
                <span className="font-medium text-status-orange">{highCount}</span> élevé(s)
              </span>
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="h-[300px]">
        <div className="p-4 space-y-3">
          {openProblems.length > 0 ? (
            openProblems.map((problem) => (
              <ProblemCard key={problem.id} problem={problem} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mb-3 opacity-30" />
              <span className="text-sm">Aucun problème ouvert</span>
              <span className="text-xs">Tout fonctionne correctement</span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
