import { Clock, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';
import { useTodayPriorities } from '@/hooks/useSfmData';
import { ActionCard } from './ActionCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export function TodayPriorities() {
  const { data: priorities, isLoading } = useTodayPriorities();

  const urgentCount = priorities?.filter(a => a.priority === 'urgent').length || 0;
  const highCount = priorities?.filter(a => a.priority === 'high').length || 0;
  const overdueCount = priorities?.filter(a => 
    a.status === 'overdue' || new Date(a.due_date) < new Date()
  ).length || 0;

  if (isLoading) {
    return (
      <div className="industrial-card p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-48 mb-4"></div>
        <div className="space-y-3">
          <div className="h-20 bg-muted rounded"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="industrial-card overflow-hidden">
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Priorités du jour</h2>
              <p className="text-xs text-muted-foreground">
                Actions urgentes et échéances aujourd'hui
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            {priorities?.length || 0} actions
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4">
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="status-dot status-red"></div>
              <span className="text-muted-foreground">
                <span className="font-medium text-destructive">{overdueCount}</span> en retard
              </span>
            </div>
          )}
          {urgentCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-status-orange" />
              <span className="text-muted-foreground">
                <span className="font-medium text-status-orange">{urgentCount}</span> urgent
              </span>
            </div>
          )}
          {highCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                <span className="font-medium">{highCount}</span> priorité haute
              </span>
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="h-[300px]">
        <div className="p-4 space-y-3">
          {priorities && priorities.length > 0 ? (
            priorities.map((action) => (
              <ActionCard key={action.id} action={action} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mb-3 opacity-30" />
              <span className="text-sm">Aucune priorité pour aujourd'hui</span>
              <span className="text-xs">Tout est sous contrôle !</span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
