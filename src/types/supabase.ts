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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          description: string | null
          icon: string | null
          id: string
          name: string | null
          stat_key: string | null
          unlock_value: number | null
        }
        Insert: {
          description?: string | null
          icon?: string | null
          id?: string
          name?: string | null
          stat_key?: string | null
          unlock_value?: number | null
        }
        Update: {
          description?: string | null
          icon?: string | null
          id?: string
          name?: string | null
          stat_key?: string | null
          unlock_value?: number | null
        }
        Relationships: []
      }
      admins: {
        Row: {
          created_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      affirmation_logs: {
        Row: {
          affirmation: string | null
          archetype: string | null
          created_at: string
          id: string
          love_language: string | null
          mood: string | null
          user_id: string | null
        }
        Insert: {
          affirmation?: string | null
          archetype?: string | null
          created_at?: string
          id?: string
          love_language?: string | null
          mood?: string | null
          user_id?: string | null
        }
        Update: {
          affirmation?: string | null
          archetype?: string | null
          created_at?: string
          id?: string
          love_language?: string | null
          mood?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      daily_affirmations: {
        Row: {
          affirmation: string
          archetype_name: string | null
          created_at: string | null
          date: string
          day_part: string | null
          emotion_tags: string[] | null
          generated_by_gpt: boolean | null
          love_language: string | null
          mood_summary: string | null
          notes: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          affirmation: string
          archetype_name?: string | null
          created_at?: string | null
          date: string
          day_part?: string | null
          emotion_tags?: string[] | null
          generated_by_gpt?: boolean | null
          love_language?: string | null
          mood_summary?: string | null
          notes?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          affirmation?: string
          archetype_name?: string | null
          created_at?: string | null
          date?: string
          day_part?: string | null
          emotion_tags?: string[] | null
          generated_by_gpt?: boolean | null
          love_language?: string | null
          mood_summary?: string | null
          notes?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: []
      }
      journal_analysis: {
        Row: {
          created_at: string
          id: string
          mood_id: string | null
          sentiment_comparative: number | null
          sentiment_score: number | null
          top_keywords: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mood_id?: string | null
          sentiment_comparative?: number | null
          sentiment_score?: number | null
          top_keywords?: string[] | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          mood_id?: string | null
          sentiment_comparative?: number | null
          sentiment_score?: number | null
          top_keywords?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_analysis_mood_id_fkey"
            columns: ["mood_id"]
            isOneToOne: false
            referencedRelation: "moods"
            referencedColumns: ["id"]
          },
        ]
      }
      keyword_tracker: {
        Row: {
          created_at: string | null
          frequency: number | null
          id: string
          keyword: string
          last_used: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          frequency?: number | null
          id?: string
          keyword: string
          last_used?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          frequency?: number | null
          id?: string
          keyword?: string
          last_used?: string | null
          user_id?: string
        }
        Relationships: []
      }
      moods: {
        Row: {
          archetype: string | null
          created_at: string
          follow_up: string | null
          id: string
          journal: string | null
          love_language: string | null
          mood: string | null
          need: string | null
          reflection: string | null
          social_battery: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          archetype?: string | null
          created_at?: string
          follow_up?: string | null
          id?: string
          journal?: string | null
          love_language?: string | null
          mood?: string | null
          need?: string | null
          reflection?: string | null
          social_battery?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          archetype?: string | null
          created_at?: string
          follow_up?: string | null
          id?: string
          journal?: string | null
          love_language?: string | null
          mood?: string | null
          need?: string | null
          reflection?: string | null
          social_battery?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      product_profile_ratings: {
        Row: {
          created_at: string | null
          floral: number | null
          fresh: number | null
          fruity: number | null
          id: number
          product_id: string
          smoky: number | null
          source: string
          spicy: number | null
          strength: number | null
          sweet: number | null
          user_id: string | null
          woody: number | null
        }
        Insert: {
          created_at?: string | null
          floral?: number | null
          fresh?: number | null
          fruity?: number | null
          id?: number
          product_id: string
          smoky?: number | null
          source: string
          spicy?: number | null
          strength?: number | null
          sweet?: number | null
          user_id?: string | null
          woody?: number | null
        }
        Update: {
          created_at?: string | null
          floral?: number | null
          fresh?: number | null
          fruity?: number | null
          id?: number
          product_id?: string
          smoky?: number | null
          source?: string
          spicy?: number | null
          strength?: number | null
          sweet?: number | null
          user_id?: string | null
          woody?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_profile_ratings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ratings: {
        Row: {
          comment: string | null
          created_at: string
          email: string | null
          floral: number
          fresh: number
          fruity: number
          id: string
          product_id: string
          spicy: number
          status: Database["public"]["Enums"]["rating_status"]
          strength: number
          token: string | null
          updated_at: string
          user_id: string | null
          woody: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          email?: string | null
          floral?: number
          fresh?: number
          fruity?: number
          id?: string
          product_id: string
          spicy?: number
          status?: Database["public"]["Enums"]["rating_status"]
          strength?: number
          token?: string | null
          updated_at?: string
          user_id?: string | null
          woody?: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          email?: string | null
          floral?: number
          fresh?: number
          fruity?: number
          id?: string
          product_id?: string
          spicy?: number
          status?: Database["public"]["Enums"]["rating_status"]
          strength?: number
          token?: string | null
          updated_at?: string
          user_id?: string | null
          woody?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_ratings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          collection: string | null
          created_at: string | null
          description: string | null
          ft: unknown | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string | null
          options: Json | null
          price_cents: number | null
          slug: string
          tags: string[] | null
          title: string | null
          updated_at: string | null
          variants: Json | null
        }
        Insert: {
          collection?: string | null
          created_at?: string | null
          description?: string | null
          ft?: unknown | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string | null
          options?: Json | null
          price_cents?: number | null
          slug: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          variants?: Json | null
        }
        Update: {
          collection?: string | null
          created_at?: string | null
          description?: string | null
          ft?: unknown | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string | null
          options?: Json | null
          price_cents?: number | null
          slug?: string
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          variants?: Json | null
        }
        Relationships: []
      }
      profile_widgets: {
        Row: {
          created_at: string | null
          id: string
          is_public: boolean | null
          payload: Json
          position: number | null
          ref_id: string | null
          size: string
          type: string
          updated_at: string
          user_id: string | null
          variation: string
          widget_key: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          payload?: Json
          position?: number | null
          ref_id?: string | null
          size?: string
          type: string
          updated_at?: string
          user_id?: string | null
          variation: string
          widget_key?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          payload?: Json
          position?: number | null
          ref_id?: string | null
          size?: string
          type?: string
          updated_at?: string
          user_id?: string | null
          variation?: string
          widget_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_widgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_widgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          archetype: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          handle: string | null
          id: string
          love_language: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          archetype?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          handle?: string | null
          id: string
          love_language?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          archetype?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          handle?: string | null
          id?: string
          love_language?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      quiz_answers: {
        Row: {
          answer: Json
          attempt_id: string
          id: string
          question_id: string
        }
        Insert: {
          answer: Json
          attempt_id: string
          id?: string
          question_id: string
        }
        Update: {
          answer?: Json
          attempt_id?: string
          id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts_latest"
            referencedColumns: ["attempt_id"]
          },
          {
            foreignKeyName: "quiz_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "v_public_quiz_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          is_public: boolean
          meta: Json | null
          quiz_id: string
          quiz_slug: string | null
          result_key: string | null
          result_summary: string | null
          result_title: string | null
          result_totals: Json | null
          result_weights: Json | null
          started_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean
          meta?: Json | null
          quiz_id: string
          quiz_slug?: string | null
          result_key?: string | null
          result_summary?: string | null
          result_title?: string | null
          result_totals?: Json | null
          result_weights?: Json | null
          started_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean
          meta?: Json | null
          quiz_id?: string
          quiz_slug?: string | null
          result_key?: string | null
          result_summary?: string | null
          result_title?: string | null
          result_totals?: Json | null
          result_weights?: Json | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "v_public_quiz_results"
            referencedColumns: ["quiz_id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          help_text: string | null
          id: string
          options: Json | null
          position: number
          prompt: string
          quiz_id: string
          required: boolean
          type: string
        }
        Insert: {
          help_text?: string | null
          id?: string
          options?: Json | null
          position?: number
          prompt: string
          quiz_id: string
          required?: boolean
          type?: string
        }
        Update: {
          help_text?: string | null
          id?: string
          options?: Json | null
          position?: number
          prompt?: string
          quiz_id?: string
          required?: boolean
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "v_public_quiz_results"
            referencedColumns: ["quiz_id"]
          },
        ]
      }
      quiz_results: {
        Row: {
          archetype_weights: Json
          id: string
          key: string
          quiz_id: string
          summary: string
          title: string
        }
        Insert: {
          archetype_weights: Json
          id?: string
          key: string
          quiz_id: string
          summary: string
          title: string
        }
        Update: {
          archetype_weights?: Json
          id?: string
          key?: string
          quiz_id?: string
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_results_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "v_public_quiz_results"
            referencedColumns: ["quiz_id"]
          },
        ]
      }
      quiz_snapshots: {
        Row: {
          created_at: string | null
          growth_score: number | null
          id: string
          is_public: boolean | null
          label: string
          quiz_slug: string
          totals: Json
          user_id: string
        }
        Insert: {
          created_at?: string | null
          growth_score?: number | null
          id?: string
          is_public?: boolean | null
          label: string
          quiz_slug: string
          totals: Json
          user_id: string
        }
        Update: {
          created_at?: string | null
          growth_score?: number | null
          id?: string
          is_public?: boolean | null
          label?: string
          quiz_slug?: string
          totals?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          questions: Json | null
          slug: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          questions?: Json | null
          slug: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          questions?: Json | null
          slug?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      rating_tokens: {
        Row: {
          created_at: string
          email: string | null
          expires_at: string
          id: string
          product_id: string
          redeemed_at: string | null
          token: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          product_id: string
          redeemed_at?: string | null
          token: string
        }
        Update: {
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          product_id?: string
          redeemed_at?: string | null
          token?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          email: string | null
          floral: number | null
          fresh: number | null
          fruity: number | null
          id: string
          product_id: string
          spicy: number | null
          status: string
          strength: number | null
          woody: number | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          email?: string | null
          floral?: number | null
          fresh?: number | null
          fruity?: number | null
          id?: string
          product_id: string
          spicy?: number | null
          status?: string
          strength?: number | null
          woody?: number | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          email?: string | null
          floral?: number | null
          fresh?: number | null
          fruity?: number | null
          id?: string
          product_id?: string
          spicy?: number | null
          status?: string
          strength?: number | null
          woody?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_product_fk"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          created_at: string | null
          done_at: string | null
          id: string
          meta: Json | null
          person_label: string | null
          quiz_slug: string | null
          remind_at: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          done_at?: string | null
          id?: string
          meta?: Json | null
          person_label?: string | null
          quiz_slug?: string | null
          remind_at: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          done_at?: string | null
          id?: string
          meta?: Json | null
          person_label?: string | null
          quiz_slug?: string | null
          remind_at?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          progress: number
          unlocked_at: string | null
          user_id: string | null
        }
        Insert: {
          achievement_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          progress?: number
          unlocked_at?: string | null
          user_id?: string | null
        }
        Update: {
          achievement_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          progress?: number
          unlocked_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_fk"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_archetype: {
        Row: {
          scores: Json
          user_id: string
        }
        Insert: {
          scores?: Json
          user_id: string
        }
        Update: {
          scores?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_item_interactions: {
        Row: {
          affirmations_saved: number | null
          inserted_at: string | null
          item_id: string
          last_interaction: string | null
          repurchases: number | null
          shared: number | null
          updated_at: string | null
          user_id: string
          views: number | null
          wishlist_saves: number | null
        }
        Insert: {
          affirmations_saved?: number | null
          inserted_at?: string | null
          item_id: string
          last_interaction?: string | null
          repurchases?: number | null
          shared?: number | null
          updated_at?: string | null
          user_id: string
          views?: number | null
          wishlist_saves?: number | null
        }
        Update: {
          affirmations_saved?: number | null
          inserted_at?: string | null
          item_id?: string
          last_interaction?: string | null
          repurchases?: number | null
          shared?: number | null
          updated_at?: string | null
          user_id?: string
          views?: number | null
          wishlist_saves?: number | null
        }
        Relationships: []
      }
      user_item_rankings: {
        Row: {
          inserted_at: string | null
          is_public: boolean | null
          item_id: string
          rank: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          inserted_at?: string | null
          is_public?: boolean | null
          item_id: string
          rank: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          inserted_at?: string | null
          is_public?: boolean | null
          item_id?: string
          rank?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_item_rankings_product"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          affirmations_saved: number | null
          archetype_unlocked: boolean | null
          days_streak: number | null
          mood_checkins: number | null
          products_purchased: number | null
          reflections_logged: number | null
          user_id: string
        }
        Insert: {
          affirmations_saved?: number | null
          archetype_unlocked?: boolean | null
          days_streak?: number | null
          mood_checkins?: number | null
          products_purchased?: number | null
          reflections_logged?: number | null
          user_id: string
        }
        Update: {
          affirmations_saved?: number | null
          archetype_unlocked?: boolean | null
          days_streak?: number | null
          mood_checkins?: number | null
          products_purchased?: number | null
          reflections_logged?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      product_rating_summary: {
        Row: {
          floral_avg: number | null
          fresh_avg: number | null
          fruity_avg: number | null
          product_id: string | null
          ratings_count: number | null
          spicy_avg: number | null
          strength_avg: number | null
          woody_avg: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_ratings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products_tags_catalog: {
        Row: {
          tag: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          display_name: string | null
          handle: string | null
          id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: never
          display_name?: never
          handle?: string | null
          id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: never
          display_name?: never
          handle?: string | null
          id?: string | null
        }
        Relationships: []
      }
      quiz_attempts_latest: {
        Row: {
          attempt_id: string | null
          created_at: string | null
          quiz_slug: string | null
          result_key: string | null
          result_totals: Json | null
          user_id: string | null
        }
        Relationships: []
      }
      ratings_summary: {
        Row: {
          floral_avg: number | null
          fresh_avg: number | null
          fruity_avg: number | null
          product_id: string | null
          ratings_count: number | null
          spicy_avg: number | null
          strength_avg: number | null
          woody_avg: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_ratings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      top_behavior_item_per_user: {
        Row: {
          item_id: string | null
          score: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_public_quiz_results: {
        Row: {
          completed_at: string | null
          id: string | null
          quiz_category: string | null
          quiz_id: string | null
          quiz_slug: string | null
          quiz_title: string | null
          result_summary: string | null
          result_title: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      afd_normalize_tags: {
        Args: { tags: string[] }
        Returns: string[]
      }
      get_product_rating_summary: {
        Args: { p_product_id: string }
        Returns: {
          floral_avg: number
          fresh_avg: number
          fruity_avg: number
          ratings_count: number
          spicy_avg: number
          strength_avg: number
          woody_avg: number
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      increment_keyword_frequency: {
        Args: { p_keyword: string; p_user_id: string }
        Returns: undefined
      }
      maybe_award_first_checkin: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      quiz_profile_delta: {
        Args: { p_from?: unknown; p_quiz: string; p_user: string }
        Returns: Json
      }
      quiz_profile_timeseries: {
        Args: { p_days?: number; p_quiz: string; p_user: string }
        Returns: {
          dt: string
          totals: Json
        }[]
      }
      rpc_apply_archetype_influence: {
        Args: { p_delta: Json; p_user: string }
        Returns: undefined
      }
      rpc_eval_achievements: {
        Args: { p_user: string }
        Returns: undefined
      }
      rpc_get_favorites_with_products: {
        Args: { u: string }
        Returns: {
          handle: string
          image_url: string
          is_public: boolean
          item_id: string
          rank: number
          title: string
        }[]
      }
      rpc_reorder_favorites: {
        Args: { p_rows: Json; p_user: string } | { rows: Json }
        Returns: undefined
      }
      rpc_update_user_stats: {
        Args: { p_user: string; p_xp?: number }
        Returns: undefined
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      update_user_stats: {
        Args: {
          p_checkin_date?: string
          p_delta_xp?: number
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      mood_level: "happy" | "sad" | "angry" | "calm" | "excited" | "anxious"
      rating_status: "pending" | "verified" | "rejected"
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
      mood_level: ["happy", "sad", "angry", "calm", "excited", "anxious"],
      rating_status: ["pending", "verified", "rejected"],
    },
  },
} as const
