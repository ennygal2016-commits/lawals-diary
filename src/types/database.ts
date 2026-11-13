/**
 * Database types for supabase-js, matching supabase/migrations/*.sql.
 * Written by hand (the Supabase CLI isn't installed — see CLAUDE.md). Keep in step with every migration;
 * the shape is the same as `supabase gen types typescript`, so generated output can replace this file later.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PartnerKey = "a" | "b";
export type ProfileRole = "admin";
export type Mood = "loved" | "happy" | "calm" | "excited" | "funny" | "tired" | "bittersweet" | "sad";
export type EntryCategory = "everyday" | "date_night" | "travel" | "milestone" | "food" | "family" | "other";
export type Visibility = "private" | "public";
export type EntryStatus = "draft" | "published";
export type DailyKind = "scripture" | "romance" | "love" | "faith" | "encouragement";
export type BookStatus = "want_to_read" | "reading" | "finished";
export type SchoolLevel = "primary" | "secondary" | "tertiary" | "vocational";
export type ApplicationStatus = "new" | "reviewing" | "shortlisted" | "approved" | "declined" | "funded";

type Base = { id: string; created_at: string; updated_at: string };

/** Insert: columns with database defaults (and nullable columns) become optional. */
type InsertOf<Row, Required extends keyof Row> = Pick<Row, Required> & Partial<Omit<Row, Required>>;
type Table<Row, Required extends keyof Row, Update = Partial<Row>> = {
  Row: Row;
  Insert: InsertOf<Row, Required>;
  Update: Update;
  Relationships: [];
};

export type AdminAllowlistRow = Base & {
  email: string;
  partner: PartnerKey;
  display_name: string;
  nickname: string;
};

export type ProfileRow = Base & {
  user_id: string;
  partner: PartnerKey;
  display_name: string;
  nickname: string;
  avatar_path: string | null;
  timezone: string;
  notify_prefs: Json;
  role: ProfileRole;
};
/** Only these columns are granted for update to signed-in users. */
export type ProfileUpdate = Partial<
  Pick<ProfileRow, "display_name" | "nickname" | "avatar_path" | "timezone" | "notify_prefs">
>;

export type PhotoRow = Base & {
  uploader_id: string;
  storage_path: string;
  variants: Json;
  width: number | null;
  height: number | null;
  caption: string | null;
  taken_on: string | null;
  in_gallery: boolean;
  on_about: boolean;
  deleted_at: string | null;
  /** Copies in photos-public while the photo is public (migration 0005). */
  public_variants: Json | null;
};

export type EntryRow = Base & {
  author_id: string;
  title: string;
  entry_date: string;
  location: string | null;
  mood: Mood | null;
  category: EntryCategory;
  body_json: Json;
  body_text: string;
  visibility: Visibility;
  status: EntryStatus;
  slug: string | null;
  cover_photo_id: string | null;
  public_show_comments: boolean;
  public_show_location: boolean;
  public_show_mood: boolean;
  deleted_at: string | null;
  search: unknown;
};

export type EntryPhotoRow = Base & { entry_id: string; photo_id: string; position: number };

export type CommentRow = Base & {
  entry_id: string;
  author_id: string;
  body: string;
  deleted_at: string | null;
};

export type NoteRow = Base & {
  from_id: string;
  to_id: string;
  body: string;
  read_at: string | null;
  reply_body: string | null;
  replied_at: string | null;
};

export type NotificationRow = Base & {
  user_id: string;
  type: "entry" | "comment" | "note" | "note_reply" | "application";
  payload: Json;
  read_at: string | null;
  /** Set when emailed, instantly or in the digest (migration 0007). */
  emailed_at: string | null;
};

export type DailyContentRow = Base & {
  kind: DailyKind;
  text: string;
  attribution: string | null;
  reference: string | null;
  translation: string | null;
  active: boolean;
};

export type BookRow = Base & {
  title: string;
  author: string | null;
  isbn: string | null;
  cover_path: string | null;
  status: BookStatus;
  readers: string[];
  started_on: string | null;
  finished_on: string | null;
  rating: number | null;
  notes: string | null;
};

export type BookQuoteRow = Base & {
  book_id: string;
  text: string;
  page: string | null;
  added_by: string | null;
};

export type AboutPageRow = Base & {
  singleton: boolean;
  hero_photo_id: string | null;
  couple_names: string;
  story_json: Json;
  milestones: Json;
  photo_ids: string[];
  published_at: string | null;
  /** What the public page shows; copied from the draft columns on Publish (migration 0009). */
  published_snapshot: Json | null;
};

export type SettingsRow = Base & {
  singleton: boolean;
  anniversary: string | null;
  bible_translation: string;
  public_site_enabled: boolean;
  special_dates: Json;
  bible_notice: string;
};

export type FoundationApplicationRow = Base & {
  reference: string;
  applicant_name: string;
  applicant_dob: string;
  applicant_phone: string | null;
  applicant_email: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  guardian_relationship: string | null;
  school: string;
  level: SchoolLevel;
  class_year: string;
  amount_requested: number;
  currency: "CAD";
  reason: string;
  consent_data: boolean;
  consent_contact: boolean;
  status: ApplicationStatus;
  admin_notes: string | null;
  amount_paid: number | null;
  paid_on: string | null;
  receipt_path: string | null;
};

export type ApplicationDocumentRow = Base & {
  application_id: string;
  storage_path: string;
  mime: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
  size: number;
};

