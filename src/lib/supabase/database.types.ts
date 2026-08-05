export type Database = {
  public: {
    Tables: {
      game_scores: {
        Row: {
          id: string;
          display_name: string;
          phone_number: string | null;
          score: number;
          survival_ms: number;
          festival_day: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          display_name: string;
          phone_number?: string | null;
          score: number;
          survival_ms: number;
          festival_day?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          phone_number?: string | null;
          score?: number;
          survival_ms?: number;
          festival_day?: string;
          created_at?: string;
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
