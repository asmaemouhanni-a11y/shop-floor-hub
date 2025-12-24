import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useSfmData';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { SfmColumn } from '@/components/dashboard/SfmColumn';
import { TodayPriorities } from '@/components/dashboard/TodayPriorities';
import { ProblemsPanel } from '@/components/dashboard/ProblemsPanel';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { CreateActionDialog } from '@/components/dashboard/CreateActionDialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();

  // Redirect to auth if not logged in
  if (!authLoading && !user) {
    navigate('/auth');
    return null;
  }

  if (authLoading || categoriesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-16 border-b border-border/50 animate-pulse bg-card/50" />
        <div className="p-6">
          <div className="grid grid-cols-6 gap-4 h-[calc(100vh-120px)]">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleAddAction = (categoryId?: string) => {
    setSelectedCategoryId(categoryId);
    setActionDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />

      {/* Quick Actions Bar */}
      <div className="border-b border-border/30 bg-card/30 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-3">
          <QuickActions />
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
        {/* Left Panel - Priorities & Problems */}
        <div className="w-full lg:w-80 flex flex-col gap-4 flex-shrink-0">
          <TodayPriorities />
          <ProblemsPanel />
        </div>

        {/* Main SFM Columns */}
        <div className="flex-1 min-w-0">
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="flex gap-4 pb-4">
              {categories?.map((category) => (
                <div key={category.id} className="w-[300px] flex-shrink-0">
                  <SfmColumn 
                    category={category} 
                    onAddAction={() => handleAddAction(category.id)}
                  />
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>

      <CreateActionDialog
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        defaultCategoryId={selectedCategoryId}
      />
    </div>
  );
}
