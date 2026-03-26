import { TooltipProvider } from '@ui/components/ui/tooltip';
import { SupabaseKanbanStandaloneView } from './components/views/supabase-kanban-standalone-view';
import '@ui/styles/global.css';
import '@ui/styles/theme-imports';
import '@ui/styles/font-imports';

export function KanbanWebApp() {
  return (
    <TooltipProvider delayDuration={300}>
      <SupabaseKanbanStandaloneView />
    </TooltipProvider>
  );
}
