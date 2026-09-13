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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          account_id: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          processed_at: string | null
          reason: string | null
          status: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          processed_at?: string | null
          reason?: string | null
          status?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          processed_at?: string | null
          reason?: string | null
          status?: string
        }
        Relationships: []
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string | null
          id: string
          sale_id: string
          status: string
        }
        Insert: {
          affiliate_id: string
          amount?: number
          created_at?: string | null
          id?: string
          sale_id: string
          status?: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string | null
          id?: string
          sale_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "affiliate_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_sales: {
        Row: {
          access_released: boolean
          affiliate_id: string
          amount: number
          client_email: string
          client_name: string | null
          commission_amount: number
          created_at: string | null
          created_user_id: string | null
          id: string
          payment_status: string
          plan_id: string | null
          store_name: string | null
        }
        Insert: {
          access_released?: boolean
          affiliate_id: string
          amount?: number
          client_email: string
          client_name?: string | null
          commission_amount?: number
          created_at?: string | null
          created_user_id?: string | null
          id?: string
          payment_status?: string
          plan_id?: string | null
          store_name?: string | null
        }
        Update: {
          access_released?: boolean
          affiliate_id?: string
          amount?: number
          client_email?: string
          client_name?: string | null
          commission_amount?: number
          created_at?: string | null
          created_user_id?: string | null
          id?: string
          payment_status?: string
          plan_id?: string | null
          store_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_sales_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_sales_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_searches: {
        Row: {
          affiliate_id: string
          created_at: string | null
          id: string
          results_count: number | null
          search_city: string
          search_query: string
        }
        Insert: {
          affiliate_id: string
          created_at?: string | null
          id?: string
          results_count?: number | null
          search_city: string
          search_query: string
        }
        Update: {
          affiliate_id?: string
          created_at?: string | null
          id?: string
          results_count?: number | null
          search_city?: string
          search_query?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_searches_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_withdrawals: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string | null
          id: string
          ip_address: string | null
          paid_at: string | null
          pix_key: string
          pix_type: string
          processed_at: string | null
          status: string
        }
        Insert: {
          affiliate_id: string
          amount: number
          created_at?: string | null
          id?: string
          ip_address?: string | null
          paid_at?: string | null
          pix_key: string
          pix_type: string
          processed_at?: string | null
          status?: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string | null
          id?: string
          ip_address?: string | null
          paid_at?: string | null
          pix_key?: string
          pix_type?: string
          processed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_withdrawals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          commission_percent: number
          cpf: string | null
          created_at: string | null
          id: string
          phone: string | null
          pix_key: string | null
          pix_type: string | null
          ref_code: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          commission_percent?: number
          cpf?: string | null
          created_at?: string | null
          id?: string
          phone?: string | null
          pix_key?: string | null
          pix_type?: string | null
          ref_code: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          commission_percent?: number
          cpf?: string | null
          created_at?: string | null
          id?: string
          phone?: string | null
          pix_key?: string | null
          pix_type?: string | null
          ref_code?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          attendance_confirmation_status: string | null
          bairro: string | null
          barber_id: string
          cep: string | null
          cidade: string | null
          client_email: string | null
          client_name: string
          client_phone: string
          client_user_id: string | null
          company_revenue: number | null
          complemento: string | null
          created_at: string | null
          deposit_amount: number | null
          deposit_paid: boolean | null
          deposit_required: boolean | null
          endereco: string | null
          estado: string | null
          id: string
          notes: string | null
          numero: string | null
          payment_status: string | null
          price: number
          reminder_24h_sent: boolean
          reminder_2h_sent: boolean
          reminder_sent: boolean
          service_id: string
          staff_commission: number | null
          status: Database["public"]["Enums"]["appointment_status"]
          tenant_id: string | null
          updated_at: string | null
          webhook_sent: boolean
          whatsapp_reminder_sent: boolean | null
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          attendance_confirmation_status?: string | null
          bairro?: string | null
          barber_id: string
          cep?: string | null
          cidade?: string | null
          client_email?: string | null
          client_name: string
          client_phone: string
          client_user_id?: string | null
          company_revenue?: number | null
          complemento?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_required?: boolean | null
          endereco?: string | null
          estado?: string | null
          id?: string
          notes?: string | null
          numero?: string | null
          payment_status?: string | null
          price: number
          reminder_24h_sent?: boolean
          reminder_2h_sent?: boolean
          reminder_sent?: boolean
          service_id: string
          staff_commission?: number | null
          status?: Database["public"]["Enums"]["appointment_status"]
          tenant_id?: string | null
          updated_at?: string | null
          webhook_sent?: boolean
          whatsapp_reminder_sent?: boolean | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          attendance_confirmation_status?: string | null
          bairro?: string | null
          barber_id?: string
          cep?: string | null
          cidade?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string
          client_user_id?: string | null
          company_revenue?: number | null
          complemento?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_required?: boolean | null
          endereco?: string | null
          estado?: string | null
          id?: string
          notes?: string | null
          numero?: string | null
          payment_status?: string | null
          price?: number
          reminder_24h_sent?: boolean
          reminder_2h_sent?: boolean
          reminder_sent?: boolean
          service_id?: string
          staff_commission?: number | null
          status?: Database["public"]["Enums"]["appointment_status"]
          tenant_id?: string | null
          updated_at?: string | null
          webhook_sent?: boolean
          whatsapp_reminder_sent?: boolean | null
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
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
        }
        Insert: {
          active?: boolean | null
          barber_id: string
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
          tenant_id?: string | null
        }
        Update: {
          active?: boolean | null
          barber_id?: string
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barber_availability_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_availability_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          photo_url?: string | null
          specialty?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          specialty?: string | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barbers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_dates_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_dates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_items: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          id: string
          media_type: string
          media_url: string
          sort_order: number | null
          tenant_id: string | null
          title: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          media_type?: string
          media_url: string
          sort_order?: number | null
          tenant_id?: string | null
          title?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          media_type?: string
          media_url?: string
          sort_order?: number | null
          tenant_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_queue: {
        Row: {
          attempts: number
          created_at: string | null
          error_message: string | null
          id: string
          locked_at: string | null
          max_attempts: number
          payload: Json
          processed_at: string | null
          status: string
          tenant_id: string | null
          type: string
        }
        Insert: {
          attempts?: number
          created_at?: string | null
          error_message?: string | null
          id?: string
          locked_at?: string | null
          max_attempts?: number
          payload?: Json
          processed_at?: string | null
          status?: string
          tenant_id?: string | null
          type: string
        }
        Update: {
          attempts?: number
          created_at?: string | null
          error_message?: string | null
          id?: string
          locked_at?: string | null
          max_attempts?: number
          payload?: Json
          processed_at?: string | null
          status?: string
          tenant_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_clients_logos: {
        Row: {
          created_at: string | null
          empresa_nome: string
          id: string
          logo_url: string
        }
        Insert: {
          created_at?: string | null
          empresa_nome: string
          id?: string
          logo_url: string
        }
        Update: {
          created_at?: string | null
          empresa_nome?: string
          id?: string
          logo_url?: string
        }
        Relationships: []
      }
      landing_gallery_images: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          ordem: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          ordem?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          ordem?: number
        }
        Relationships: []
      }
      landing_gallery_videos: {
        Row: {
          created_at: string | null
          id: string
          titulo: string | null
          video_url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          titulo?: string | null
          video_url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          titulo?: string | null
          video_url?: string
        }
        Relationships: []
      }
      landing_page_settings: {
        Row: {
          id: string
          settings: Json
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          settings?: Json
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          settings?: Json
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      login_history: {
        Row: {
          browser: string | null
          created_at: string | null
          device: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string | null
          device?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string | null
          device?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          body: string
          created_at: string | null
          id: string
          subject: string
          tenant_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          body?: string
          created_at?: string | null
          id?: string
          subject?: string
          tenant_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          subject?: string
          tenant_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          tenant_id: string | null
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          tenant_id?: string | null
          unit_price: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          tenant_id?: string | null
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
          {
            foreignKeyName: "order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          created_at: string | null
          customer_name: string
          customer_phone: string
          estado: string | null
          id: string
          notes: string | null
          numero: string | null
          referencia: string | null
          rua: string | null
          status: string
          tenant_id: string | null
          total: number
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string | null
          customer_name: string
          customer_phone: string
          estado?: string | null
          id?: string
          notes?: string | null
          numero?: string | null
          referencia?: string | null
          rua?: string | null
          status?: string
          tenant_id?: string | null
          total?: number
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string | null
          customer_name?: string
          customer_phone?: string
          estado?: string | null
          id?: string
          notes?: string | null
          numero?: string | null
          referencia?: string | null
          rua?: string | null
          status?: string
          tenant_id?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      paid_signups: {
        Row: {
          amount: number
          consumed_at: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          payment_method: string | null
          plan_id: string | null
          ref_code: string | null
          status: string
          tenant_id: string | null
          transaction_id: string
        }
        Insert: {
          amount?: number
          consumed_at?: string | null
          created_at?: string
          email: string
          id?: string
          name?: string | null
          payment_method?: string | null
          plan_id?: string | null
          ref_code?: string | null
          status?: string
          tenant_id?: string | null
          transaction_id: string
        }
        Update: {
          amount?: number
          consumed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          payment_method?: string | null
          plan_id?: string | null
          ref_code?: string | null
          status?: string
          tenant_id?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paid_signups_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paid_signups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          payment_method: string
          plan_id: string
          status: string
          tenant_id: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          payment_method?: string
          plan_id: string
          status?: string
          tenant_id: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          payment_method?: string
          plan_id?: string
          status?: string
          tenant_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          max_appointments_month: number | null
          max_barbers: number | null
          max_clients: number | null
          max_products: number | null
          max_services: number | null
          name: string
          price: number
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          max_appointments_month?: number | null
          max_barbers?: number | null
          max_clients?: number | null
          max_products?: number | null
          max_services?: number | null
          name: string
          price?: number
        }
        Update: {
          active?: boolean
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          max_appointments_month?: number | null
          max_barbers?: number | null
          max_clients?: number | null
          max_products?: number | null
          max_services?: number | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      platform_settings: {
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
          value?: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean | null
          allow_local_pickup: boolean
          allow_manual_payment_methods: boolean
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          negotiation_message: string | null
          payment_mode: string
          price: number
          stock: number
          tenant_id: string | null
        }
        Insert: {
          active?: boolean | null
          allow_local_pickup?: boolean
          allow_manual_payment_methods?: boolean
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          negotiation_message?: string | null
          payment_mode?: string
          price: number
          stock?: number
          tenant_id?: string | null
        }
        Update: {
          active?: boolean | null
          allow_local_pickup?: boolean
          allow_manual_payment_methods?: boolean
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          negotiation_message?: string | null
          payment_mode?: string
          price?: number
          stock?: number
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      public_setting_keys: {
        Row: {
          created_at: string
          description: string | null
          is_prefix: boolean
          key: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          is_prefix?: boolean
          key: string
        }
        Update: {
          created_at?: string
          description?: string | null
          is_prefix?: boolean
          key?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          active: boolean
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          appointment_id: string | null
          approved: boolean
          barber_id: string
          client_name: string | null
          client_photo_url: string | null
          client_user_id: string | null
          comment: string | null
          created_at: string | null
          id: string
          rating: number
          tenant_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          approved?: boolean
          barber_id: string
          client_name?: string | null
          client_photo_url?: string | null
          client_user_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
          tenant_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          approved?: boolean
          barber_id?: string
          client_name?: string | null
          client_photo_url?: string | null
          client_user_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          tenant_id?: string | null
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
          {
            foreignKeyName: "reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean | null
          commission_percentage: number | null
          created_at: string | null
          description: string | null
          duration_minutes: number
          icon: string | null
          id: string
          image_url: string | null
          is_full_day: boolean | null
          name: string
          price: number
          tenant_id: string | null
        }
        Insert: {
          active?: boolean | null
          commission_percentage?: number | null
          created_at?: string | null
          description?: string | null
          duration_minutes: number
          icon?: string | null
          id?: string
          image_url?: string | null
          is_full_day?: boolean | null
          name: string
          price: number
          tenant_id?: string | null
        }
        Update: {
          active?: boolean | null
          commission_percentage?: number | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          icon?: string | null
          id?: string
          image_url?: string | null
          is_full_day?: boolean | null
          name?: string
          price?: number
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: string
          key: string
          tenant_id: string | null
          updated_at: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          tenant_id?: string | null
          updated_at?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          tenant_id?: string | null
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          payment_method: string
          plan_id: string
          status: string
          tenant_id: string
          trial_ends_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          payment_method?: string
          plan_id: string
          status?: string
          tenant_id: string
          trial_ends_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          payment_method?: string
          plan_id?: string
          status?: string
          tenant_id?: string
          trial_ends_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_secrets: {
        Row: {
          created_at: string | null
          id: string
          key: string
          tenant_id: string
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          tenant_id: string
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          tenant_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_secrets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          active: boolean
          address: string | null
          city: string | null
          created_at: string | null
          custom_domain: string | null
          id: string
          logo_url: string | null
          marketplace_logo_url: string | null
          marketplace_visible: boolean
          mercadopago_access_token: string | null
          mercadopago_public_key: string | null
          name: string
          niche: string | null
          no_show_cancel_limit_hours: number | null
          no_show_deposit_value: number | null
          no_show_enabled: boolean | null
          no_show_retention_percentage: number | null
          onboarding_completed: boolean
          owner_user_id: string | null
          phone: string | null
          plan_id: string | null
          referred_by_affiliate_id: string | null
          slug: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string | null
          created_at?: string | null
          custom_domain?: string | null
          id?: string
          logo_url?: string | null
          marketplace_logo_url?: string | null
          marketplace_visible?: boolean
          mercadopago_access_token?: string | null
          mercadopago_public_key?: string | null
          name: string
          niche?: string | null
          no_show_cancel_limit_hours?: number | null
          no_show_deposit_value?: number | null
          no_show_enabled?: boolean | null
          no_show_retention_percentage?: number | null
          onboarding_completed?: boolean
          owner_user_id?: string | null
          phone?: string | null
          plan_id?: string | null
          referred_by_affiliate_id?: string | null
          slug: string
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string | null
          created_at?: string | null
          custom_domain?: string | null
          id?: string
          logo_url?: string | null
          marketplace_logo_url?: string | null
          marketplace_visible?: boolean
          mercadopago_access_token?: string | null
          mercadopago_public_key?: string | null
          name?: string
          niche?: string | null
          no_show_cancel_limit_hours?: number | null
          no_show_deposit_value?: number | null
          no_show_enabled?: boolean | null
          no_show_retention_percentage?: number | null
          onboarding_completed?: boolean
          owner_user_id?: string | null
          phone?: string | null
          plan_id?: string | null
          referred_by_affiliate_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_referred_by_affiliate_id_fkey"
            columns: ["referred_by_affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          created_at: string | null
          id: string
          message_status: string
          message_text: string
          phone: string | null
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_status?: string
          message_text: string
          phone?: string | null
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message_status?: string
          message_text?: string
          phone?: string | null
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_auto_logs: {
        Row: {
          appointment_id: string | null
          attempts: number
          created_at: string
          error_message: string | null
          id: string
          message_type: string
          provider_message_id: string | null
          recipient: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          appointment_id?: string | null
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          message_type: string
          provider_message_id?: string | null
          recipient?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          appointment_id?: string | null
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          message_type?: string
          provider_message_id?: string | null
          recipient?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_auto_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_auto_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_auto_settings: {
        Row: {
          confirm_client_enabled: boolean
          confirm_client_template: string
          confirm_owner_enabled: boolean
          confirm_owner_template: string
          created_at: string
          id: string
          owner_phone: string | null
          reminder_1d_enabled: boolean
          reminder_1d_template: string
          reminder_1d_time: string
          reminder_2h_enabled: boolean
          reminder_2h_template: string
          tenant_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          confirm_client_enabled?: boolean
          confirm_client_template?: string
          confirm_owner_enabled?: boolean
          confirm_owner_template?: string
          created_at?: string
          id?: string
          owner_phone?: string | null
          reminder_1d_enabled?: boolean
          reminder_1d_template?: string
          reminder_1d_time?: string
          reminder_2h_enabled?: boolean
          reminder_2h_template?: string
          tenant_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          confirm_client_enabled?: boolean
          confirm_client_template?: string
          confirm_owner_enabled?: boolean
          confirm_owner_template?: string
          created_at?: string
          id?: string
          owner_phone?: string | null
          reminder_1d_enabled?: boolean
          reminder_1d_template?: string
          reminder_1d_time?: string
          reminder_2h_enabled?: boolean
          reminder_2h_template?: string
          tenant_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_auto_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_go_configs: {
        Row: {
          base_url: string
          created_at: string
          id: string
          instance_id: string | null
          instance_name: string | null
          instance_token: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          base_url: string
          created_at?: string
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          instance_token: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          base_url?: string
          created_at?: string
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          instance_token?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_go_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_go_events: {
        Row: {
          chat: string | null
          created_at: string
          event: string
          from_number: string | null
          id: string
          instance_id: string | null
          instance_name: string | null
          is_from_me: boolean
          is_group: boolean
          message_id: string | null
          message_text: string | null
          message_type: string | null
          push_name: string | null
          raw: Json
          tenant_id: string
        }
        Insert: {
          chat?: string | null
          created_at?: string
          event: string
          from_number?: string | null
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          is_from_me?: boolean
          is_group?: boolean
          message_id?: string | null
          message_text?: string | null
          message_type?: string | null
          push_name?: string | null
          raw: Json
          tenant_id: string
        }
        Update: {
          chat?: string | null
          created_at?: string
          event?: string
          from_number?: string | null
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          is_from_me?: boolean
          is_group?: boolean
          message_id?: string | null
          message_text?: string | null
          message_type?: string | null
          push_name?: string | null
          raw?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_go_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_appointment_availability: {
        Args: { _barber_id: string; _date: string }
        Returns: {
          appointment_time: string
          duration_minutes: number
        }[]
      }
      get_affiliate_referred_tenants: {
        Args: never
        Returns: {
          active: boolean
          created_at: string
          id: string
          name: string
          plan_id: string
          plan_name: string
          slug: string
        }[]
      }
      get_marketplace_listings: {
        Args: never
        Returns: {
          avg_rating: number
          city: string
          id: string
          logo_url: string
          marketplace_logo_url: string
          name: string
          niche: string
          slug: string
        }[]
      }
      get_public_tenant_by_custom_domain: {
        Args: { _domain: string }
        Returns: {
          active: boolean
          id: string
          logo_url: string
          name: string
          niche: string
          slug: string
        }[]
      }
      get_public_tenant_by_slug: {
        Args: { _slug: string }
        Returns: {
          active: boolean
          id: string
          logo_url: string
          name: string
          niche: string
          slug: string
        }[]
      }
      get_queue_cron_secret: { Args: never; Returns: string }
      get_user_tenant_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_barber_user: { Args: { _barber_id: string }; Returns: boolean }
      is_public_setting_key: { Args: { _key: string }; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "barber"
        | "client"
        | "super_admin"
        | "affiliate"
        | "staff"
      appointment_status:
        | "pendente"
        | "confirmado"
        | "cancelado"
        | "concluido"
        | "no_show"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "admin",
        "barber",
        "client",
        "super_admin",
        "affiliate",
        "staff",
      ],
      appointment_status: [
        "pendente",
        "confirmado",
        "cancelado",
        "concluido",
        "no_show",
      ],
    },
  },
} as const
