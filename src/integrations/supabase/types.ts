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
      ctr_actividad: {
        Row: {
          carga_id: string | null
          codigo: string
          comparable: boolean
          creado_en: string
          id: string
          nombre: string
          version: number
        }
        Insert: {
          carga_id?: string | null
          codigo: string
          comparable?: boolean
          creado_en?: string
          id?: string
          nombre: string
          version?: number
        }
        Update: {
          carga_id?: string | null
          codigo?: string
          comparable?: boolean
          creado_en?: string
          id?: string
          nombre?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ctr_actividad_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
        ]
      }
      ctr_acto_gobierno: {
        Row: {
          accion: string
          actor_id: string
          actor_nombre: string
          actor_rol: string
          carga_id: string | null
          creado_en: string
          cuatro_ojos_id: string | null
          cuatro_ojos_nombre: string | null
          cuatro_ojos_rol: string | null
          estado_anterior: string | null
          estado_nuevo: string | null
          evidencia_revisada: string
          fuente_procedencia: string | null
          id: string
          motivo: string
          objeto_id: string | null
          objeto_tipo: string
          solicitud_id: string | null
          ts: string
        }
        Insert: {
          accion: string
          actor_id: string
          actor_nombre: string
          actor_rol: string
          carga_id?: string | null
          creado_en?: string
          cuatro_ojos_id?: string | null
          cuatro_ojos_nombre?: string | null
          cuatro_ojos_rol?: string | null
          estado_anterior?: string | null
          estado_nuevo?: string | null
          evidencia_revisada: string
          fuente_procedencia?: string | null
          id?: string
          motivo: string
          objeto_id?: string | null
          objeto_tipo: string
          solicitud_id?: string | null
          ts?: string
        }
        Update: {
          accion?: string
          actor_id?: string
          actor_nombre?: string
          actor_rol?: string
          carga_id?: string | null
          creado_en?: string
          cuatro_ojos_id?: string | null
          cuatro_ojos_nombre?: string | null
          cuatro_ojos_rol?: string | null
          estado_anterior?: string | null
          estado_nuevo?: string | null
          evidencia_revisada?: string
          fuente_procedencia?: string | null
          id?: string
          motivo?: string
          objeto_id?: string | null
          objeto_tipo?: string
          solicitud_id?: string | null
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "ctr_acto_gobierno_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
        ]
      }
      ctr_alias_identidad: {
        Row: {
          carga_id: string | null
          cliente_id: string
          creado_en: string
          effective_from: string
          effective_to: string | null
          gobernado: boolean
          id: string
          metodo: string
          programa_id: string | null
          sistema_origen: string
          valor_origen: string
        }
        Insert: {
          carga_id?: string | null
          cliente_id: string
          creado_en?: string
          effective_from: string
          effective_to?: string | null
          gobernado?: boolean
          id?: string
          metodo: string
          programa_id?: string | null
          sistema_origen: string
          valor_origen: string
        }
        Update: {
          carga_id?: string | null
          cliente_id?: string
          creado_en?: string
          effective_from?: string
          effective_to?: string | null
          gobernado?: boolean
          id?: string
          metodo?: string
          programa_id?: string | null
          sistema_origen?: string
          valor_origen?: string
        }
        Relationships: [
          {
            foreignKeyName: "ctr_alias_identidad_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_alias_identidad_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "ctr_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_alias_identidad_programa_id_fkey"
            columns: ["programa_id"]
            isOneToOne: false
            referencedRelation: "ctr_programa"
            referencedColumns: ["id"]
          },
        ]
      }
      ctr_alias_set_item: {
        Row: {
          carga_id: string | null
          cliente_id: string
          creado_en: string
          gobernado: boolean
          id: string
          programa_id: string | null
          sistema_origen: string
          valor_origen: string
          version_id: string
        }
        Insert: {
          carga_id?: string | null
          cliente_id: string
          creado_en?: string
          gobernado?: boolean
          id?: string
          programa_id?: string | null
          sistema_origen: string
          valor_origen: string
          version_id: string
        }
        Update: {
          carga_id?: string | null
          cliente_id?: string
          creado_en?: string
          gobernado?: boolean
          id?: string
          programa_id?: string | null
          sistema_origen?: string
          valor_origen?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ctr_alias_set_item_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_alias_set_item_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "ctr_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_alias_set_item_programa_id_fkey"
            columns: ["programa_id"]
            isOneToOne: false
            referencedRelation: "ctr_programa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_alias_set_item_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "ctr_alias_set_version"
            referencedColumns: ["id"]
          },
        ]
      }
      ctr_alias_set_version: {
        Row: {
          carga_id: string | null
          creado_en: string
          hash_contenido: string
          id: string
        }
        Insert: {
          carga_id?: string | null
          creado_en?: string
          hash_contenido: string
          id?: string
        }
        Update: {
          carga_id?: string | null
          creado_en?: string
          hash_contenido?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ctr_alias_set_version_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
        ]
      }
      ctr_business_line: {
        Row: {
          carga_id: string | null
          codigo: string
          creado_en: string
          id: string
          nombre: string
        }
        Insert: {
          carga_id?: string | null
          codigo: string
          creado_en?: string
          id?: string
          nombre: string
        }
        Update: {
          carga_id?: string | null
          codigo?: string
          creado_en?: string
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "ctr_business_line_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
        ]
      }
      ctr_carga: {
        Row: {
          artefacto_ref: string | null
          carga_id: string | null
          creado_en: string
          estado: string
          hash: string | null
          id: string
          loaded_at: string
          loaded_by_id: string | null
          loaded_by_nombre: string
          notas: string | null
          origen: string
          plantilla_version: string | null
        }
        Insert: {
          artefacto_ref?: string | null
          carga_id?: string | null
          creado_en?: string
          estado: string
          hash?: string | null
          id?: string
          loaded_at?: string
          loaded_by_id?: string | null
          loaded_by_nombre: string
          notas?: string | null
          origen: string
          plantilla_version?: string | null
        }
        Update: {
          artefacto_ref?: string | null
          carga_id?: string | null
          creado_en?: string
          estado?: string
          hash?: string | null
          id?: string
          loaded_at?: string
          loaded_by_id?: string | null
          loaded_by_nombre?: string
          notas?: string | null
          origen?: string
          plantilla_version?: string | null
        }
        Relationships: []
      }
      ctr_censo_programas_item: {
        Row: {
          carga_id: string | null
          cliente_id: string
          creado_en: string
          effective_from: string | null
          effective_to: string | null
          estado: string
          id: string
          programa_id: string
          version_id: string
        }
        Insert: {
          carga_id?: string | null
          cliente_id: string
          creado_en?: string
          effective_from?: string | null
          effective_to?: string | null
          estado: string
          id?: string
          programa_id: string
          version_id: string
        }
        Update: {
          carga_id?: string | null
          cliente_id?: string
          creado_en?: string
          effective_from?: string | null
          effective_to?: string | null
          estado?: string
          id?: string
          programa_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ctr_censo_programas_item_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_censo_programas_item_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "ctr_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_censo_programas_item_programa_id_fkey"
            columns: ["programa_id"]
            isOneToOne: false
            referencedRelation: "ctr_programa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_censo_programas_item_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "ctr_censo_programas_version"
            referencedColumns: ["id"]
          },
        ]
      }
      ctr_censo_programas_version: {
        Row: {
          carga_id: string | null
          creado_en: string
          hash_contenido: string
          id: string
        }
        Insert: {
          carga_id?: string | null
          creado_en?: string
          hash_contenido: string
          id?: string
        }
        Update: {
          carga_id?: string | null
          creado_en?: string
          hash_contenido?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ctr_censo_programas_version_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
        ]
      }
      ctr_cliente: {
        Row: {
          carga_id: string | null
          creado_en: string
          estado: string
          grupo_cliente: string | null
          id: string
          nombre_display: string
        }
        Insert: {
          carga_id?: string | null
          creado_en?: string
          estado: string
          grupo_cliente?: string | null
          id?: string
          nombre_display: string
        }
        Update: {
          carga_id?: string | null
          creado_en?: string
          estado?: string
          grupo_cliente?: string | null
          id?: string
          nombre_display?: string
        }
        Relationships: [
          {
            foreignKeyName: "ctr_cliente_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
        ]
      }
      ctr_contraparte_legal: {
        Row: {
          carga_id: string | null
          creado_en: string
          grupo_legal: string | null
          id: string
          nif_vat: string | null
          notas: string | null
          pais: string | null
          razon_social: string
        }
        Insert: {
          carga_id?: string | null
          creado_en?: string
          grupo_legal?: string | null
          id?: string
          nif_vat?: string | null
          notas?: string | null
          pais?: string | null
          razon_social: string
        }
        Update: {
          carga_id?: string | null
          creado_en?: string
          grupo_legal?: string | null
          id?: string
          nif_vat?: string | null
          notas?: string | null
          pais?: string | null
          razon_social?: string
        }
        Relationships: [
          {
            foreignKeyName: "ctr_contraparte_legal_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
        ]
      }
      ctr_contrato: {
        Row: {
          carga_id: string | null
          contraparte_id: string
          creado_en: string
          effective_from: string
          effective_to: string | null
          estado_evidencia: string
          fecha_firma: string | null
          id: string
          notas: string | null
          preaviso: string | null
          renovacion: string | null
          sociedad_wg_id: string | null
          tipo_instrumento: string
          titulo: string
        }
        Insert: {
          carga_id?: string | null
          contraparte_id: string
          creado_en?: string
          effective_from: string
          effective_to?: string | null
          estado_evidencia: string
          fecha_firma?: string | null
          id?: string
          notas?: string | null
          preaviso?: string | null
          renovacion?: string | null
          sociedad_wg_id?: string | null
          tipo_instrumento: string
          titulo: string
        }
        Update: {
          carga_id?: string | null
          contraparte_id?: string
          creado_en?: string
          effective_from?: string
          effective_to?: string | null
          estado_evidencia?: string
          fecha_firma?: string | null
          id?: string
          notas?: string | null
          preaviso?: string | null
          renovacion?: string | null
          sociedad_wg_id?: string | null
          tipo_instrumento?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ctr_contrato_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_contrato_contraparte_id_fkey"
            columns: ["contraparte_id"]
            isOneToOne: false
            referencedRelation: "ctr_contraparte_legal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_contrato_sociedad_wg_id_fkey"
            columns: ["sociedad_wg_id"]
            isOneToOne: false
            referencedRelation: "ctr_sociedad_wg"
            referencedColumns: ["id"]
          },
        ]
      }
      ctr_contrato_alcance: {
        Row: {
          alcance_nota: string | null
          carga_id: string | null
          contrato_id: string
          creado_en: string
          doc_id: string
          effective_from: string | null
          effective_to: string | null
          estado_ejecucion: string
          id: string
          programa_id: string
        }
        Insert: {
          alcance_nota?: string | null
          carga_id?: string | null
          contrato_id: string
          creado_en?: string
          doc_id: string
          effective_from?: string | null
          effective_to?: string | null
          estado_ejecucion?: string
          id?: string
          programa_id: string
        }
        Update: {
          alcance_nota?: string | null
          carga_id?: string | null
          contrato_id?: string
          creado_en?: string
          doc_id?: string
          effective_from?: string | null
          effective_to?: string | null
          estado_ejecucion?: string
          id?: string
          programa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ctr_contrato_alcance_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_contrato_alcance_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "ctr_contrato"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_contrato_alcance_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "ctr_documento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_contrato_alcance_programa_id_fkey"
            columns: ["programa_id"]
            isOneToOne: false
            referencedRelation: "ctr_programa"
            referencedColumns: ["id"]
          },
        ]
      }
      ctr_contrato_relacion: {
        Row: {
          carga_id: string | null
          creado_en: string
          destino_id: string
          doc_id: string
          evidencia_sustitucion: string | null
          id: string
          origen_id: string
          tipo: string
        }
        Insert: {
          carga_id?: string | null
          creado_en?: string
          destino_id: string
          doc_id: string
          evidencia_sustitucion?: string | null
          id?: string
          origen_id: string
          tipo: string
        }
        Update: {
          carga_id?: string | null
          creado_en?: string
          destino_id?: string
          doc_id?: string
          evidencia_sustitucion?: string | null
          id?: string
          origen_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ctr_contrato_relacion_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_contrato_relacion_destino_id_fkey"
            columns: ["destino_id"]
            isOneToOne: false
            referencedRelation: "ctr_contrato"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_contrato_relacion_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "ctr_documento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_contrato_relacion_origen_id_fkey"
            columns: ["origen_id"]
            isOneToOne: false
            referencedRelation: "ctr_contrato"
            referencedColumns: ["id"]
          },
        ]
      }
      ctr_documento: {
        Row: {
          carga_id: string | null
          creado_en: string
          estado_evidencia: string
          fecha_documento: string | null
          fichero: string
          firma_ref: string | null
          firmado_verificado: string
          hash: string
          id: string
          idioma: string | null
          metodo_firma: string | null
          notas: string | null
          ocr_estado: string
          paginas: number | null
          tipo_documental: string
        }
        Insert: {
          carga_id?: string | null
          creado_en?: string
          estado_evidencia: string
          fecha_documento?: string | null
          fichero: string
          firma_ref?: string | null
          firmado_verificado: string
          hash: string
          id?: string
          idioma?: string | null
          metodo_firma?: string | null
          notas?: string | null
          ocr_estado: string
          paginas?: number | null
          tipo_documental: string
        }
        Update: {
          carga_id?: string | null
          creado_en?: string
          estado_evidencia?: string
          fecha_documento?: string | null
          fichero?: string
          firma_ref?: string | null
          firmado_verificado?: string
          hash?: string
          id?: string
          idioma?: string | null
          metodo_firma?: string | null
          notas?: string | null
          ocr_estado?: string
          paginas?: number | null
          tipo_documental?: string
        }
        Relationships: [
          {
            foreignKeyName: "ctr_documento_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
        ]
      }
      ctr_instrumento_documento: {
        Row: {
          carga_id: string | null
          contrato_id: string
          creado_en: string
          doc_id: string
          id: string
          nota: string | null
          tipo_relacion: string
        }
        Insert: {
          carga_id?: string | null
          contrato_id: string
          creado_en?: string
          doc_id: string
          id?: string
          nota?: string | null
          tipo_relacion: string
        }
        Update: {
          carga_id?: string | null
          contrato_id?: string
          creado_en?: string
          doc_id?: string
          id?: string
          nota?: string | null
          tipo_relacion?: string
        }
        Relationships: [
          {
            foreignKeyName: "ctr_instrumento_documento_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_instrumento_documento_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "ctr_contrato"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_instrumento_documento_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "ctr_documento"
            referencedColumns: ["id"]
          },
        ]
      }
      ctr_programa: {
        Row: {
          beneficiario_canal: string | null
          business_line_id: string | null
          carga_id: string | null
          cliente_id: string
          creado_en: string
          effective_from: string
          effective_to: string | null
          estado: string
          id: string
          nombre: string
          notas: string | null
          territorio: string[]
          vertical_id: string | null
        }
        Insert: {
          beneficiario_canal?: string | null
          business_line_id?: string | null
          carga_id?: string | null
          cliente_id: string
          creado_en?: string
          effective_from: string
          effective_to?: string | null
          estado: string
          id?: string
          nombre: string
          notas?: string | null
          territorio: string[]
          vertical_id?: string | null
        }
        Update: {
          beneficiario_canal?: string | null
          business_line_id?: string | null
          carga_id?: string | null
          cliente_id?: string
          creado_en?: string
          effective_from?: string
          effective_to?: string | null
          estado?: string
          id?: string
          nombre?: string
          notas?: string | null
          territorio?: string[]
          vertical_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ctr_programa_business_line_id_fkey"
            columns: ["business_line_id"]
            isOneToOne: false
            referencedRelation: "ctr_business_line"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_programa_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_programa_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "ctr_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_programa_vertical_id_fkey"
            columns: ["vertical_id"]
            isOneToOne: false
            referencedRelation: "ctr_vertical"
            referencedColumns: ["id"]
          },
        ]
      }
      ctr_programa_parte: {
        Row: {
          carga_id: string | null
          creado_en: string
          doc_id: string | null
          effective_from: string | null
          effective_to: string | null
          entidad_id: string | null
          entidad_nombre: string
          estado_evidencia: string
          id: string
          notas: string | null
          origen_conocimiento: string
          programa_id: string
          rol: string
          tipo_entidad: string
        }
        Insert: {
          carga_id?: string | null
          creado_en?: string
          doc_id?: string | null
          effective_from?: string | null
          effective_to?: string | null
          entidad_id?: string | null
          entidad_nombre: string
          estado_evidencia: string
          id?: string
          notas?: string | null
          origen_conocimiento: string
          programa_id: string
          rol: string
          tipo_entidad: string
        }
        Update: {
          carga_id?: string | null
          creado_en?: string
          doc_id?: string | null
          effective_from?: string | null
          effective_to?: string | null
          entidad_id?: string | null
          entidad_nombre?: string
          estado_evidencia?: string
          id?: string
          notas?: string | null
          origen_conocimiento?: string
          programa_id?: string
          rol?: string
          tipo_entidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "ctr_programa_parte_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_programa_parte_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "ctr_documento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_programa_parte_programa_id_fkey"
            columns: ["programa_id"]
            isOneToOne: false
            referencedRelation: "ctr_programa"
            referencedColumns: ["id"]
          },
        ]
      }
      ctr_programa_servicio: {
        Row: {
          actividad_id: string
          carga_id: string | null
          condiciones: string | null
          creado_en: string
          doc_id: string | null
          id: string
          programa_id: string
        }
        Insert: {
          actividad_id: string
          carga_id?: string | null
          condiciones?: string | null
          creado_en?: string
          doc_id?: string | null
          id?: string
          programa_id: string
        }
        Update: {
          actividad_id?: string
          carga_id?: string | null
          condiciones?: string | null
          creado_en?: string
          doc_id?: string | null
          id?: string
          programa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ctr_programa_servicio_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "ctr_actividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_programa_servicio_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_programa_servicio_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "ctr_documento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_programa_servicio_programa_id_fkey"
            columns: ["programa_id"]
            isOneToOne: false
            referencedRelation: "ctr_programa"
            referencedColumns: ["id"]
          },
        ]
      }
      ctr_resolucion_contexto: {
        Row: {
          algoritmo_version: string
          alias_set_version: string
          carga_id: string | null
          censo_version: string
          creado_en: string
          id: string
          mapa_contractual_version: string | null
        }
        Insert: {
          algoritmo_version: string
          alias_set_version: string
          carga_id?: string | null
          censo_version: string
          creado_en?: string
          id?: string
          mapa_contractual_version?: string | null
        }
        Update: {
          algoritmo_version?: string
          alias_set_version?: string
          carga_id?: string | null
          censo_version?: string
          creado_en?: string
          id?: string
          mapa_contractual_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ctr_resolucion_contexto_alias_set_version_fkey"
            columns: ["alias_set_version"]
            isOneToOne: false
            referencedRelation: "ctr_alias_set_version"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_resolucion_contexto_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_resolucion_contexto_censo_version_fkey"
            columns: ["censo_version"]
            isOneToOne: false
            referencedRelation: "ctr_censo_programas_version"
            referencedColumns: ["id"]
          },
        ]
      }
      ctr_resolucion_ot_programa: {
        Row: {
          acto_gobierno_id: string | null
          carga_id: string | null
          cliente_wg_origen: string | null
          creado_en: string
          fingerprint: string
          id: string
          identidad_contractual: string
          inputs: Json
          mapping_version: string | null
          metodo: string | null
          num_ot: string
          override_actor_id: string | null
          override_motivo: string | null
          programa_id: string | null
          resolution_context_id: string
          resolved_at: string
          resultado: string
          supersede_de_id: string | null
          superseded_at: string | null
          superseded_by_id: string | null
          vigente: boolean
        }
        Insert: {
          acto_gobierno_id?: string | null
          carga_id?: string | null
          cliente_wg_origen?: string | null
          creado_en?: string
          fingerprint: string
          id?: string
          identidad_contractual?: string
          inputs: Json
          mapping_version?: string | null
          metodo?: string | null
          num_ot: string
          override_actor_id?: string | null
          override_motivo?: string | null
          programa_id?: string | null
          resolution_context_id: string
          resolved_at?: string
          resultado: string
          supersede_de_id?: string | null
          superseded_at?: string | null
          superseded_by_id?: string | null
          vigente?: boolean
        }
        Update: {
          acto_gobierno_id?: string | null
          carga_id?: string | null
          cliente_wg_origen?: string | null
          creado_en?: string
          fingerprint?: string
          id?: string
          identidad_contractual?: string
          inputs?: Json
          mapping_version?: string | null
          metodo?: string | null
          num_ot?: string
          override_actor_id?: string | null
          override_motivo?: string | null
          programa_id?: string | null
          resolution_context_id?: string
          resolved_at?: string
          resultado?: string
          supersede_de_id?: string | null
          superseded_at?: string | null
          superseded_by_id?: string | null
          vigente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ctr_resolucion_ot_programa_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_resolucion_ot_programa_programa_id_fkey"
            columns: ["programa_id"]
            isOneToOne: false
            referencedRelation: "ctr_programa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_resolucion_ot_programa_resolution_context_id_fkey"
            columns: ["resolution_context_id"]
            isOneToOne: false
            referencedRelation: "ctr_resolucion_contexto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_resolucion_ot_programa_supersede_de_id_fkey"
            columns: ["supersede_de_id"]
            isOneToOne: false
            referencedRelation: "ctr_resolucion_ot_programa"
            referencedColumns: ["id"]
          },
        ]
      }
      ctr_row_audit: {
        Row: {
          actor_id: string | null
          actor_nombre: string | null
          campo: string
          carga_id: string | null
          creado_en: string
          fila_id: string | null
          id: string
          tabla: string
          ts: string
          valor_new: string | null
          valor_old: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_nombre?: string | null
          campo: string
          carga_id?: string | null
          creado_en?: string
          fila_id?: string | null
          id?: string
          tabla: string
          ts?: string
          valor_new?: string | null
          valor_old?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_nombre?: string | null
          campo?: string
          carga_id?: string | null
          creado_en?: string
          fila_id?: string | null
          id?: string
          tabla?: string
          ts?: string
          valor_new?: string | null
          valor_old?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ctr_row_audit_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
        ]
      }
      ctr_sociedad_wg: {
        Row: {
          carga_id: string | null
          creado_en: string
          id: string
          nif: string | null
          notas: string | null
          razon_social: string
        }
        Insert: {
          carga_id?: string | null
          creado_en?: string
          id?: string
          nif?: string | null
          notas?: string | null
          razon_social: string
        }
        Update: {
          carga_id?: string | null
          creado_en?: string
          id?: string
          nif?: string | null
          notas?: string | null
          razon_social?: string
        }
        Relationships: [
          {
            foreignKeyName: "ctr_sociedad_wg_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
        ]
      }
      ctr_solicitud_promocion: {
        Row: {
          carga_id: string | null
          creado_en: string
          estado: string
          estado_esperado: string
          estado_objetivo: string
          evidencia_hash: string | null
          evidencia_ref: string
          id: string
          objeto_id: string
          objeto_tipo: string
          propuesto_en: string
          propuesto_por_id: string
          propuesto_por_nombre: string | null
          propuesto_por_rol: string | null
        }
        Insert: {
          carga_id?: string | null
          creado_en?: string
          estado?: string
          estado_esperado: string
          estado_objetivo: string
          evidencia_hash?: string | null
          evidencia_ref: string
          id?: string
          objeto_id: string
          objeto_tipo: string
          propuesto_en?: string
          propuesto_por_id: string
          propuesto_por_nombre?: string | null
          propuesto_por_rol?: string | null
        }
        Update: {
          carga_id?: string | null
          creado_en?: string
          estado?: string
          estado_esperado?: string
          estado_objetivo?: string
          evidencia_hash?: string | null
          evidencia_ref?: string
          id?: string
          objeto_id?: string
          objeto_tipo?: string
          propuesto_en?: string
          propuesto_por_id?: string
          propuesto_por_nombre?: string | null
          propuesto_por_rol?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ctr_solicitud_promocion_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
        ]
      }
      ctr_territorio: {
        Row: {
          carga_id: string | null
          codigo: string
          creado_en: string
          id: string
          nivel: string
          nombre: string
          padre_id: string | null
        }
        Insert: {
          carga_id?: string | null
          codigo: string
          creado_en?: string
          id?: string
          nivel: string
          nombre: string
          padre_id?: string | null
        }
        Update: {
          carga_id?: string | null
          codigo?: string
          creado_en?: string
          id?: string
          nivel?: string
          nombre?: string
          padre_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ctr_territorio_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ctr_territorio_padre_id_fkey"
            columns: ["padre_id"]
            isOneToOne: false
            referencedRelation: "ctr_territorio"
            referencedColumns: ["id"]
          },
        ]
      }
      ctr_vertical: {
        Row: {
          carga_id: string | null
          codigo: string
          creado_en: string
          id: string
          nombre: string
        }
        Insert: {
          carga_id?: string | null
          codigo: string
          creado_en?: string
          id?: string
          nombre: string
        }
        Update: {
          carga_id?: string | null
          codigo?: string
          creado_en?: string
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "ctr_vertical_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "ctr_carga"
            referencedColumns: ["id"]
          },
        ]
      }
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
      ops_calendario_laboral: {
        Row: {
          ambito: string
          created_at: string
          descripcion: string | null
          fecha: string
          fuente: string | null
          id: string
          territorio: string
          vigencia_desde: string | null
          vigencia_hasta: string | null
        }
        Insert: {
          ambito: string
          created_at?: string
          descripcion?: string | null
          fecha: string
          fuente?: string | null
          id?: string
          territorio: string
          vigencia_desde?: string | null
          vigencia_hasta?: string | null
        }
        Update: {
          ambito?: string
          created_at?: string
          descripcion?: string | null
          fecha?: string
          fuente?: string | null
          id?: string
          territorio?: string
          vigencia_desde?: string | null
          vigencia_hasta?: string | null
        }
        Relationships: []
      }
      ops_carga_log: {
        Row: {
          created_at: string
          data_as_of_date: string | null
          dominio: string
          filas: number | null
          fuente: string | null
          id: string
          last_successful_load: string | null
          notas: string | null
          origen: string
        }
        Insert: {
          created_at?: string
          data_as_of_date?: string | null
          dominio: string
          filas?: number | null
          fuente?: string | null
          id?: string
          last_successful_load?: string | null
          notas?: string | null
          origen?: string
        }
        Update: {
          created_at?: string
          data_as_of_date?: string | null
          dominio?: string
          filas?: number | null
          fuente?: string | null
          id?: string
          last_successful_load?: string | null
          notas?: string | null
          origen?: string
        }
        Relationships: []
      }
      ops_cliente_contrato_alias: {
        Row: {
          cliente_contractual: string
          cliente_wg_real: string
          created_at: string
          id: string
          notas: string | null
          origen: string
          programa: string | null
          vigencia_desde: string | null
          vigencia_hasta: string | null
        }
        Insert: {
          cliente_contractual: string
          cliente_wg_real: string
          created_at?: string
          id?: string
          notas?: string | null
          origen?: string
          programa?: string | null
          vigencia_desde?: string | null
          vigencia_hasta?: string | null
        }
        Update: {
          cliente_contractual?: string
          cliente_wg_real?: string
          created_at?: string
          id?: string
          notas?: string | null
          origen?: string
          programa?: string | null
          vigencia_desde?: string | null
          vigencia_hasta?: string | null
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
      ops_expedicion: {
        Row: {
          almacen_base: string
          coste_envio: number | null
          coste_transporte: number | null
          created_at: string
          destino: string | null
          destino_cp: string | null
          destino_tipo: string | null
          equipo: string | null
          estado_expedicion: string
          expedicion_id: string
          expedicion_origen_id: string | null
          expedicion_timestamp: string | null
          fecha_entrega_prevista: string | null
          fecha_entrega_real: string | null
          fecha_expedicion: string | null
          id: string
          incidencia: string | null
          num_lineas: number | null
          num_ot: string | null
          num_ot_abastecidas: number | null
          num_unidades: number | null
          origen: string | null
          origen_dato: string
          persona_id: string | null
          picking_fin: string | null
          picking_inicio: string | null
          preparado_por: string | null
          procedencia_conteo: string
          reexpedicion: boolean
          referencia_expedicion: string
          tipo_incidencia: string | null
          transportista: string | null
          updated_at: string
        }
        Insert: {
          almacen_base?: string
          coste_envio?: number | null
          coste_transporte?: number | null
          created_at?: string
          destino?: string | null
          destino_cp?: string | null
          destino_tipo?: string | null
          equipo?: string | null
          estado_expedicion?: string
          expedicion_id: string
          expedicion_origen_id?: string | null
          expedicion_timestamp?: string | null
          fecha_entrega_prevista?: string | null
          fecha_entrega_real?: string | null
          fecha_expedicion?: string | null
          id?: string
          incidencia?: string | null
          num_lineas?: number | null
          num_ot?: string | null
          num_ot_abastecidas?: number | null
          num_unidades?: number | null
          origen?: string | null
          origen_dato?: string
          persona_id?: string | null
          picking_fin?: string | null
          picking_inicio?: string | null
          preparado_por?: string | null
          procedencia_conteo?: string
          reexpedicion?: boolean
          referencia_expedicion: string
          tipo_incidencia?: string | null
          transportista?: string | null
          updated_at?: string
        }
        Update: {
          almacen_base?: string
          coste_envio?: number | null
          coste_transporte?: number | null
          created_at?: string
          destino?: string | null
          destino_cp?: string | null
          destino_tipo?: string | null
          equipo?: string | null
          estado_expedicion?: string
          expedicion_id?: string
          expedicion_origen_id?: string | null
          expedicion_timestamp?: string | null
          fecha_entrega_prevista?: string | null
          fecha_entrega_real?: string | null
          fecha_expedicion?: string | null
          id?: string
          incidencia?: string | null
          num_lineas?: number | null
          num_ot?: string | null
          num_ot_abastecidas?: number | null
          num_unidades?: number | null
          origen?: string | null
          origen_dato?: string
          persona_id?: string | null
          picking_fin?: string | null
          picking_inicio?: string | null
          preparado_por?: string | null
          procedencia_conteo?: string
          reexpedicion?: boolean
          referencia_expedicion?: string
          tipo_incidencia?: string | null
          transportista?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ops_expedicion_linea: {
        Row: {
          almacen_base: string
          cantidad: number
          created_at: string
          descripcion: string | null
          expedicion_id: string
          id: string
          linea: number
          num_ot: string | null
          origen_dato: string
          pieza_solicitud_id: string | null
          referencia: string
        }
        Insert: {
          almacen_base?: string
          cantidad?: number
          created_at?: string
          descripcion?: string | null
          expedicion_id: string
          id?: string
          linea: number
          num_ot?: string | null
          origen_dato?: string
          pieza_solicitud_id?: string | null
          referencia: string
        }
        Update: {
          almacen_base?: string
          cantidad?: number
          created_at?: string
          descripcion?: string | null
          expedicion_id?: string
          id?: string
          linea?: number
          num_ot?: string | null
          origen_dato?: string
          pieza_solicitud_id?: string | null
          referencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "ops_expedicion_linea_fk"
            columns: ["almacen_base", "expedicion_id"]
            isOneToOne: false
            referencedRelation: "ops_expedicion"
            referencedColumns: ["almacen_base", "expedicion_id"]
          },
          {
            foreignKeyName: "ops_expedicion_linea_pieza_solicitud_id_fkey"
            columns: ["pieza_solicitud_id"]
            isOneToOne: false
            referencedRelation: "ops_pieza_solicitud"
            referencedColumns: ["id"]
          },
        ]
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
      ops_gate_log: {
        Row: {
          created_at: string
          ejecutado_en: string
          id: string
          ms_total: number | null
          notas: string | null
          rpcs_ok: number
          rpcs_total: number
        }
        Insert: {
          created_at?: string
          ejecutado_en?: string
          id?: string
          ms_total?: number | null
          notas?: string | null
          rpcs_ok?: number
          rpcs_total?: number
        }
        Update: {
          created_at?: string
          ejecutado_en?: string
          id?: string
          ms_total?: number | null
          notas?: string | null
          rpcs_ok?: number
          rpcs_total?: number
        }
        Relationships: []
      }
      ops_pieza_solicitud: {
        Row: {
          cantidad: number
          coste_unitario: number | null
          created_at: string
          descripcion: string | null
          estado_pieza: string
          fecha_disponibilidad: string | null
          fecha_entrega: string | null
          fecha_expedicion: string | null
          fecha_montaje: string | null
          fecha_necesidad: string | null
          fecha_picking: string | null
          fecha_solicitud: string | null
          id: string
          imputabilidad_retraso: string | null
          num_ot: string
          origen_dato: string
          proveedor: string | null
          referencia: string
          updated_at: string
        }
        Insert: {
          cantidad?: number
          coste_unitario?: number | null
          created_at?: string
          descripcion?: string | null
          estado_pieza?: string
          fecha_disponibilidad?: string | null
          fecha_entrega?: string | null
          fecha_expedicion?: string | null
          fecha_montaje?: string | null
          fecha_necesidad?: string | null
          fecha_picking?: string | null
          fecha_solicitud?: string | null
          id?: string
          imputabilidad_retraso?: string | null
          num_ot: string
          origen_dato?: string
          proveedor?: string | null
          referencia: string
          updated_at?: string
        }
        Update: {
          cantidad?: number
          coste_unitario?: number | null
          created_at?: string
          descripcion?: string | null
          estado_pieza?: string
          fecha_disponibilidad?: string | null
          fecha_entrega?: string | null
          fecha_expedicion?: string | null
          fecha_montaje?: string | null
          fecha_necesidad?: string | null
          fecha_picking?: string | null
          fecha_solicitud?: string | null
          id?: string
          imputabilidad_retraso?: string | null
          num_ot?: string
          origen_dato?: string
          proveedor?: string | null
          referencia?: string
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
      ops_rrhh_logistica: {
        Row: {
          almacen_base: string
          created_at: string
          equipo: string | null
          fecha: string
          id: string
          jornada_horas: number | null
          nombre: string | null
          origen_dato: string
          persona_id: string
          presente: boolean
          updated_at: string
        }
        Insert: {
          almacen_base: string
          created_at?: string
          equipo?: string | null
          fecha: string
          id?: string
          jornada_horas?: number | null
          nombre?: string | null
          origen_dato?: string
          persona_id: string
          presente?: boolean
          updated_at?: string
        }
        Update: {
          almacen_base?: string
          created_at?: string
          equipo?: string | null
          fecha?: string
          id?: string
          jornada_horas?: number | null
          nombre?: string | null
          origen_dato?: string
          persona_id?: string
          presente?: boolean
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
          estado_extraccion: string
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
          territorio_calendario: string | null
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
          estado_extraccion?: string
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
          territorio_calendario?: string | null
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
          estado_extraccion?: string
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
          territorio_calendario?: string | null
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
      ops_stock_snapshot: {
        Row: {
          almacen_base: string
          coste_medio: number | null
          created_at: string
          descripcion: string | null
          en_transito: number | null
          fecha_snapshot: string
          id: string
          origen_dato: string
          referencia: string
          reservado: number | null
          stock_disponible: number | null
          stock_fisico: number
        }
        Insert: {
          almacen_base: string
          coste_medio?: number | null
          created_at?: string
          descripcion?: string | null
          en_transito?: number | null
          fecha_snapshot: string
          id?: string
          origen_dato?: string
          referencia: string
          reservado?: number | null
          stock_disponible?: number | null
          stock_fisico?: number
        }
        Update: {
          almacen_base?: string
          coste_medio?: number | null
          created_at?: string
          descripcion?: string | null
          en_transito?: number | null
          fecha_snapshot?: string
          id?: string
          origen_dato?: string
          referencia?: string
          reservado?: number | null
          stock_disponible?: number | null
          stock_fisico?: number
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
      ops_data_freshness: {
        Row: {
          created_at: string | null
          data_as_of_date: string | null
          dominio: string | null
          filas: number | null
          fuente: string | null
          last_successful_load: string | null
          notas: string | null
          origen: string | null
        }
        Insert: {
          created_at?: string | null
          data_as_of_date?: string | null
          dominio?: string | null
          filas?: number | null
          fuente?: string | null
          last_successful_load?: string | null
          notas?: string | null
          origen?: string | null
        }
        Update: {
          created_at?: string | null
          data_as_of_date?: string | null
          dominio?: string | null
          filas?: number | null
          fuente?: string | null
          last_successful_load?: string | null
          notas?: string | null
          origen?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      ctr_acto_bootstrap: {
        Args: {
          p_actor_historico_nombre: string
          p_estado_nuevo: string
          p_evidencia: string
          p_fecha_decision: string
          p_fuente: string
          p_objeto_id: string
          p_objeto_tipo: string
        }
        Returns: string
      }
      ctr_actor_actual: { Args: never; Returns: Record<string, unknown> }
      ctr_aprobar_promocion: { Args: { p_solicitud: string }; Returns: string }
      ctr_promover_evidencia: {
        Args: {
          p_estado_esperado: string
          p_estado_nuevo: string
          p_evidencia: string
          p_motivo: string
          p_objeto_id: string
          p_objeto_tipo: string
        }
        Returns: string
      }
      ctr_proponer_promocion: {
        Args: {
          p_estado_esperado: string
          p_estado_objetivo: string
          p_evidencia_hash?: string
          p_evidencia_ref: string
          p_objeto_id: string
          p_objeto_tipo: string
        }
        Returns: string
      }
      ctr_rango_evidencia: { Args: { p_estado: string }; Returns: number }
      ctr_resolucion_fingerprint: {
        Args: {
          p_algoritmo: string
          p_contexto: string
          p_inputs: Json
          p_mapping: string
          p_num_ot: string
        }
        Returns: string
      }
      ctr_resolver_programa: {
        Args: { p_cliente_wg: string; p_contexto: string; p_num_ot: string }
        Returns: Json
      }
      ctr_supersede_resolucion: {
        Args: { p_num_ot: string; p_payload: Json }
        Returns: string
      }
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
      ops_as_of: { Args: { p_dominio?: string }; Returns: string }
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
      ops_delegaciones_impl: {
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
      ops_dispersion_detalle: {
        Args: {
          p_clave: string
          p_delegacion?: string
          p_entidad: string
          p_familia?: string
          p_from?: string
          p_gama?: string
          p_limit?: number
          p_offset?: number
          p_to?: string
        }
        Returns: Json
      }
      ops_dispersion_detalle_impl: {
        Args: {
          p_clave: string
          p_delegacion?: string
          p_entidad: string
          p_familia?: string
          p_from?: string
          p_gama?: string
          p_limit?: number
          p_offset?: number
          p_to?: string
        }
        Returns: Json
      }
      ops_dispersion_resumen: {
        Args: {
          p_delegacion?: string
          p_familia?: string
          p_from?: string
          p_gama?: string
          p_to?: string
        }
        Returns: Json
      }
      ops_dispersion_resumen_impl: {
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
      ops_logistica: {
        Args: {
          p_from?: string
          p_prev_from?: string
          p_prev_to?: string
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
      ops_panorama_resumen: {
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
      ops_panorama_resumen_impl: {
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
      ops_panorama_series: {
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
      ops_panorama_series_impl: {
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
      ops_sla_detalle: {
        Args: {
          p_canal?: string
          p_clave: string
          p_cliente?: string
          p_delegacion?: string
          p_familia?: string
          p_gama?: string
          p_limit?: number
          p_marca?: string
          p_offset?: number
          p_provincia?: string
          p_sat?: string
          p_tecnico?: string
          p_tipo: string
        }
        Returns: Json
      }
      ops_sla_evolucion: {
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
      ops_sla_resumen: {
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
      ops_supply: {
        Args: {
          p_canal?: string
          p_cliente?: string
          p_delegacion?: string
          p_familia?: string
          p_from?: string
          p_gama?: string
          p_marca?: string
          p_prev_from?: string
          p_prev_to?: string
          p_provincia?: string
          p_sat?: string
          p_tecnico?: string
          p_to?: string
        }
        Returns: Json
      }
      ops_supply_detalle: {
        Args: {
          p_bloque?: string
          p_canal?: string
          p_clave?: string
          p_cliente?: string
          p_delegacion?: string
          p_familia?: string
          p_from?: string
          p_gama?: string
          p_limit?: number
          p_marca?: string
          p_offset?: number
          p_provincia?: string
          p_sat?: string
          p_tecnico?: string
          p_to?: string
        }
        Returns: Json
      }
      ops_supply_detalle_impl: {
        Args: {
          p_bloque?: string
          p_canal?: string
          p_clave?: string
          p_cliente?: string
          p_delegacion?: string
          p_familia?: string
          p_from?: string
          p_gama?: string
          p_limit?: number
          p_marca?: string
          p_offset?: number
          p_provincia?: string
          p_sat?: string
          p_tecnico?: string
          p_to?: string
        }
        Returns: Json
      }
      ops_supply_filtrada: {
        Args: {
          p_canal: string
          p_cliente: string
          p_delegacion: string
          p_familia: string
          p_gama: string
          p_marca: string
          p_provincia: string
          p_sat: string
          p_tecnico: string
        }
        Returns: {
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
        }[]
        SetofOptions: {
          from: "*"
          to: "ops_fact_ot"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      ops_supply_resumen: {
        Args: {
          p_canal?: string
          p_cliente?: string
          p_delegacion?: string
          p_familia?: string
          p_from?: string
          p_gama?: string
          p_marca?: string
          p_prev_from?: string
          p_prev_to?: string
          p_provincia?: string
          p_sat?: string
          p_tecnico?: string
          p_to?: string
        }
        Returns: Json
      }
      ops_supply_resumen_impl: {
        Args: {
          p_canal?: string
          p_cliente?: string
          p_delegacion?: string
          p_familia?: string
          p_from?: string
          p_gama?: string
          p_marca?: string
          p_prev_from?: string
          p_prev_to?: string
          p_provincia?: string
          p_sat?: string
          p_tecnico?: string
          p_to?: string
        }
        Returns: Json
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
