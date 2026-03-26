import { createFileRoute } from '@tanstack/react-router';
import { TeamRightsView } from '@/components/views/team-rights-view';

export const Route = createFileRoute('/team-rights')({
  component: TeamRightsView,
});
