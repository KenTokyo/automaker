import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { KanbanWebApp } from './kanban-web-app';

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <KanbanWebApp />
  </StrictMode>
);
