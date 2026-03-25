import { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Trash2, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ProjectMemberRole } from '@/lib/supabase-types';
import type { ProjectMember } from '@/hooks/use-supabase-projects';
import { useSupabaseAuthStore } from '@/store/supabase-auth-store';

interface ProjectMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  supabaseProjectId: string;
  getMembers: (projectId: string) => Promise<ProjectMember[]>;
  addMember: (
    projectId: string,
    email: string,
    role: ProjectMemberRole
  ) => Promise<{ error: string | null }>;
  updateMemberRole: (memberId: string, role: ProjectMemberRole) => Promise<boolean>;
  removeMember: (memberId: string) => Promise<boolean>;
}

const ROLE_LABELS: Record<ProjectMemberRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
};

const ROLE_DESCRIPTIONS: Record<ProjectMemberRole, string> = {
  owner: 'Vollzugriff, kann Mitglieder verwalten',
  editor: 'Kann Tasks erstellen und bearbeiten',
  viewer: 'Kann Tasks nur ansehen',
};

export function ProjectMembersDialog({
  open,
  onOpenChange,
  projectName,
  supabaseProjectId,
  getMembers,
  addMember,
  updateMemberRole,
  removeMember,
}: ProjectMembersDialogProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ProjectMemberRole>('editor');
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const currentUser = useSupabaseAuthStore((s) => s.user);

  const loadMembers = useCallback(async () => {
    if (!supabaseProjectId) return;
    setLoading(true);
    try {
      const result = await getMembers(supabaseProjectId);
      setMembers(result);
    } finally {
      setLoading(false);
    }
  }, [supabaseProjectId, getMembers]);

  useEffect(() => {
    if (open && supabaseProjectId) {
      void loadMembers();
    }
    if (!open) {
      setInviteEmail('');
      setInviteRole('editor');
      setMembers([]);
    }
  }, [open, supabaseProjectId, loadMembers]);

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;

    setInviting(true);
    try {
      const { error } = await addMember(supabaseProjectId, email, inviteRole);
      if (error) {
        toast.error(error);
      } else {
        toast.success(`${email} als ${ROLE_LABELS[inviteRole]} eingeladen`);
        setInviteEmail('');
        setInviteRole('editor');
        await loadMembers();
      }
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (member: ProjectMember) => {
    setRemovingId(member.id);
    try {
      const ok = await removeMember(member.id);
      if (ok) {
        toast.success(`${member.email ?? 'Mitglied'} entfernt`);
        setMembers((prev) => prev.filter((m) => m.id !== member.id));
      } else {
        toast.error('Fehler beim Entfernen');
      }
    } finally {
      setRemovingId(null);
    }
  };

  const handleRoleChange = async (member: ProjectMember, newRole: ProjectMemberRole) => {
    const ok = await updateMemberRole(member.id, newRole);
    if (ok) {
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m)));
      toast.success(
        `Rolle von ${member.email ?? 'Mitglied'} auf ${ROLE_LABELS[newRole]} geaendert`
      );
    } else {
      toast.error('Fehler beim Aendern der Rolle');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col bg-zinc-950 border-white/5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-200">
            <Users className="w-4 h-4 text-violet-400" />
            Mitglieder
          </DialogTitle>
          <DialogDescription className="truncate text-zinc-500">
            Team-Mitglieder fuer &ldquo;{projectName}&rdquo; verwalten
          </DialogDescription>
        </DialogHeader>

        {/* Invite section */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-500">Mitglied einladen</label>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="email@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !inviting) {
                  void handleInvite();
                }
              }}
              className={cn(
                'flex-1 h-8 px-3 text-sm rounded-md',
                'border border-white/5 bg-zinc-900',
                'text-zinc-300 placeholder:text-zinc-600',
                'focus:outline-none focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500/30',
                'transition-all duration-200'
              )}
            />
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as ProjectMemberRole)}>
              <SelectTrigger className="h-8 w-[100px] text-xs bg-zinc-900 border-white/5 text-zinc-400">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/5">
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-8 px-3 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border-0"
              disabled={!inviteEmail.trim() || inviting}
              onClick={() => void handleInvite()}
            >
              {inviting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UserPlus className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Members list */}
        <div className="flex-1 overflow-y-auto min-h-0 max-h-[300px] space-y-0.5 scrollbar-styled">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-zinc-600">
              <Users className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm text-zinc-400">Noch keine Mitglieder</p>
              <p className="text-xs mt-1 text-zinc-600">Lade Teammitglieder per E-Mail ein.</p>
            </div>
          ) : (
            members.map((member) => {
              const isOwner = member.role === 'owner';
              const isCurrentUser = currentUser?.id === member.userId;

              return (
                <div
                  key={member.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg group',
                    'transition-colors duration-100',
                    'hover:bg-white/5 border border-transparent hover:border-white/5'
                  )}
                >
                  {/* Avatar placeholder */}
                  <div className="w-7 h-7 rounded-full bg-zinc-800/80 flex items-center justify-center shrink-0">
                    {isOwner ? (
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <span className="text-xs font-medium text-zinc-500">
                        {(member.email ?? member.displayName ?? '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-zinc-300">
                      {member.displayName ?? member.email ?? 'Unbekannt'}
                      {isCurrentUser && <span className="text-xs text-zinc-600 ml-1">(du)</span>}
                    </p>
                    {member.displayName && member.email && (
                      <p className="text-[11px] text-zinc-600 truncate">{member.email}</p>
                    )}
                  </div>

                  {/* Role badge / selector */}
                  <div className="shrink-0">
                    {isOwner ? (
                      <span
                        className="text-[10px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded"
                        title={ROLE_DESCRIPTIONS.owner}
                      >
                        Owner
                      </span>
                    ) : member.role === 'editor' ? (
                      <Select
                        value={member.role}
                        onValueChange={(v) => void handleRoleChange(member, v as ProjectMemberRole)}
                      >
                        <SelectTrigger className="h-6 w-[80px] text-[10px] border-none bg-violet-500/10 text-violet-400 px-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/5">
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Select
                        value={member.role}
                        onValueChange={(v) => void handleRoleChange(member, v as ProjectMemberRole)}
                      >
                        <SelectTrigger className="h-6 w-[80px] text-[10px] border-none bg-zinc-800/50 text-zinc-400 px-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/5">
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Remove button (not for owner or self) */}
                  <div className="shrink-0 w-7">
                    {!isOwner && !isCurrentUser && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={removingId === member.id}
                        onClick={() => void handleRemove(member)}
                        title="Mitglied entfernen"
                      >
                        {removingId === member.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Role legend */}
        <div className="pt-2 border-t border-white/5">
          <div className="grid grid-cols-3 gap-2 text-[10px] text-zinc-600">
            {(Object.entries(ROLE_DESCRIPTIONS) as [ProjectMemberRole, string][]).map(
              ([role, desc]) => (
                <div key={role} className="text-center">
                  <span
                    className={cn(
                      'font-medium',
                      role === 'owner' && 'text-amber-400',
                      role === 'editor' && 'text-violet-400',
                      role === 'viewer' && 'text-zinc-400'
                    )}
                  >
                    {ROLE_LABELS[role]}
                  </span>
                  <p className="mt-0.5 leading-tight">{desc}</p>
                </div>
              )
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
