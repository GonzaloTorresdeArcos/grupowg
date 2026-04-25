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
      profiles: {
        Row: {
          application_id: string | null
          avatar_url: string | null
          company_name: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "wg_network_applications"
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
      wg_accessibility_requests: {
        Row: {
          admin_notes: string | null
          assistive_tech: string | null
          consent_at: string | null
          consent_given: boolean
          created_at: string
          description: string
          email: string
          full_name: string
          id: string
          organization: string | null
          page_url: string | null
          phone: string | null
          postal_address: string | null
          preferred_format: string | null
          request_type: string
          status: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          admin_notes?: string | null
          assistive_tech?: string | null
          consent_at?: string | null
          consent_given?: boolean
          created_at?: string
          description: string
          email: string
          full_name: string
          id?: string
          organization?: string | null
          page_url?: string | null
          phone?: string | null
          postal_address?: string | null
          preferred_format?: string | null
          request_type: string
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          admin_notes?: string | null
          assistive_tech?: string | null
          consent_at?: string | null
          consent_given?: boolean
          created_at?: string
          description?: string
          email?: string
          full_name?: string
          id?: string
          organization?: string | null
          page_url?: string | null
          phone?: string | null
          postal_address?: string | null
          preferred_format?: string | null
          request_type?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      wg_application_drafts: {
        Row: {
          created_at: string
          current_step: number
          email: string
          email_verified: boolean
          expires_at: string
          form_data: Json
          id: string
          last_sent_at: string | null
          phone_verified: boolean
          resume_token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_step?: number
          email: string
          email_verified?: boolean
          expires_at?: string
          form_data?: Json
          id?: string
          last_sent_at?: string | null
          phone_verified?: boolean
          resume_token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_step?: number
          email?: string
          email_verified?: boolean
          expires_at?: string
          form_data?: Json
          id?: string
          last_sent_at?: string | null
          phone_verified?: boolean
          resume_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      wg_application_scoring: {
        Row: {
          application_id: string | null
          breakdown: Json
          created_at: string
          draft_id: string | null
          id: string
          tier: string
          total_score: number
        }
        Insert: {
          application_id?: string | null
          breakdown?: Json
          created_at?: string
          draft_id?: string | null
          id?: string
          tier: string
          total_score?: number
        }
        Update: {
          application_id?: string | null
          breakdown?: Json
          created_at?: string
          draft_id?: string | null
          id?: string
          tier?: string
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "wg_application_scoring_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "wg_network_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wg_application_scoring_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "wg_application_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      wg_appointments: {
        Row: {
          address: string | null
          brand: string | null
          case_ref: string | null
          city: string | null
          created_at: string
          customer_name: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          postal_code: string | null
          product_family: string | null
          scheduled_at: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          brand?: string | null
          case_ref?: string | null
          city?: string | null
          created_at?: string
          customer_name?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          postal_code?: string | null
          product_family?: string | null
          scheduled_at: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          brand?: string | null
          case_ref?: string | null
          city?: string | null
          created_at?: string
          customer_name?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          postal_code?: string | null
          product_family?: string | null
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wg_collaborator_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          expires_at: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          issued_at: string | null
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type: string
          expires_at?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          issued_at?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          expires_at?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          issued_at?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wg_incidence_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          incidence_id: string
          sender_name: string | null
          sender_role: string
          sender_user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          incidence_id: string
          sender_name?: string | null
          sender_role: string
          sender_user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          incidence_id?: string
          sender_name?: string | null
          sender_role?: string
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wg_incidence_messages_incidence_id_fkey"
            columns: ["incidence_id"]
            isOneToOne: false
            referencedRelation: "wg_incidences"
            referencedColumns: ["id"]
          },
        ]
      }
      wg_incidences: {
        Row: {
          address: string | null
          appointment_id: string | null
          assigned_application_id: string | null
          assigned_at: string | null
          assigned_user_id: string | null
          brand: string | null
          city: string | null
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          description: string | null
          id: string
          match_snapshot: Json | null
          postal_code: string | null
          product_family: string
          province_code: string
          ref: string
          status: string
          updated_at: string
          urgency: string
        }
        Insert: {
          address?: string | null
          appointment_id?: string | null
          assigned_application_id?: string | null
          assigned_at?: string | null
          assigned_user_id?: string | null
          brand?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          description?: string | null
          id?: string
          match_snapshot?: Json | null
          postal_code?: string | null
          product_family: string
          province_code: string
          ref: string
          status?: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          address?: string | null
          appointment_id?: string | null
          assigned_application_id?: string | null
          assigned_at?: string | null
          assigned_user_id?: string | null
          brand?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          description?: string | null
          id?: string
          match_snapshot?: Json | null
          postal_code?: string | null
          product_family?: string
          province_code?: string
          ref?: string
          status?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "wg_incidences_assigned_application_id_fkey"
            columns: ["assigned_application_id"]
            isOneToOne: false
            referencedRelation: "wg_network_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      wg_invoices: {
        Row: {
          amount_net: number
          amount_total: number
          created_at: string
          currency: string
          due_at: string | null
          id: string
          invoice_number: string
          issued_at: string
          notes: string | null
          paid_at: string | null
          pdf_path: string | null
          period: string | null
          service_count: number | null
          status: string
          updated_at: string
          user_id: string
          vat: number
        }
        Insert: {
          amount_net?: number
          amount_total?: number
          created_at?: string
          currency?: string
          due_at?: string | null
          id?: string
          invoice_number: string
          issued_at: string
          notes?: string | null
          paid_at?: string | null
          pdf_path?: string | null
          period?: string | null
          service_count?: number | null
          status?: string
          updated_at?: string
          user_id: string
          vat?: number
        }
        Update: {
          amount_net?: number
          amount_total?: number
          created_at?: string
          currency?: string
          due_at?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string
          notes?: string | null
          paid_at?: string | null
          pdf_path?: string | null
          period?: string | null
          service_count?: number | null
          status?: string
          updated_at?: string
          user_id?: string
          vat?: number
        }
        Relationships: []
      }
      wg_network_applications: {
        Row: {
          approved_at: string | null
          capacidad_mensual: string | null
          cif_nif: string
          coberturas: string[] | null
          created_at: string
          current_score: number | null
          current_tier: string | null
          datos_seguros: Json | null
          direccion_fiscal: string | null
          email: string
          familias_producto: string[] | null
          horarios: string | null
          id: string
          lat: number | null
          lng: number | null
          marcas_codes: string[] | null
          marcas_trabajadas: string | null
          nombre_comercial: string | null
          numero_tecnicos: number | null
          persona_contacto: string
          provincias: string | null
          provincias_codes: string[] | null
          razon_social: string
          servicios_ofrecidos: string[] | null
          status: string
          telefono: string
          tipo_colaborador: string
          zona_cobertura: string | null
        }
        Insert: {
          approved_at?: string | null
          capacidad_mensual?: string | null
          cif_nif: string
          coberturas?: string[] | null
          created_at?: string
          current_score?: number | null
          current_tier?: string | null
          datos_seguros?: Json | null
          direccion_fiscal?: string | null
          email: string
          familias_producto?: string[] | null
          horarios?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          marcas_codes?: string[] | null
          marcas_trabajadas?: string | null
          nombre_comercial?: string | null
          numero_tecnicos?: number | null
          persona_contacto: string
          provincias?: string | null
          provincias_codes?: string[] | null
          razon_social: string
          servicios_ofrecidos?: string[] | null
          status?: string
          telefono: string
          tipo_colaborador: string
          zona_cobertura?: string | null
        }
        Update: {
          approved_at?: string | null
          capacidad_mensual?: string | null
          cif_nif?: string
          coberturas?: string[] | null
          created_at?: string
          current_score?: number | null
          current_tier?: string | null
          datos_seguros?: Json | null
          direccion_fiscal?: string | null
          email?: string
          familias_producto?: string[] | null
          horarios?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          marcas_codes?: string[] | null
          marcas_trabajadas?: string | null
          nombre_comercial?: string | null
          numero_tecnicos?: number | null
          persona_contacto?: string
          provincias?: string | null
          provincias_codes?: string[] | null
          razon_social?: string
          servicios_ofrecidos?: string[] | null
          status?: string
          telefono?: string
          tipo_colaborador?: string
          zona_cobertura?: string | null
        }
        Relationships: []
      }
      wg_network_documents: {
        Row: {
          application_id: string | null
          created_at: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wg_network_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "wg_network_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      wg_otp_codes: {
        Row: {
          attempts: number
          channel: string
          code_hash: string
          consumed_at: string | null
          created_at: string
          destination: string
          expires_at: string
          id: string
        }
        Insert: {
          attempts?: number
          channel: string
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          destination: string
          expires_at?: string
          id?: string
        }
        Update: {
          attempts?: number
          channel?: string
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          destination?: string
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      wg_signed_agreements: {
        Row: {
          application_id: string | null
          created_at: string
          draft_id: string | null
          id: string
          ip_address: string | null
          pdf_path: string | null
          signature_data_url: string | null
          signed_at: string
          signer_dni: string | null
          signer_email: string
          signer_name: string
          user_agent: string | null
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          draft_id?: string | null
          id?: string
          ip_address?: string | null
          pdf_path?: string | null
          signature_data_url?: string | null
          signed_at?: string
          signer_dni?: string | null
          signer_email: string
          signer_name: string
          user_agent?: string | null
        }
        Update: {
          application_id?: string | null
          created_at?: string
          draft_id?: string | null
          id?: string
          ip_address?: string | null
          pdf_path?: string | null
          signature_data_url?: string | null
          signed_at?: string
          signer_dni?: string | null
          signer_email?: string
          signer_name?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wg_signed_agreements_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "wg_network_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wg_signed_agreements_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "wg_application_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      wg_sms_log: {
        Row: {
          body: string
          context: string | null
          created_at: string
          destination: string
          id: string
          provider: string
          related_appointment_id: string | null
          related_incidence_id: string | null
          sent_by: string | null
          status: string
        }
        Insert: {
          body: string
          context?: string | null
          created_at?: string
          destination: string
          id?: string
          provider?: string
          related_appointment_id?: string | null
          related_incidence_id?: string | null
          sent_by?: string | null
          status?: string
        }
        Update: {
          body?: string
          context?: string | null
          created_at?: string
          destination?: string
          id?: string
          provider?: string
          related_appointment_id?: string | null
          related_incidence_id?: string | null
          sent_by?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      grant_admin_by_email: { Args: { _email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_candidates_for_incidence: {
        Args: {
          _brand?: string
          _limit?: number
          _product_family: string
          _province_code: string
        }
        Returns: {
          application_id: string
          capacidad_mensual: string
          cobertura_match: boolean
          current_score: number
          current_tier: string
          familia_match: boolean
          marca_match: boolean
          match_score: number
          nombre_comercial: string
          numero_tecnicos: number
          razon_social: string
        }[]
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
