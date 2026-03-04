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
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          barber_id: string
          client_name: string
          client_phone: string
          client_user_id: string | null
          created_at: string | null
          id: string
          price: number
          reminder_sent: boolean
          service_id: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string | null
          webhook_sent: boolean
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          barber_id: string
          client_name: string
          client_phone: string
          client_user_id?: string | null
          created_at?: string | null
          id?: string
          price: number
          reminder_sent?: boolean
          service_id: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string | null
          webhook_sent?: boolean
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          barber_id?: string
          client_name?: string
          client_phone?: string
          client_user_id?: string | null
          created_at?: string | null
          id?: string
          price?: number
          reminder_sent?: boolean
          service_id?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string | null
          webhook_sent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_availability: {
        Row: {
          active: boolean | null
          barber_id: string
          day_of_week: number
          end_time: string
          id: string
          start_time: string
        }
        Insert: {
          active?: boolean | null
          barber_id: string
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
        }
        Update: {
          active?: boolean | null
          barber_id?: string
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_availability_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      barbers: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string
          photo_url: string | null
          specialty: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          photo_url?: string | null
          specialty?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          specialty?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blocked_dates: {
        Row: {
          all_day: boolean
          barber_id: string | null
          blocked_date: string | null
          created_at: string | null
          end_time: string | null
          id: string
          reason: string | null
          start_time: string | null
        }
        Insert: {
          all_day?: boolean
          barber_id?: string | null
          blocked_date?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          reason?: string | null
          start_time?: string | null
        }
        Update: {
          all_day?: boolean
          barber_id?: string | null
          blocked_date?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          reason?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_dates_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          email_type: string
          error_message: string | null
          id: string
          recipient_email: string
          recipient_name: string | null
          status: string
          subject: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          email_type: string
          error_message?: string | null
          id?: string
          recipient_email: string
          recipient_name?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          recipient_email?: string
          recipient_name?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_items: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          media_type: string
          media_url: string
          sort_order: number | null
          title: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          media_type?: string
          media_url: string
          sort_order?: number | null
          title?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          media_type?: string
          media_url?: string
          sort_order?: number | null
          title?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          unit_price: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          customer_name: string
          customer_phone: string
          id: string
          notes: string | null
          status: string
          total: number
        }
        Insert: {
          created_at?: string | null
          customer_name: string
          customer_phone: string
          id?: string
          notes?: string | null
          status?: string
          total?: number
        }
        Update: {
          created_at?: string | null
          customer_name?: string
          customer_phone?: string
          id?: string
          notes?: string | null
          status?: string
          total?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          stock: number
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price: number
          stock?: number
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          stock?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_city: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          auth_id: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          whatsapp: string | null
        }
        Insert: {
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          auth_id?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          whatsapp?: string | null
        }
        Update: {
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          auth_id?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          appointment_id: string | null
          barber_id: string
          client_name: string | null
          client_photo_url: string | null
          client_user_id: string | null
          comment: string | null
          created_at: string | null
          id: string
          rating: number
        }
        Insert: {
          appointment_id?: string | null
          barber_id: string
          client_name?: string | null
          client_photo_url?: string | null
          client_user_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
        }
        Update: {
          appointment_id?: string | null
          barber_id?: string
          client_name?: string | null
          client_photo_url?: string | null
          client_user_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          duration_minutes: number
          icon: string | null
          id: string
          image_url: string | null
          name: string
          price: number
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          duration_minutes: number
          icon?: string | null
          id?: string
          image_url?: string | null
          name: string
          price: number
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_barber_user: { Args: { _barber_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "barber" | "client"
      appointment_status: "pendente" | "confirmado" | "cancelado" | "concluido"
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
      app_role: ["admin", "barber", "client"],
      appointment_status: ["pendente", "confirmado", "cancelado", "concluido"],
    },
  },
} as const
