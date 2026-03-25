export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskPriority = 'P1' | 'P2' | 'P3' | 'P4' | '';
export type ProjectMemberRole = 'owner' | 'editor' | 'viewer';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      task_projects: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          share_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          share_enabled?: boolean;
        };
        Update: {
          name?: string;
          slug?: string;
          share_enabled?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'task_projects_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      task_project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: ProjectMemberRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role: ProjectMemberRole;
        };
        Update: {
          role?: ProjectMemberRole;
        };
        Relationships: [
          {
            foreignKeyName: 'task_project_members_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'task_projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_project_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string;
          summary: string;
          status: TaskStatus;
          priority: TaskPriority;
          tags: string[];
          created_by: string;
          updated_by: string | null;
          chat_session_id: string | null;
          completed_notes: string | null;
          completed_files: string[] | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description?: string;
          summary?: string;
          status?: TaskStatus;
          priority?: TaskPriority;
          tags?: string[];
          created_by: string;
          updated_by?: string | null;
          chat_session_id?: string | null;
        };
        Update: {
          title?: string;
          description?: string;
          summary?: string;
          status?: TaskStatus;
          priority?: TaskPriority;
          tags?: string[];
          updated_by?: string | null;
          chat_session_id?: string | null;
          completed_notes?: string | null;
          completed_files?: string[] | null;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'task_projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      task_attachments: {
        Row: {
          id: string;
          task_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          width: number | null;
          height: number | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          width?: number | null;
          height?: number | null;
          created_by: string;
        };
        Update: {
          file_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_attachments_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      task_notifications: {
        Row: {
          id: string;
          task_id: string;
          target_user_id: string;
          type: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          target_user_id: string;
          type: string;
        };
        Update: {
          read_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'task_notifications_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_notifications_target_user_id_fkey';
            columns: ['target_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      task_status: TaskStatus;
      task_priority: TaskPriority;
      project_member_role: ProjectMemberRole;
    };
    CompositeTypes: Record<string, never>;
  };
}
