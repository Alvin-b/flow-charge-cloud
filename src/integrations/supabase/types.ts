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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      consumption_logs: {
        Row: {
          connection_id: string | null
          id: string
          kwh_used: number
          meter_id: string
          period_end: string | null
          period_start: string | null
          recorded_at: string
          user_id: string
        }
        Insert: {
          connection_id?: string | null
          id?: string
          kwh_used?: number
          meter_id: string
          period_end?: string | null
          period_start?: string | null
          recorded_at?: string
          user_id: string
        }
        Update: {
          connection_id?: string | null
          id?: string
          kwh_used?: number
          meter_id?: string
          period_end?: string | null
          period_start?: string | null
          recorded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consumption_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "meter_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumption_logs_meter_id_fkey"
            columns: ["meter_id"]
            isOneToOne: false
            referencedRelation: "meters"
            referencedColumns: ["id"]
          },
        ]
      }
      kplc_payments: {
        Row: {
          account_number: string | null
          amount_kes: number
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          mpesa_conversation_id: string | null
          mpesa_originator_conversation_id: string | null
          mpesa_receipt: string | null
          paybill: string
          status: string
        }
        Insert: {
          account_number?: string | null
          amount_kes: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          mpesa_conversation_id?: string | null
          mpesa_originator_conversation_id?: string | null
          mpesa_receipt?: string | null
          paybill?: string
          status?: string
        }
        Update: {
          account_number?: string | null
          amount_kes?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          mpesa_conversation_id?: string | null
          mpesa_originator_conversation_id?: string | null
          mpesa_receipt?: string | null
          paybill?: string
          status?: string
        }
        Relationships: []
      }
      meter_commands: {
        Row: {
          command_type: string
          completed_at: string | null
          created_at: string
          id: string
          meter_id: string
          oprid: string | null
          payload: Json | null
          response: Json | null
          status: string
          user_id: string
        }
        Insert: {
          command_type: string
          completed_at?: string | null
          created_at?: string
          id?: string
          meter_id: string
          oprid?: string | null
          payload?: Json | null
          response?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          command_type?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          meter_id?: string
          oprid?: string | null
          payload?: Json | null
          response?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meter_commands_meter_id_fkey"
            columns: ["meter_id"]
            isOneToOne: false
            referencedRelation: "meters"
            referencedColumns: ["id"]
          },
        ]
      }
      meter_connections: {
        Row: {
          connected_at: string
          disconnected_at: string | null
          id: string
          is_active: boolean
          meter_id: string
          user_id: string
        }
        Insert: {
          connected_at?: string
          disconnected_at?: string | null
          id?: string
          is_active?: boolean
          meter_id: string
          user_id: string
        }
        Update: {
          connected_at?: string
          disconnected_at?: string | null
          id?: string
          is_active?: boolean
          meter_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meter_connections_meter_id_fkey"
            columns: ["meter_id"]
            isOneToOne: false
            referencedRelation: "meters"
            referencedColumns: ["id"]
          },
        ]
      }
      meter_link_requests: {
        Row: {
          id: string
          requested_at: string
          resolved_at: string | null
          status: string
          tuya_device_id: string
          user_id: string
        }
        Insert: {
          id?: string
          requested_at?: string
          resolved_at?: string | null
          status?: string
          tuya_device_id: string
          user_id: string
        }
        Update: {
          id?: string
          requested_at?: string
          resolved_at?: string | null
          status?: string
          tuya_device_id?: string
          user_id?: string
        }
        Relationships: []
      }
      meter_readings: {
        Row: {
          current_amps: number | null
          energy_kwh: number | null
          frequency_hz: number | null
          id: string
          meter_id: string
          power_factor: number | null
          power_watts: number | null
          raw_payload: Json | null
          recorded_at: string
          voltage: number | null
        }
        Insert: {
          current_amps?: number | null
          energy_kwh?: number | null
          frequency_hz?: number | null
          id?: string
          meter_id: string
          power_factor?: number | null
          power_watts?: number | null
          raw_payload?: Json | null
          recorded_at?: string
          voltage?: number | null
        }
        Update: {
          current_amps?: number | null
          energy_kwh?: number | null
          frequency_hz?: number | null
          id?: string
          meter_id?: string
          power_factor?: number | null
          power_watts?: number | null
          raw_payload?: Json | null
          recorded_at?: string
          voltage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meter_readings_meter_id_fkey"
            columns: ["meter_id"]
            isOneToOne: false
            referencedRelation: "meters"
            referencedColumns: ["id"]
          },
        ]
      }
      meter_transfers: {
        Row: {
          amount_kwh: number
          connection_id: string | null
          created_at: string
          id: string
          meter_balance_after: number
          meter_balance_before: number
          meter_id: string
          user_id: string
          wallet_balance_after: number
          wallet_balance_before: number
        }
        Insert: {
          amount_kwh: number
          connection_id?: string | null
          created_at?: string
          id?: string
          meter_balance_after?: number
          meter_balance_before?: number
          meter_id: string
          user_id: string
          wallet_balance_after?: number
          wallet_balance_before?: number
        }
        Update: {
          amount_kwh?: number
          connection_id?: string | null
          created_at?: string
          id?: string
          meter_balance_after?: number
          meter_balance_before?: number
          meter_id?: string
          user_id?: string
          wallet_balance_after?: number
          wallet_balance_before?: number
        }
        Relationships: [
          {
            foreignKeyName: "meter_transfers_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "meter_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meter_transfers_meter_id_fkey"
            columns: ["meter_id"]
            isOneToOne: false
            referencedRelation: "meters"
            referencedColumns: ["id"]
          },
        ]
      }
      meters: {
        Row: {
          balance_kwh: number
          created_at: string
          id: string
          last_sync: string | null
          linked_at: string | null
          max_kwh: number
          name: string
          property_name: string | null
          rate_kwh_hr: number | null
          sms_fallback: boolean
          status: string
          tuya_device_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_kwh?: number
          created_at?: string
          id?: string
          last_sync?: string | null
          linked_at?: string | null
          max_kwh?: number
          name?: string
          property_name?: string | null
          rate_kwh_hr?: number | null
          sms_fallback?: boolean
          status?: string
          tuya_device_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_kwh?: number
          created_at?: string
          id?: string
          last_sync?: string | null
          linked_at?: string | null
          max_kwh?: number
          name?: string
          property_name?: string | null
          rate_kwh_hr?: number | null
          sms_fallback?: boolean
          status?: string
          tuya_device_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          icon: string | null
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          icon?: string | null
          id?: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          icon?: string | null
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_splits: {
        Row: {
          commission_amount_kes: number
          commission_percent: number
          created_at: string
          forwarded: boolean
          id: string
          kplc_amount_kes: number
          kplc_payment_id: string | null
          original_amount_kes: number
          transaction_id: string
          user_id: string
        }
        Insert: {
          commission_amount_kes?: number
          commission_percent?: number
          created_at?: string
          forwarded?: boolean
          id?: string
          kplc_amount_kes?: number
          kplc_payment_id?: string | null
          original_amount_kes?: number
          transaction_id: string
          user_id: string
        }
        Update: {
          commission_amount_kes?: number
          commission_percent?: number
          created_at?: string
          forwarded?: boolean
          id?: string
          kplc_amount_kes?: number
          kplc_payment_id?: string | null
          original_amount_kes?: number
          transaction_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_admin: boolean
          phone: string
          pin_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_admin?: boolean
          phone?: string
          pin_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_admin?: boolean
          phone?: string
          pin_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_kes: number
          amount_kwh: number
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          mpesa_checkout_request_id: string | null
          mpesa_receipt_number: string | null
          mpesa_transaction_id: string | null
          phone_number: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_kes?: number
          amount_kwh?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          mpesa_checkout_request_id?: string | null
          mpesa_receipt_number?: string | null
          mpesa_transaction_id?: string | null
          phone_number?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_kes?: number
          amount_kwh?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          mpesa_checkout_request_id?: string | null
          mpesa_receipt_number?: string | null
          mpesa_transaction_id?: string | null
          phone_number?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      wallets: {
        Row: {
          balance_kwh: number
          created_at: string
          id: string
          max_kwh: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_kwh?: number
          created_at?: string
          id?: string
          max_kwh?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_kwh?: number
          created_at?: string
          id?: string
          max_kwh?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_safe: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          is_admin: boolean | null
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          is_admin?: boolean | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          is_admin?: boolean | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_rate_limit: {
        Args: {
          p_action: string
          p_limit: number
          p_user_id: string
          p_window_seconds: number
        }
        Returns: boolean
      }
      credit_wallet: {
        Args: {
          p_amount_kwh: number
          p_idempotency_key?: string
          p_user_id: string
        }
        Returns: number
      }
      debit_wallet: {
        Args: { p_amount_kwh: number; p_user_id: string }
        Returns: number
      }
      disconnect_from_meter: {
        Args: { p_connection_id: string }
        Returns: undefined
      }
      has_pin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_notification: {
        Args: {
          p_body: string
          p_icon?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      reset_pin: { Args: never; Returns: undefined }
      set_pin: { Args: { p_pin_hash: string }; Returns: undefined }
      upsert_profile: {
        Args: { p_email?: string; p_full_name: string; p_phone?: string }
        Returns: undefined
      }
      verify_pin: { Args: { p_pin_hash: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
