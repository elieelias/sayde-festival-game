export type Database = {
  public: {
    Tables: {
      game_entries: {
        Row: {
          id: string;
          name: string | null;
          phone_number: string | null;
          token: string;
          url: string;
          is_used: boolean;
          score: number | null;
          used_at: string | null;
        };
        Insert: {
          id?: string;
          name?: string | null;
          phone_number?: string | null;
          token?: string;
          url: string;
          is_used?: boolean;
          score?: number | null;
          used_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string | null;
          phone_number?: string | null;
          token?: string;
          url?: string;
          is_used?: boolean;
          score?: number | null;
          used_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
