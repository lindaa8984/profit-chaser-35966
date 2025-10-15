export type Json =
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
      activation_codes: {
        Row: {
          code: string
          created_at: string
          duration_days: number
          expires_at: string | null
          id: string
          is_used: boolean
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          duration_days?: number
          expires_at?: string | null
          id?: string
          is_used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          duration_days?: number
          expires_at?: string | null
          id?: string
          is_used?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          client_type: string
          created_at: string
          email: string | null
          id: string
          id_number: string
          name: string
          nationality: string
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          client_type: string
          created_at?: string
          email?: string | null
          id?: string
          id_number: string
          name: string
          nationality: string
          phone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          client_type?: string
          created_at?: string
          email?: string | null
          id?: string
          id_number?: string
          name?: string
          nationality?: string
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          bank_name: string | null
          check_dates: string | null
          check_numbers: string | null
          client_id: string
          created_at: string
          currency: string
          end_date: string
          id: string
          monthly_rent: number
          number_of_payments: string | null
          payment_dates: string | null
          payment_method: string
          payment_schedule: string
          property_id: string
          start_date: string
          status: string
          terminated_date: string | null
          unit_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_name?: string | null
          check_dates?: string | null
          check_numbers?: string | null
          client_id: string
          created_at?: string
          currency?: string
          end_date: string
          id?: string
          monthly_rent: number
          number_of_payments?: string | null
          payment_dates?: string | null
          payment_method: string
          payment_schedule: string
          property_id: string
          start_date: string
          status?: string
          terminated_date?: string | null
          unit_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_name?: string | null
          check_dates?: string | null
          check_numbers?: string | null
          client_id?: string
          created_at?: string
          currency?: string
          end_date?: string
          id?: string
          monthly_rent?: number
          number_of_payments?: string | null
          payment_dates?: string | null
          payment_method?: string
          payment_schedule?: string
          property_id?: string
          start_date?: string
          status?: string
          terminated_date?: string | null
          unit_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_sessions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          session_end: string
          session_start: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          session_end: string
          session_start?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          session_end?: string
          session_start?: string
          user_id?: string
        }
        Relationships: []
      }
      ip_tracking: {
        Row: {
          block_reason: string | null
          created_at: string
          id: string
          ip_address: string
          is_blocked: boolean
          last_seen: string
          registration_date: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          block_reason?: string | null
          created_at?: string
          id?: string
          ip_address: string
          is_blocked?: boolean
          last_seen?: string
          registration_date?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          block_reason?: string | null
          created_at?: string
          id?: string
          ip_address?: string
          is_blocked?: boolean
          last_seen?: string
          registration_date?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      maintenance_requests: {
        Row: {
          completed_date: string | null
          created_at: string
          description: string
          id: string
          priority: string
          property_id: string
          request_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_date?: string | null
          created_at?: string
          description: string
          id?: string
          priority: string
          property_id: string
          request_date: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_date?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: string
          property_id?: string
          request_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bank_name: string | null
          check_number: string | null
          contract_id: string
          created_at: string
          currency: string
          due_date: string
          id: string
          paid_date: string | null
          payment_method: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          bank_name?: string | null
          check_number?: string | null
          contract_id: string
          created_at?: string
          currency?: string
          due_date: string
          id?: string
          paid_date?: string | null
          payment_method: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bank_name?: string | null
          check_number?: string | null
          contract_id?: string
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          paid_date?: string | null
          payment_method?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          available_units: number
          created_at: string
          currency: string
          floors: number
          id: string
          location: string
          name: string
          price: number
          rented_units: number
          status: string
          total_units: number
          type: string
          unit_format: string | null
          units_per_floor: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          available_units: number
          created_at?: string
          currency?: string
          floors: number
          id?: string
          location: string
          name: string
          price: number
          rented_units?: number
          status: string
          total_units: number
          type: string
          unit_format?: string | null
          units_per_floor?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          available_units?: number
          created_at?: string
          currency?: string
          floors?: number
          id?: string
          location?: string
          name?: string
          price?: number
          rented_units?: number
          status?: string
          total_units?: number
          type?: string
          unit_format?: string | null
          units_per_floor?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          plan_type: Database["public"]["Enums"]["app_role"]
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          plan_type?: Database["public"]["Enums"]["app_role"]
          start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          plan_type?: Database["public"]["Enums"]["app_role"]
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      units: {
        Row: {
          created_at: string
          floor: number
          id: string
          is_available: boolean
          property_id: string
          rented_by: string | null
          unit_number: string
        }
        Insert: {
          created_at?: string
          floor: number
          id?: string
          is_available?: boolean
          property_id: string
          rented_by?: string | null
          unit_number: string
        }
        Update: {
          created_at?: string
          floor?: number
          id?: string
          is_available?: boolean
          property_id?: string
          rented_by?: string | null
          unit_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_rented_by_fkey"
            columns: ["rented_by"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_premium_with_code: {
        Args: { _code: string; _user_id: string }
        Returns: Json
      }
      check_ip_registration: {
        Args: { _ip_address: string; _user_agent?: string }
        Returns: Json
      }
      generate_activation_code: {
        Args: { _duration_days?: number }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_guest_session_valid: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_subscription_active: {
        Args: { _user_id: string }
        Returns: boolean
      }
      record_ip_registration: {
        Args: { _ip_address: string; _user_agent?: string; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "guest" | "premium" | "admin"
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
    Enums: {
      app_role: ["guest", "premium", "admin"],
    },
  },
} as const
