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
      chapters: {
        Row: {
          miracle_range: string
          number: number
          sort_order: number | null
          subtitle: string | null
          title: string
        }
        Insert: {
          miracle_range: string
          number: number
          sort_order?: number | null
          subtitle?: string | null
          title: string
        }
        Update: {
          miracle_range?: string
          number?: number
          sort_order?: number | null
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      community_course_lessons: {
        Row: {
          attachment_url: string | null
          audio_url: string | null
          content_html: string | null
          course_id: string
          created_at: string
          description: string | null
          id: string
          lesson_number: number
          published_at: string | null
          status: string
          title: string
          video_url: string | null
        }
        Insert: {
          attachment_url?: string | null
          audio_url?: string | null
          content_html?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          lesson_number?: number
          published_at?: string | null
          status?: string
          title: string
          video_url?: string | null
        }
        Update: {
          attachment_url?: string | null
          audio_url?: string | null
          content_html?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          lesson_number?: number
          published_at?: string | null
          status?: string
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_course_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "community_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      community_courses: {
        Row: {
          course_type: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          price: number | null
          rabbi_id: string | null
          smoove_course_id: number | null
          sort_order: number
          status: string
          title: string
          total_lessons: number
          zoom_link: string | null
        }
        Insert: {
          course_type?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          price?: number | null
          rabbi_id?: string | null
          smoove_course_id?: number | null
          sort_order?: number
          status?: string
          title: string
          total_lessons?: number
          zoom_link?: string | null
        }
        Update: {
          course_type?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          price?: number | null
          rabbi_id?: string | null
          smoove_course_id?: number | null
          sort_order?: number
          status?: string
          title?: string
          total_lessons?: number
          zoom_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_courses_rabbi_id_fkey"
            columns: ["rabbi_id"]
            isOneToOne: false
            referencedRelation: "rabbis"
            referencedColumns: ["id"]
          },
        ]
      }
      community_member_courses: {
        Row: {
          completed: boolean
          course_id: string
          enrolled_at: string
          id: string
          last_lesson_id: string | null
          member_id: string
        }
        Insert: {
          completed?: boolean
          course_id: string
          enrolled_at?: string
          id?: string
          last_lesson_id?: string | null
          member_id: string
        }
        Update: {
          completed?: boolean
          course_id?: string
          enrolled_at?: string
          id?: string
          last_lesson_id?: string | null
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_member_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "community_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_member_courses_last_lesson_id_fkey"
            columns: ["last_lesson_id"]
            isOneToOne: false
            referencedRelation: "community_course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_member_courses_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "community_members"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          badge_label: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          joined_at: string
          last_name: string | null
          membership_tier: string
          phone: string | null
          smoove_id: number | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          badge_label?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          joined_at?: string
          last_name?: string | null
          membership_tier?: string
          phone?: string | null
          smoove_id?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          badge_label?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          joined_at?: string
          last_name?: string | null
          membership_tier?: string
          phone?: string | null
          smoove_id?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string
          name: string
          phone: string | null
          read: boolean
          subject: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message: string
          name: string
          phone?: string | null
          read?: boolean
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          name?: string
          phone?: string | null
          read?: boolean
          subject?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_percent: number
          id: string
          max_uses: number | null
          status: string
          used_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_percent?: number
          id?: string
          max_uses?: number | null
          status?: string
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_percent?: number
          id?: string
          max_uses?: number | null
          status?: string
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          completed: boolean
          course_id: string
          enrolled_at: string
          id: string
          last_session_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          course_id: string
          enrolled_at?: string
          id?: string
          last_session_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          course_id?: string
          enrolled_at?: string
          id?: string
          last_session_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "community_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_last_session_id_fkey"
            columns: ["last_session_id"]
            isOneToOne: false
            referencedRelation: "course_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      course_sessions: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_recorded: boolean
          recording_url: string | null
          session_date: string | null
          session_number: number
          status: string
          title: string
          zoom_link: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_recorded?: boolean
          recording_url?: string | null
          session_date?: string | null
          session_number?: number
          status?: string
          title: string
          zoom_link?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_recorded?: boolean
          recording_url?: string | null
          session_date?: string | null
          session_number?: number
          status?: string
          title?: string
          zoom_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "community_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          asmachta: string | null
          card_suffix: string | null
          created_at: string
          dedication_name: string | null
          dedication_type: string
          description: string | null
          donor_email: string | null
          donor_name: string | null
          id: string
          invoice_id: string | null
          invoice_number: string | null
          invoice_url: string | null
          is_monthly: boolean
          payment_id: string | null
          payment_method: string | null
          payment_status: string
          phone: string | null
          product: string | null
          raw_payload: Json | null
          smoove_list_id: number | null
          smoove_subscribed: boolean | null
          transaction_type_id: number | null
          user_id: string | null
        }
        Insert: {
          amount: number
          asmachta?: string | null
          card_suffix?: string | null
          created_at?: string
          dedication_name?: string | null
          dedication_type?: string
          description?: string | null
          donor_email?: string | null
          donor_name?: string | null
          id?: string
          invoice_id?: string | null
          invoice_number?: string | null
          invoice_url?: string | null
          is_monthly?: boolean
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string
          phone?: string | null
          product?: string | null
          raw_payload?: Json | null
          smoove_list_id?: number | null
          smoove_subscribed?: boolean | null
          transaction_type_id?: number | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          asmachta?: string | null
          card_suffix?: string | null
          created_at?: string
          dedication_name?: string | null
          dedication_type?: string
          description?: string | null
          donor_email?: string | null
          donor_name?: string | null
          id?: string
          invoice_id?: string | null
          invoice_number?: string | null
          invoice_url?: string | null
          is_monthly?: boolean
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string
          phone?: string | null
          product?: string | null
          raw_payload?: Json | null
          smoove_list_id?: number | null
          smoove_subscribed?: boolean | null
          transaction_type_id?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      dor_site_content: {
        Row: {
          body: string | null
          image_url: string | null
          key: string
          title: string | null
        }
        Insert: {
          body?: string | null
          image_url?: string | null
          key: string
          title?: string | null
        }
        Update: {
          body?: string | null
          image_url?: string | null
          key?: string
          title?: string | null
        }
        Relationships: []
      }
      lesson_comments: {
        Row: {
          avatar_url: string | null
          content: string
          created_at: string
          display_name: string | null
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          content: string
          created_at?: string
          display_name?: string | null
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          content?: string
          created_at?: string
          display_name?: string | null
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_comments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_dedications: {
        Row: {
          amount: number | null
          created_at: string
          dedicated_name: string
          dedication_type: string
          dedicator_name: string | null
          id: string
          lesson_id: string
          message: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          dedicated_name: string
          dedication_type?: string
          dedicator_name?: string | null
          id?: string
          lesson_id: string
          message?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          dedicated_name?: string
          dedication_type?: string
          dedicator_name?: string | null
          id?: string
          lesson_id?: string
          message?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_dedications_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_topics: {
        Row: {
          lesson_id: string
          topic_id: string
        }
        Insert: {
          lesson_id: string
          topic_id: string
        }
        Update: {
          lesson_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_topics_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          attachment_url: string | null
          audience_tags: string[]
          audio_url: string | null
          bible_book: string | null
          bible_chapter: number | null
          bible_verse: number | null
          content: string | null
          created_at: string
          description: string | null
          duration: number | null
          id: string
          published_at: string | null
          rabbi_id: string | null
          series_id: string | null
          source_type: string
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
          views_count: number
        }
        Insert: {
          attachment_url?: string | null
          audience_tags?: string[]
          audio_url?: string | null
          bible_book?: string | null
          bible_chapter?: number | null
          bible_verse?: number | null
          content?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          published_at?: string | null
          rabbi_id?: string | null
          series_id?: string | null
          source_type?: string
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
          views_count?: number
        }
        Update: {
          attachment_url?: string | null
          audience_tags?: string[]
          audio_url?: string | null
          bible_book?: string | null
          bible_chapter?: number | null
          bible_verse?: number | null
          content?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          published_at?: string | null
          rabbi_id?: string | null
          series_id?: string | null
          source_type?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "lessons_rabbi_id_fkey"
            columns: ["rabbi_id"]
            isOneToOne: false
            referencedRelation: "rabbis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_with_audience"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_batches: {
        Row: {
          completed_at: string | null
          completed_items: number
          created_at: string
          description: string | null
          failed_items: number
          id: string
          name: string
          source_type: string | null
          started_at: string | null
          status: string
          total_items: number
        }
        Insert: {
          completed_at?: string | null
          completed_items?: number
          created_at?: string
          description?: string | null
          failed_items?: number
          id?: string
          name: string
          source_type?: string | null
          started_at?: string | null
          status?: string
          total_items?: number
        }
        Update: {
          completed_at?: string | null
          completed_items?: number
          created_at?: string
          description?: string | null
          failed_items?: number
          id?: string
          name?: string
          source_type?: string | null
          started_at?: string | null
          status?: string
          total_items?: number
        }
        Relationships: []
      }
      migration_items: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          migrated_at: string | null
          source_data: Json | null
          source_id: string | null
          source_title: string | null
          source_type: string
          source_url: string | null
          status: string
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          migrated_at?: string | null
          source_data?: Json | null
          source_id?: string | null
          source_title?: string | null
          source_type?: string
          source_url?: string | null
          status?: string
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          migrated_at?: string | null
          source_data?: Json | null
          source_id?: string | null
          source_title?: string | null
          source_type?: string
          source_url?: string | null
          status?: string
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      migration_logs: {
        Row: {
          batch_id: string | null
          created_at: string
          details: Json | null
          id: string
          item_id: string | null
          level: string
          message: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          item_id?: string | null
          level?: string
          message: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          item_id?: string | null
          level?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "migration_logs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "migration_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "migration_logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "migration_items"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_redirects: {
        Row: {
          created_at: string
          hit_count: number
          id: string
          last_hit_at: string | null
          meta_description: string | null
          meta_title: string | null
          new_path: string
          notes: string | null
          old_path: string
          priority: string
          redirect_type: number
          status: string
        }
        Insert: {
          created_at?: string
          hit_count?: number
          id?: string
          last_hit_at?: string | null
          meta_description?: string | null
          meta_title?: string | null
          new_path?: string
          notes?: string | null
          old_path: string
          priority?: string
          redirect_type?: number
          status?: string
        }
        Update: {
          created_at?: string
          hit_count?: number
          id?: string
          last_hit_at?: string | null
          meta_description?: string | null
          meta_title?: string | null
          new_path?: string
          notes?: string | null
          old_path?: string
          priority?: string
          redirect_type?: number
          status?: string
        }
        Relationships: []
      }
      miracles: {
        Row: {
          body_biblical: string | null
          body_intro: string | null
          body_miracle: string | null
          body_personal: string | null
          chapter_number: number | null
          cta_text: string | null
          image_url: string | null
          number: number
          publish_at: string | null
          status: string | null
          suggested_image_keywords: string | null
          title: string
          updated_at: string | null
          verse_source: string | null
          verse_text: string | null
        }
        Insert: {
          body_biblical?: string | null
          body_intro?: string | null
          body_miracle?: string | null
          body_personal?: string | null
          chapter_number?: number | null
          cta_text?: string | null
          image_url?: string | null
          number: number
          publish_at?: string | null
          status?: string | null
          suggested_image_keywords?: string | null
          title: string
          updated_at?: string | null
          verse_source?: string | null
          verse_text?: string | null
        }
        Update: {
          body_biblical?: string | null
          body_intro?: string | null
          body_miracle?: string | null
          body_personal?: string | null
          chapter_number?: number | null
          cta_text?: string | null
          image_url?: string | null
          number?: number
          publish_at?: string | null
          status?: string | null
          suggested_image_keywords?: string | null
          title?: string
          updated_at?: string | null
          verse_source?: string | null
          verse_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "miracles_chapter_number_fkey"
            columns: ["chapter_number"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["number"]
          },
        ]
      }
      ohp_chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          message_id: string | null
          role: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          message_id?: string | null
          role: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          message_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ohp_chat_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ohp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      ohp_messages: {
        Row: {
          created_at: string | null
          dedication: string | null
          docx_filename: string | null
          html_content: string | null
          id: string
          message_type: string
          moreshet_url: string | null
          parsha_name: string
          pdf_url: string | null
          status: string
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dedication?: string | null
          docx_filename?: string | null
          html_content?: string | null
          id?: string
          message_type?: string
          moreshet_url?: string | null
          parsha_name: string
          pdf_url?: string | null
          status?: string
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dedication?: string | null
          docx_filename?: string | null
          html_content?: string | null
          id?: string
          message_type?: string
          moreshet_url?: string | null
          parsha_name?: string
          pdf_url?: string | null
          status?: string
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ohp_send_logs: {
        Row: {
          campaign_id: string | null
          id: string
          list_ids: number[] | null
          message_id: string | null
          send_type: string
          sent_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          id?: string
          list_ids?: number[] | null
          message_id?: string | null
          send_type: string
          sent_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          id?: string
          list_ids?: number[] | null
          message_id?: string | null
          send_type?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ohp_send_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ohp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          item_type: string
          order_id: string
          product_id: string | null
          quantity: number
          title: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_type?: string
          order_id: string
          product_id?: string | null
          quantity?: number
          title: string
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          item_type?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          title?: string
          total_price?: number
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
          asmachta: string | null
          card_suffix: string | null
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          description: string | null
          discount: number
          id: string
          installments: number
          invoice_id: string | null
          invoice_number: string | null
          invoice_type: string
          invoice_url: string | null
          notes: string | null
          order_number: string
          payment_id: string | null
          payment_method: string | null
          payment_status: string
          product: string | null
          raw_payload: Json | null
          shipping_address: string | null
          shipping_city: string | null
          shipping_zip: string | null
          smoove_list_id: number | null
          smoove_subscribed: boolean | null
          status: string
          subtotal: number
          total: number
          transaction_type_id: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          asmachta?: string | null
          card_suffix?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          description?: string | null
          discount?: number
          id?: string
          installments?: number
          invoice_id?: string | null
          invoice_number?: string | null
          invoice_type?: string
          invoice_url?: string | null
          notes?: string | null
          order_number?: string
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string
          product?: string | null
          raw_payload?: Json | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_zip?: string | null
          smoove_list_id?: number | null
          smoove_subscribed?: boolean | null
          status?: string
          subtotal?: number
          total?: number
          transaction_type_id?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          asmachta?: string | null
          card_suffix?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          description?: string | null
          discount?: number
          id?: string
          installments?: number
          invoice_id?: string | null
          invoice_number?: string | null
          invoice_type?: string
          invoice_url?: string | null
          notes?: string | null
          order_number?: string
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string
          product?: string | null
          raw_payload?: Json | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_zip?: string | null
          smoove_list_id?: number | null
          smoove_subscribed?: boolean | null
          status?: string
          subtotal?: number
          total?: number
          transaction_type_id?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_products: {
        Row: {
          active: boolean
          created_at: string
          default_amount: number | null
          description: string | null
          display_name: string
          id: string
          max_installments: number
          page_code_env: string
          smoove_list_id: number | null
          smoove_list_name: string | null
          target_table: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_amount?: number | null
          description?: string | null
          display_name: string
          id: string
          max_installments?: number
          page_code_env: string
          smoove_list_id?: number | null
          smoove_list_name?: string | null
          target_table?: string
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_amount?: number | null
          description?: string | null
          display_name?: string
          id?: string
          max_installments?: number
          page_code_env?: string
          smoove_list_id?: number | null
          smoove_list_name?: string | null
          target_table?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string | null
          content: string | null
          created_at: string
          description: string | null
          digital_file_url: string | null
          featured: boolean
          gallery_urls: string[] | null
          id: string
          image_url: string | null
          is_digital: boolean
          original_price: number | null
          page_count: number | null
          price: number
          product_type: string
          slug: string
          sort_order: number
          source_url: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          digital_file_url?: string | null
          featured?: boolean
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          is_digital?: boolean
          original_price?: number | null
          page_count?: number | null
          price?: number
          product_type?: string
          slug: string
          sort_order?: number
          source_url?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          digital_file_url?: string | null
          featured?: boolean
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          is_digital?: boolean
          original_price?: number | null
          page_count?: number | null
          price?: number
          product_type?: string
          slug?: string
          sort_order?: number
          source_url?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
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
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      rabbis: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          image_url: string | null
          lesson_count: number
          name: string
          specialty: string | null
          status: string
          title: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          lesson_count?: number
          name: string
          specialty?: string | null
          status?: string
          title?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          lesson_count?: number
          name?: string
          specialty?: string | null
          status?: string
          title?: string | null
        }
        Relationships: []
      }
      registrations: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: number
          participants: string | null
          phone: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id?: never
          participants?: string | null
          phone: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: never
          participants?: string | null
          phone?: string
        }
        Relationships: []
      }
      series: {
        Row: {
          audience_tags: string[]
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          lesson_count: number
          parent_id: string | null
          rabbi_id: string | null
          sort_order: number
          status: string
          title: string
        }
        Insert: {
          audience_tags?: string[]
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          lesson_count?: number
          parent_id?: string | null
          rabbi_id?: string | null
          sort_order?: number
          status?: string
          title: string
        }
        Update: {
          audience_tags?: string[]
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          lesson_count?: number
          parent_id?: string | null
          rabbi_id?: string | null
          sort_order?: number
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "series_with_audience"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_rabbi_id_fkey"
            columns: ["rabbi_id"]
            isOneToOne: false
            referencedRelation: "rabbis"
            referencedColumns: ["id"]
          },
        ]
      }
      series_links: {
        Row: {
          id: string
          link_type: string
          linked_series_id: string
          sort_order: number
          source_series_id: string
        }
        Insert: {
          id?: string
          link_type?: string
          linked_series_id: string
          sort_order?: number
          source_series_id: string
        }
        Update: {
          id?: string
          link_type?: string
          linked_series_id?: string
          sort_order?: number
          source_series_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_links_linked_series_id_fkey"
            columns: ["linked_series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_links_linked_series_id_fkey"
            columns: ["linked_series_id"]
            isOneToOne: false
            referencedRelation: "series_with_audience"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_links_source_series_id_fkey"
            columns: ["source_series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_links_source_series_id_fkey"
            columns: ["source_series_id"]
            isOneToOne: false
            referencedRelation: "series_with_audience"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          description: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "topics_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenge_progress: {
        Row: {
          challenge_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          current_count: number
          id: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_count?: number
          id?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_count?: number
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "weekly_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_daily_activity: {
        Row: {
          activity_date: string
          created_at: string
          id: string
          lessons_completed: number
          minutes_learned: number
          user_id: string
        }
        Insert: {
          activity_date?: string
          created_at?: string
          id?: string
          lessons_completed?: number
          minutes_learned?: number
          user_id: string
        }
        Update: {
          activity_date?: string
          created_at?: string
          id?: string
          lessons_completed?: number
          minutes_learned?: number
          user_id?: string
        }
        Relationships: []
      }
      user_enrollments: {
        Row: {
          completed: boolean
          completed_at: string | null
          completed_lessons: number
          enrolled_at: string
          id: string
          last_lesson_id: string | null
          series_id: string
          total_lessons: number
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          completed_lessons?: number
          enrolled_at?: string
          id?: string
          last_lesson_id?: string | null
          series_id: string
          total_lessons?: number
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          completed_lessons?: number
          enrolled_at?: string
          id?: string
          last_lesson_id?: string | null
          series_id?: string
          total_lessons?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_enrollments_last_lesson_id_fkey"
            columns: ["last_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_enrollments_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_enrollments_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_with_audience"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorite_rabbis: {
        Row: {
          created_at: string
          id: string
          rabbi_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rabbi_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rabbi_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorite_rabbis_rabbi_id_fkey"
            columns: ["rabbi_id"]
            isOneToOne: false
            referencedRelation: "rabbis"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorite_series: {
        Row: {
          created_at: string
          id: string
          series_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          series_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          series_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorite_series_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorite_series_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series_with_audience"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_history: {
        Row: {
          completed: boolean | null
          id: string
          lesson_id: string
          progress_seconds: number | null
          user_id: string
          watched_at: string
        }
        Insert: {
          completed?: boolean | null
          id?: string
          lesson_id: string
          progress_seconds?: number | null
          user_id: string
          watched_at?: string
        }
        Update: {
          completed?: boolean | null
          id?: string
          lesson_id?: string
          progress_seconds?: number | null
          user_id?: string
          watched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_history_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_points: {
        Row: {
          id: string
          lifetime_points: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          lifetime_points?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          lifetime_points?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_points_log: {
        Row: {
          action: string
          created_at: string
          id: string
          points: number
          reference_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          points: number
          reference_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          points?: number
          reference_id?: string | null
          user_id?: string
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
      weekly_challenges: {
        Row: {
          action_type: string
          active: boolean
          created_at: string
          description: string | null
          id: string
          reward_badge: string | null
          reward_points: number
          target_count: number
          title: string
          week_end: string
          week_start: string
        }
        Insert: {
          action_type: string
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          reward_badge?: string | null
          reward_points?: number
          target_count?: number
          title: string
          week_end?: string
          week_start?: string
        }
        Update: {
          action_type?: string
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          reward_badge?: string | null
          reward_points?: number
          target_count?: number
          title?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      series_with_audience: {
        Row: {
          audience_tags: string[] | null
          id: string | null
          lesson_count: number | null
          rabbi_id: string | null
          rabbi_name: string | null
          status: string | null
          teacher_tagged: boolean | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "series_rabbi_id_fkey"
            columns: ["rabbi_id"]
            isOneToOne: false
            referencedRelation: "rabbis"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_leaderboard: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          lifetime_points: number | null
          rank: number | null
          total_points: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_series_ancestors: {
        Args: { series_uuid: string }
        Returns: {
          depth: number
          id: string
          title: string
        }[]
      }
      get_series_descendant_ids: {
        Args: { root_id: string }
        Returns: {
          parent_series_id: string
          series_id: string
          series_title: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
