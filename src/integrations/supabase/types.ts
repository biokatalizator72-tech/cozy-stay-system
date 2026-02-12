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
      admin_profiles: {
        Row: {
          created_at: string
          id: string
          must_change_password: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          must_change_password?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          must_change_password?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          arrival_time: string | null
          check_in: string
          check_out: string
          created_at: string
          guest_data: Json | null
          guest_email: string
          guest_name: string
          guest_phone: string | null
          id: string
          room_id: string | null
          room_type_id: string | null
          special_requests: string | null
          status: string
          total_price: number
          updated_at: string
        }
        Insert: {
          arrival_time?: string | null
          check_in: string
          check_out: string
          created_at?: string
          guest_data?: Json | null
          guest_email: string
          guest_name: string
          guest_phone?: string | null
          id?: string
          room_id?: string | null
          room_type_id?: string | null
          special_requests?: string | null
          status?: string
          total_price: number
          updated_at?: string
        }
        Update: {
          arrival_time?: string | null
          check_in?: string
          check_out?: string
          created_at?: string
          guest_data?: Json | null
          guest_email?: string
          guest_name?: string
          guest_phone?: string | null
          id?: string
          room_id?: string | null
          room_type_id?: string | null
          special_requests?: string | null
          status?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      child_age_brackets: {
        Row: {
          created_at: string
          discount_percent: number
          from_age: number
          id: string
          sort_order: number
          to_age: number
        }
        Insert: {
          created_at?: string
          discount_percent?: number
          from_age?: number
          id?: string
          sort_order?: number
          to_age?: number
        }
        Update: {
          created_at?: string
          discount_percent?: number
          from_age?: number
          id?: string
          sort_order?: number
          to_age?: number
        }
        Relationships: []
      }
      ical_blocked_dates: {
        Row: {
          blocked_date: string
          created_at: string
          id: string
          room_id: string
          source: string | null
        }
        Insert: {
          blocked_date: string
          created_at?: string
          id?: string
          room_id: string
          source?: string | null
        }
        Update: {
          blocked_date?: string
          created_at?: string
          id?: string
          room_id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ical_blocked_dates_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      night_discounts: {
        Row: {
          created_at: string
          discount_percent: number
          id: string
          min_nights: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          discount_percent?: number
          id?: string
          min_nights: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          discount_percent?: number
          id?: string
          min_nights?: number
          sort_order?: number
        }
        Relationships: []
      }
      pricing_rules: {
        Row: {
          created_at: string
          end_date: string
          id: string
          min_nights: number
          price_per_night: number
          room_id: string
          room_type_id: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          min_nights?: number
          price_per_night: number
          room_id: string
          room_type_id?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          min_nights?: number
          price_per_night?: number
          room_id?: string
          room_type_id?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rules_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          sort_order?: number
        }
        Relationships: []
      }
      property_settings: {
        Row: {
          address: string | null
          admin_email: string | null
          booking_email_template: string | null
          created_at: string
          deposit_percent: number
          description: string | null
          email: string | null
          guest_fields: Json | null
          ical_url: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          admin_email?: string | null
          booking_email_template?: string | null
          created_at?: string
          deposit_percent?: number
          description?: string | null
          email?: string | null
          guest_fields?: Json | null
          ical_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          admin_email?: string | null
          booking_email_template?: string | null
          created_at?: string
          deposit_percent?: number
          description?: string | null
          email?: string | null
          guest_fields?: Json | null
          ical_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      room_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          room_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          room_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          room_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "room_images_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_type_availability: {
        Row: {
          available_count: number
          created_at: string
          date: string
          id: string
          room_type_id: string
        }
        Insert: {
          available_count?: number
          created_at?: string
          date: string
          id?: string
          room_type_id: string
        }
        Update: {
          available_count?: number
          created_at?: string
          date?: string
          id?: string
          room_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_type_availability_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      room_type_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          room_type_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          room_type_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          room_type_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "room_type_images_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      room_types: {
        Row: {
          adult_extra_beds: number
          amenities: Json | null
          base_capacity: number
          base_price: number
          capacity: number
          created_at: string
          description: string | null
          extra_beds: number
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          adult_extra_beds?: number
          amenities?: Json | null
          base_capacity?: number
          base_price?: number
          capacity?: number
          created_at?: string
          description?: string | null
          extra_beds?: number
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          adult_extra_beds?: number
          amenities?: Json | null
          base_capacity?: number
          base_price?: number
          capacity?: number
          created_at?: string
          description?: string | null
          extra_beds?: number
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          adult_extra_beds: number
          amenities: Json | null
          base_capacity: number
          base_price: number
          capacity: number
          created_at: string
          description: string | null
          extra_beds: number
          id: string
          is_active: boolean
          min_nights: number
          name: string
          room_type_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          adult_extra_beds?: number
          amenities?: Json | null
          base_capacity?: number
          base_price?: number
          capacity?: number
          created_at?: string
          description?: string | null
          extra_beds?: number
          id?: string
          is_active?: boolean
          min_nights?: number
          name: string
          room_type_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          adult_extra_beds?: number
          amenities?: Json | null
          base_capacity?: number
          base_price?: number
          capacity?: number
          created_at?: string
          description?: string | null
          extra_beds?: number
          id?: string
          is_active?: boolean
          min_nights?: number
          name?: string
          room_type_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      special_discounts: {
        Row: {
          created_at: string
          discount_percent: number
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          discount_percent?: number
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          discount_percent?: number
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      property_settings_public: {
        Row: {
          address: string | null
          created_at: string | null
          description: string | null
          email: string | null
          guest_fields: Json | null
          id: string | null
          latitude: number | null
          longitude: number | null
          name: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          guest_fields?: Json | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          guest_fields?: Json | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
