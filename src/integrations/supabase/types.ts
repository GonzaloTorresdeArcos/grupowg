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
      ops_bases: {
        Row: {
          delegacion: string
          lat: number
          lng: number
          nota: string | null
        }
        Insert: {
          delegacion: string
          lat: number
          lng: number
          nota?: string | null
        }
        Update: {
          delegacion?: string
          lat?: number
          lng?: number
          nota?: string | null
        }
        Relationships: []
      }
      ops_benchmark: {
        Row: {
          cliente_wg: string
          created_at: string
          dias_medio: number | null
          familia: string
          id: string
          ots: number | null
          pct_bajas: number | null
          pct_nff: number | null
          updated_at: string
        }
        Insert: {
          cliente_wg: string
          created_at?: string
          dias_medio?: number | null
          familia: string
          id?: string
          ots?: number | null
          pct_bajas?: number | null
          pct_nff?: number | null
          updated_at?: string
        }
        Update: {
          cliente_wg?: string
          created_at?: string
          dias_medio?: number | null
          familia?: string
          id?: string
          ots?: number | null
          pct_bajas?: number | null
          pct_nff?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ops_coste_mensual: {
        Row: {
          coste_total: number
          id: string
          km: number | null
          mes: string
          tecnico: string
          variable: number | null
        }
        Insert: {
          coste_total: number
          id?: string
          km?: number | null
          mes: string
          tecnico: string
          variable?: number | null
        }
        Update: {
          coste_total?: number
          id?: string
          km?: number | null
          mes?: string
          tecnico?: string
          variable?: number | null
        }
        Relationships: []
      }
      ops_cp_geo: {
        Row: {
          cp: string
          lat: number
          lng: number
        }
        Insert: {
          cp: string
          lat: number
          lng: number
        }
        Update: {
          cp?: string
          lat?: number
          lng?: number
        }
        Relationships: []
      }
      ops_fact_ot: {
        Row: {
          anio_garantia: number | null
          aparato: string | null
          canal: string | null
          capital: string | null
          cliente_wg: string | null
          codigo_postal: string | null
          created_at: string
          delegacion: string | null
          dias_cierre: number | null
          es_anulado: boolean
          es_baja: boolean
          es_nff: boolean
          estado: string | null
          fact_cli: number | null
          fact_sat: number | null
          familia: string | null
          fecha_baja: string | null
          fecha_cierre: string | null
          fecha_creacion: string | null
          fecha_primer_contacto: string | null
          fecha_primera_visita: string | null
          gama_origen: string | null
          gama_real: string | null
          id: string
          importe_desplazamiento: number | null
          importe_mo: number | null
          incidencia: string | null
          kpi_20d: boolean | null
          kpi_30d: boolean | null
          marca: string | null
          modelo: string | null
          municipio: string | null
          num_ot: string
          provincia: string | null
          sat: string | null
          seccion: string | null
          situacion: string | null
          sla_cierre_dlab: number | null
          subfamilia: string | null
          tecnico: string | null
          tiene_piezas: boolean | null
          tipo_recurso: string | null
          updated_at: string
        }
        Insert: {
          anio_garantia?: number | null
          aparato?: string | null
          canal?: string | null
          capital?: string | null
          cliente_wg?: string | null
          codigo_postal?: string | null
          created_at?: string
          delegacion?: string | null
          dias_cierre?: number | null
          es_anulado?: boolean
          es_baja?: boolean
          es_nff?: boolean
          estado?: string | null
          fact_cli?: number | null
          fact_sat?: number | null
          familia?: string | null
          fecha_baja?: string | null
          fecha_cierre?: string | null
          fecha_creacion?: string | null
          fecha_primer_contacto?: string | null
          fecha_primera_visita?: string | null
          gama_origen?: string | null
          gama_real?: string | null
          id?: string
          importe_desplazamiento?: number | null
          importe_mo?: number | null
          incidencia?: string | null
          kpi_20d?: boolean | null
          kpi_30d?: boolean | null
          marca?: string | null
          modelo?: string | null
          municipio?: string | null
          num_ot: string
          provincia?: string | null
          sat?: string | null
          seccion?: string | null
          situacion?: string | null
          sla_cierre_dlab?: number | null
          subfamilia?: string | null
          tecnico?: string | null
          tiene_piezas?: boolean | null
          tipo_recurso?: string | null
          updated_at?: string
        }
        Update: {
          anio_garantia?: number | null
          aparato?: string | null
          canal?: string | null
          capital?: string | null
          cliente_wg?: string | null
          codigo_postal?: string | null
          created_at?: string
          delegacion?: string | null
          dias_cierre?: number | null
          es_anulado?: boolean
          es_baja?: boolean
          es_nff?: boolean
          estado?: string | null
          fact_cli?: number | null
          fact_sat?: number | null
          familia?: string | null
          fecha_baja?: string | null
          fecha_cierre?: string | null
          fecha_creacion?: string | null
          fecha_primer_contacto?: string | null
          fecha_primera_visita?: string | null
          gama_origen?: string | null
          gama_real?: string | null
          id?: string
          importe_desplazamiento?: number | null
          importe_mo?: number | null
          incidencia?: string | null
          kpi_20d?: boolean | null
          kpi_30d?: boolean | null
          marca?: string | null
          modelo?: string | null
          municipio?: string | null
          num_ot?: string
          provincia?: string | null
          sat?: string | null
          seccion?: string | null
          situacion?: string | null
          sla_cierre_dlab?: number | null
          subfamilia?: string | null
          tecnico?: string | null
          tiene_piezas?: boolean | null
          tipo_recurso?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ops_portfolio_gamas: {
        Row: {
          cliente_wg: string | null
          created_at: string
          gama_real: string
          id: string
          marca: string
          updated_at: string
        }
        Insert: {
          cliente_wg?: string | null
          created_at?: string
          gama_real: string
          id?: string
          marca: string
          updated_at?: string
        }
        Update: {
          cliente_wg?: string | null
          created_at?: string
          gama_real?: string
          id?: string
          marca?: string
          updated_at?: string
        }
        Relationships: []
      }
      ops_regla_familia: {
        Row: {
          familia: string
          gama: string
        }
        Insert: {
          familia: string
          gama: string
        }
        Update: {
          familia?: string
          gama?: string
        }
        Relationships: []
      }
      ops_regla_marca: {
        Row: {
          gama: string
          marca: string
        }
        Insert: {
          gama: string
          marca: string
        }
        Update: {
          gama?: string
          marca?: string
        }
        Relationships: []
      }
      ops_rrhh: {
        Row: {
          ausencias: number | null
          created_at: string
          dias_trabajados: number | null
          id: string
          mes: string
          tecnico: string
          updated_at: string
        }
        Insert: {
          ausencias?: number | null
          created_at?: string
          dias_trabajados?: number | null
          id?: string
          mes: string
          tecnico: string
          updated_at?: string
        }
        Update: {
          ausencias?: number | null
          created_at?: string
          dias_trabajados?: number | null
          id?: string
          mes?: string
          tecnico?: string
          updated_at?: string
        }
        Relationships: []
      }
      ops_sla_registry: {
        Row: {
          bonus: Json | null
          business_line: string
          calendario: string
          cliente: string
          cliente_wg_patron: string | null
          condicion_aplicacion: string | null
          created_at: string
          estado_regla: string
          evento_fin: string
          evento_inicio: string
          exposicion_estado: string
          fase: string | null
          fuente_contractual: string | null
          gama_familia: string | null
          hard_limit: number | null
          id: string
          imputabilidad: string
          kpi: string
          meses_consecutivos: number | null
          notas: string | null
          pausas_exclusiones: string[]
          penalizacion: Json | null
          programa: string
          regla_medicion: string
          sociedad_wg_ejecutora: string | null
          target: number | null
          tipo_consecuencia: string
          tipo_target: string
          tipologia_servicio: string | null
          umbral_agregado: number | null
          unidad: string
          updated_at: string
          ventana_garantia_dias: number | null
          ventana_medicion: string
          vigencia_desde: string | null
          vigencia_hasta: string | null
        }
        Insert: {
          bonus?: Json | null
          business_line: string
          calendario?: string
          cliente: string
          cliente_wg_patron?: string | null
          condicion_aplicacion?: string | null
          created_at?: string
          estado_regla?: string
          evento_fin: string
          evento_inicio: string
          exposicion_estado?: string
          fase?: string | null
          fuente_contractual?: string | null
          gama_familia?: string | null
          hard_limit?: number | null
          id?: string
          imputabilidad?: string
          kpi: string
          meses_consecutivos?: number | null
          notas?: string | null
          pausas_exclusiones?: string[]
          penalizacion?: Json | null
          programa: string
          regla_medicion: string
          sociedad_wg_ejecutora?: string | null
          target?: number | null
          tipo_consecuencia?: string
          tipo_target: string
          tipologia_servicio?: string | null
          umbral_agregado?: number | null
          unidad: string
          updated_at?: string
          ventana_garantia_dias?: number | null
          ventana_medicion?: string
          vigencia_desde?: string | null
          vigencia_hasta?: string | null
        }
        Update: {
          bonus?: Json | null
          business_line?: string
          calendario?: string
          cliente?: string
          cliente_wg_patron?: string | null
          condicion_aplicacion?: string | null
          created_at?: string
          estado_regla?: string
          evento_fin?: string
          evento_inicio?: string
          exposicion_estado?: string
          fase?: string | null
          fuente_contractual?: string | null
          gama_familia?: string | null
          hard_limit?: number | null
          id?: string
          imputabilidad?: string
          kpi?: string
          meses_consecutivos?: number | null
          notas?: string | null
          pausas_exclusiones?: string[]
          penalizacion?: Json | null
          programa?: string
          regla_medicion?: string
          sociedad_wg_ejecutora?: string | null
          target?: number | null
          tipo_consecuencia?: string
          tipo_target?: string
          tipologia_servicio?: string | null
          umbral_agregado?: number | null
          unidad?: string
          updated_at?: string
          ventana_garantia_dias?: number | null
          ventana_medicion?: string
          vigencia_desde?: string | null
          vigencia_hasta?: string | null
        }
        Relationships: []
      }
      ops_tecnicos: {
        Row: {
          activo: boolean
          created_at: string
          delegacion: string | null
          gama_principal: string | null
          id: string
          motivo_inactivo: string | null
          tecnico: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          delegacion?: string | null
          gama_principal?: string | null
          id?: string
          motivo_inactivo?: string | null
          tecnico: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          delegacion?: string | null
          gama_principal?: string | null
          id?: string
          motivo_inactivo?: string | null
          tecnico?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      wg_collaborator_sales: {
        Row: {
          amount_margin: number
          created_at: string
          id: string
          incidence_id: string | null
          kind: string
          reference: string | null
          units: number
          user_id: string
        }
        Insert: {
          amount_margin?: number
          created_at?: string
          id?: string
          incidence_id?: string | null
          kind: string
          reference?: string | null
          units?: number
          user_id: string
        }
        Update: {
          amount_margin?: number
          created_at?: string
          id?: string
          incidence_id?: string | null
          kind?: string
          reference?: string | null
          units?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wg_collaborator_sales_incidence_id_fkey"
            columns: ["incidence_id"]
            isOneToOne: false
            referencedRelation: "wg_incidences"
            referencedColumns: ["id"]
          },
        ]
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
      wg_network_leads: {
        Row: {
          breakdown: Json | null
          caja_liberada: number | null
          cp: string | null
          created_at: string
          email: string
          empresa: string | null
          gama: string | null
          id: string
          impacto_total: number | null
          intervenciones_mes: number | null
          multiplicador: number | null
          nombre: string | null
          source: string | null
          telefono: string | null
          ticket_medio: number | null
          user_agent: string | null
        }
        Insert: {
          breakdown?: Json | null
          caja_liberada?: number | null
          cp?: string | null
          created_at?: string
          email: string
          empresa?: string | null
          gama?: string | null
          id?: string
          impacto_total?: number | null
          intervenciones_mes?: number | null
          multiplicador?: number | null
          nombre?: string | null
          source?: string | null
          telefono?: string | null
          ticket_medio?: number | null
          user_agent?: string | null
        }
        Update: {
          breakdown?: Json | null
          caja_liberada?: number | null
          cp?: string | null
          created_at?: string
          email?: string
          empresa?: string | null
          gama?: string | null
          id?: string
          impacto_total?: number | null
          intervenciones_mes?: number | null
          multiplicador?: number | null
          nombre?: string | null
          source?: string | null
          telefono?: string | null
          ticket_medio?: number | null
          user_agent?: string | null
        }
        Relationships: []
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
          agreement_hash: string | null
          agreement_read_at: string | null
          agreement_version: string | null
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
          agreement_hash?: string | null
          agreement_read_at?: string | null
          agreement_version?: string | null
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
          agreement_hash?: string | null
          agreement_read_at?: string | null
          agreement_version?: string | null
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
      is_management: { Args: { _user_id?: string }; Returns: boolean }
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
      ops_alertas: {
        Args: {
          p_canal?: string
          p_cliente?: string
          p_delegacion?: string
          p_familia?: string
          p_from?: string
          p_gama?: string
          p_marca?: string
          p_provincia?: string
          p_sat?: string
          p_tecnico?: string
          p_to?: string
        }
        Returns: Json
      }
      ops_clasifica_gama: {
        Args: {
          p_cliente: string
          p_familia: string
          p_gama_origen: string
          p_marca: string
        }
        Returns: string
      }
      ops_cobertura_datos: { Args: never; Returns: Json }
      ops_costes: { Args: { p_from?: string; p_to?: string }; Returns: Json }
      ops_costes_entidades: {
        Args: { p_from?: string; p_to?: string; p_vista?: string }
        Returns: {
          bajas: number
          cerradas: number
          cerradas_con_ingreso: number
          contribucion_parcial: number
          coste_desplazamiento: number
          coste_directo: number
          coste_sat: number
          entidad: string
          eur_cierre: number
          ingreso_cli: number
          pct_bajas: number
          pct_sla20: number
          tipo_coste: string
        }[]
      }
      ops_data_quality: { Args: never; Returns: Json }
      ops_delegacion_ficha: {
        Args: { p_delegacion: string; p_from?: string; p_to?: string }
        Returns: Json
      }
      ops_delegaciones: {
        Args: {
          p_cliente?: string
          p_familia?: string
          p_from?: string
          p_gama?: string
          p_to?: string
        }
        Returns: Json
      }
      ops_dispersion: {
        Args: {
          p_delegacion?: string
          p_familia?: string
          p_from?: string
          p_gama?: string
          p_to?: string
        }
        Returns: Json
      }
      ops_equipos: {
        Args: {
          p_cliente?: string
          p_familia?: string
          p_from?: string
          p_to?: string
        }
        Returns: {
          abiertas: number
          abiertas_30: number
          ambito: string
          cerradas: number
          coste_medio: number
          despl_medio: number
          dias_medio: number
          equipo: string
          gama_atendida: string
          nombre_display: string
          pct_bajas: number
          pct_bajas_esp: number
          pct_nff: number
          pct_nff_esp: number
          pct_sla20: number
          tecnicos_activos: number
          tipo_entidad: string
        }[]
      }
      ops_evolucion: {
        Args: {
          p_canal?: string
          p_cliente?: string
          p_delegacion?: string
          p_familia?: string
          p_gama?: string
          p_marca?: string
          p_provincia?: string
          p_sat?: string
          p_tecnico?: string
        }
        Returns: {
          cerradas: number
          creadas: number
          mes: string
          pct_bajas: number
          pct_sla20: number
        }[]
      }
      ops_filter_options: {
        Args: {
          p_canal?: string
          p_cliente?: string
          p_delegacion?: string
          p_familia?: string
          p_gama?: string
          p_marca?: string
          p_provincia?: string
          p_sat?: string
          p_tecnico?: string
        }
        Returns: Json
      }
      ops_kpis: {
        Args: {
          p_canal?: string
          p_cliente?: string
          p_delegacion?: string
          p_familia?: string
          p_from?: string
          p_gama?: string
          p_marca?: string
          p_provincia?: string
          p_sat?: string
          p_tecnico?: string
          p_to?: string
        }
        Returns: Json
      }
      ops_panorama: {
        Args: {
          p_canal?: string
          p_cliente?: string
          p_delegacion?: string
          p_familia?: string
          p_from?: string
          p_gama?: string
          p_marca?: string
          p_meses?: number
          p_provincia?: string
          p_sat?: string
          p_tecnico?: string
          p_to?: string
        }
        Returns: Json
      }
      ops_sats_ranking: {
        Args: {
          p_cliente?: string
          p_familia?: string
          p_from?: string
          p_gama?: string
          p_provincia?: string
          p_to?: string
        }
        Returns: {
          abiertas: number
          cerradas: number
          coste_medio: number
          dias_medio: number
          pct_bajas: number
          pct_nff: number
          pct_sla20: number
          sat: string
        }[]
      }
      ops_sla: {
        Args: {
          p_canal?: string
          p_cliente?: string
          p_delegacion?: string
          p_familia?: string
          p_from?: string
          p_gama?: string
          p_marca?: string
          p_provincia?: string
          p_sat?: string
          p_tecnico?: string
          p_to?: string
        }
        Returns: Json
      }
      ops_sla_registry_resumen: {
        Args: never
        Returns: {
          business_line: string
          cliente: string
          estado_regla: string
          programa: string
          reglas: number
        }[]
      }
      ops_tecnico_ficha: { Args: { p_tecnico: string }; Returns: Json }
      ops_tecnicos_scorecard: {
        Args: {
          p_canal?: string
          p_cliente?: string
          p_delegacion?: string
          p_familia?: string
          p_from?: string
          p_gama?: string
          p_marca?: string
          p_provincia?: string
          p_sat?: string
          p_to?: string
        }
        Returns: {
          abiertas_30: number
          abiertas_total: number
          activo: boolean
          cerradas: number
          cerradas_prev: number
          delegacion: string
          delta_pct: number
          dias_medio: number
          gama_principal: string
          grupo: string
          mix_top: string
          motivo_inactivo: string
          pct_bajas: number
          pct_bajas_esp: number
          pct_nff: number
          pct_nff_esp: number
          pct_sla20: number
          score: number
          tecnico: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "client" | "management"
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
      app_role: ["admin", "user", "client", "management"],
    },
  },
} as const
