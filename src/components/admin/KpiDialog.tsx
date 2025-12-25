import { useState, useEffect } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Kpi } from '@/types/sfm';

interface KpiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpi?: Kpi | null;
  defaultCategoryId?: string;
}

const FREQUENCIES = [
  { value: 'daily', label: 'Quotidien' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuel' },
];

const CHART_TYPES = [
  { value: 'time_series', label: 'Série temporelle' },
  { value: 'pareto', label: 'Pareto' },
  { value: 'histogram', label: 'Histogramme' },
  { value: 'control_chart', label: 'Carte de contrôle' },
  { value: 'box_plot', label: 'Boîte à moustaches' },
];

export function KpiDialog({ open, onOpenChange, kpi, defaultCategoryId }: KpiDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!kpi;

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sfm_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    },
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    unit: '',
    target_value: '',
    frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
    chart_type: 'time_series' as 'time_series' | 'pareto' | 'histogram' | 'control_chart' | 'box_plot',
    is_active: true,
  });

  useEffect(() => {
    if (kpi) {
      setFormData({
        name: kpi.name,
        description: kpi.description || '',
        category_id: kpi.category_id,
        unit: kpi.unit || '',
        target_value: kpi.target_value?.toString() || '',
        frequency: kpi.frequency || 'daily',
        chart_type: kpi.chart_type || 'time_series',
        is_active: kpi.is_active ?? true,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        category_id: defaultCategoryId || '',
        unit: '',
        target_value: '',
        frequency: 'daily',
        chart_type: 'time_series',
        is_active: true,
      });
    }
  }, [kpi, defaultCategoryId, open]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        category_id: data.category_id,
        unit: data.unit || null,
        target_value: data.target_value ? parseFloat(data.target_value) : null,
        frequency: data.frequency,
        chart_type: data.chart_type,
        is_active: data.is_active,
      };

      if (isEditing && kpi) {
        const { error } = await supabase
          .from('kpis')
          .update(payload)
          .eq('id', kpi.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('kpis')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      toast.success(isEditing ? 'KPI modifié' : 'KPI créé');
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error saving KPI:', error);
      toast.error('Erreur lors de la sauvegarde');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category_id) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier le KPI' : 'Nouveau KPI'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifiez les informations du KPI' : 'Créez un nouvel indicateur de performance'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Taux de rendement"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description du KPI"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Catégorie *</Label>
              <Select 
                value={formData.category_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unité</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                placeholder="Ex: %, pcs, €"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target">Valeur cible</Label>
              <Input
                id="target"
                type="number"
                value={formData.target_value}
                onChange={(e) => setFormData(prev => ({ ...prev, target_value: e.target.value }))}
                placeholder="Ex: 95"
              />
            </div>

            <div className="space-y-2">
              <Label>Fréquence</Label>
              <Select 
                value={formData.frequency} 
                onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setFormData(prev => ({ ...prev, frequency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Type de graphique</Label>
              <Select 
                value={formData.chart_type} 
                onValueChange={(value: 'time_series' | 'pareto' | 'histogram' | 'control_chart' | 'box_plot') => setFormData(prev => ({ ...prev, chart_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHART_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between col-span-2 p-3 rounded-lg bg-muted/50">
              <Label htmlFor="is_active">KPI actif</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