export type ApplicationEventRow = Base & {
  application_id: string;
  actor_id: string | null;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus | null;
  note: string | null;
};

export type PublicEntryRow = {
  id: string;
  slug: string | null;
  title: string;
  entry_date: string;
  category: EntryCategory;
  body_json: Json;
  body_text: string;
  cover_photo_id: string | null;
  location: string | null;
  mood: Mood | null;
  show_comments: boolean;
  author_name: string;
  author_partner: PartnerKey;
  created_at: string;
  updated_at: string;
};

export type PublicPhotoRow = Pick<
  PhotoRow,
  "id" | "variants" | "width" | "height" | "caption" | "taken_on" | "in_gallery" | "on_about" | "created_at"
>;

/** photo_library view (migration 0005): live photos + public flags, caller's RLS applies. */
export type PhotoLibraryRow = Omit<PhotoRow, "deleted_at"> & { in_public_entry: boolean; is_public: boolean };

/** public_about reads the published snapshot (migration 0009); photo_ids is a JSON array of ids. */
export type PublicAboutRow = {
  hero_photo_id: string | null;
  couple_names: string;
  story_json: Json;
  milestones: Json;
  photo_ids: Json;
  published_at: string | null;
};
export type PublicSiteRow = { enabled: boolean };
export type PublicEntryPhotoRow = { entry_id: string; photo_id: string; position: number };
export type PublicCommentRow = {
  id: string;
  entry_id: string;
  body: string;
  author_name: string;
  author_partner: PartnerKey;
  created_at: string;
};

/** timeline_search() (migration 0006). */
export type TimelineSearchRow = {
  id: string;
  title: string;
  entry_date: string;
  category: EntryCategory;
  visibility: Visibility;
  mood: Mood | null;
  author_id: string;
  comment_count: number;
  photo_count: number;
  cover_variants: Json | null;
  month_count: number;
  total_count: number;
};

type View<Row> = { Row: Row; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      admin_allowlist: Table<AdminAllowlistRow, "email" | "partner" | "display_name" | "nickname">;
      profiles: Table<ProfileRow, "user_id" | "partner" | "display_name" | "nickname", ProfileUpdate>;
      photos: Table<PhotoRow, "uploader_id" | "storage_path">;
      entries: Table<EntryRow, "author_id" | "title", Partial<Omit<EntryRow, "search">>>;
      entry_photos: Table<EntryPhotoRow, "entry_id" | "photo_id">;
      comments: Table<CommentRow, "entry_id" | "author_id" | "body">;
      notes: Table<NoteRow, "from_id" | "to_id" | "body">;
      notifications: Table<NotificationRow, "user_id" | "type">;
      daily_content: Table<DailyContentRow, "kind" | "text">;
      books: Table<BookRow, "title">;
      book_quotes: Table<BookQuoteRow, "book_id" | "text">;
      about_page: Table<AboutPageRow, never>;
      settings: Table<SettingsRow, never>;
      foundation_applications: Table<
        FoundationApplicationRow,
        | "reference"
        | "applicant_name"
        | "applicant_dob"
        | "school"
        | "level"
        | "class_year"
        | "amount_requested"
        | "reason"
      >;
      application_documents: Table<
        ApplicationDocumentRow,
        "application_id" | "storage_path" | "mime" | "size"
      >;
      application_events: Table<ApplicationEventRow, "application_id">;
    };
    Views: {
      public_entries: View<PublicEntryRow>;
      public_photos: View<PublicPhotoRow>;
      public_about: View<PublicAboutRow>;
      public_site: View<PublicSiteRow>;
      public_entry_photos: View<PublicEntryPhotoRow>;
      public_comments: View<PublicCommentRow>;
      photo_library: View<PhotoLibraryRow>;
    };
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      next_foundation_reference: { Args: Record<PropertyKey, never>; Returns: string };
      set_application_status: {
        Args: { p_id: string; p_status: ApplicationStatus; p_note?: string | null };
        Returns: undefined;
      };
      record_application_payment: {
        Args: { p_id: string; p_amount: number; p_paid_on: string; p_receipt_path?: string | null };
        Returns: undefined;
      };
      timeline_search: {
        Args: {
          p_query?: string | null;
          p_visibility?: Visibility | null;
          p_author?: string | null;
          p_moods?: Mood[] | null;
          p_categories?: EntryCategory[] | null;
          p_from?: string | null;
          p_to?: string | null;
          p_has_photos?: boolean | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: TimelineSearchRow[];
      };
    };
    Enums: {
      partner_key: PartnerKey;
      profile_role: ProfileRole;
      mood: Mood;
      entry_category: EntryCategory;
      visibility: Visibility;
      entry_status: EntryStatus;
      daily_kind: DailyKind;
      book_status: BookStatus;
      school_level: SchoolLevel;
      application_status: ApplicationStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

/** Names of the tables RLS must keep private (used by the anonymous-access tests). */
export const PRIVATE_TABLES = [
  "admin_allowlist",
  "profiles",
  "photos",
  "entries",
  "entry_photos",
  "comments",
  "notes",
  "notifications",
  "daily_content",
  "books",
  "book_quotes",
  "about_page",
  "settings",
  "foundation_applications",
  "application_documents",
  "application_events",
] as const satisfies ReadonlyArray<keyof Database["public"]["Tables"]>;
