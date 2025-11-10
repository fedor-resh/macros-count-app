[?25l[?2004h
                                                                                                   
  >  1. gwhqshlpglptxsexagcz [name: macros count app, org: wjtpodutsdlqksbvmrfi, region: eu-west-1]
                                                                                                   
                                                                                                   
    ↑/k up • ↓/j down • / filter • q quit • ? more                                                 
                                                                                                   [6A [J[2K[?2004l[?25h[?1002l[?1003l[?1006lexport type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      eaten_products: {
        Row: {
          createdAt: string
          date: string | null
          id: number
          imageUrl: string | null
          kcalories: number | null
          name: string
          protein: number | null
          unit: string | null
          userId: string | null
          value: number | null
        }
        Insert: {
          createdAt?: string
          date?: string | null
          id?: number
          imageUrl?: string | null
          kcalories?: number | null
          name?: string
          protein?: number | null
          unit?: string | null
          userId?: string | null
          value?: number | null
        }
        Update: {
          createdAt?: string
          date?: string | null
          id?: number
          imageUrl?: string | null
          kcalories?: number | null
          name?: string
          protein?: number | null
          unit?: string | null
          userId?: string | null
          value?: number | null
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string | null
          carbs: number | null
          created_at: string | null
          fat: number | null
          id: number
          kcalories: number | null
          name: string
          protein: number | null
          serving_value: number | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          carbs?: number | null
          created_at?: string | null
          fat?: number | null
          id?: never
          kcalories?: number | null
          name: string
          protein?: number | null
          serving_value?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          carbs?: number | null
          created_at?: string | null
          fat?: number | null
          id?: never
          kcalories?: number | null
          name?: string
          protein?: number | null
          serving_value?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          activityLevel: string | null
          age: number | null
          caloriesGoal: number
          createdAt: string
          gender: string | null
          goal: string | null
          height: number | null
          id: string
          proteinGoal: number
          updatedAt: string
          weight: number | null
        }
        Insert: {
          activityLevel?: string | null
          age?: number | null
          caloriesGoal?: number
          createdAt?: string
          gender?: string | null
          goal?: string | null
          height?: number | null
          id: string
          proteinGoal?: number
          updatedAt?: string
          weight?: number | null
        }
        Update: {
          activityLevel?: string | null
          age?: number | null
          caloriesGoal?: number
          createdAt?: string
          gender?: string | null
          goal?: string | null
          height?: number | null
          id?: string
          proteinGoal?: number
          updatedAt?: string
          weight?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
