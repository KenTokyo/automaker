import { createFileRoute } from '@tanstack/react-router';
import { ProjectOverviewView } from '@/components/views/project-overview-view';

export const Route = createFileRoute('/project-overview')({
  component: ProjectOverviewView,
});
