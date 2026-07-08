// Database Types for DMS - Document Management System

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      categories: {
        Row: Category;
        Insert: CategoryInsert;
        Update: CategoryUpdate;
      };
      document_types: {
        Row: DocumentType;
        Insert: DocumentTypeInsert;
        Update: DocumentTypeUpdate;
      };
      documents: {
        Row: Document;
        Insert: DocumentInsert;
        Update: DocumentUpdate;
      };
      document_versions: {
        Row: DocumentVersion;
        Insert: DocumentVersionInsert;
        Update: DocumentVersionUpdate;
      };
      document_permissions: {
        Row: DocumentPermission;
        Insert: DocumentPermissionInsert;
        Update: DocumentPermissionUpdate;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: AuditLogInsert;
        Update: never;
      };
      access_requests: {
        Row: AccessRequest;
        Insert: AccessRequestInsert;
        Update: AccessRequestUpdate;
      };
      system_settings: {
        Row: SystemSetting;
        Insert: SystemSettingInsert;
        Update: SystemSettingUpdate;
      };
      document_workflow_events: {
        Row: DocumentWorkflowEvent;
        Insert: DocumentWorkflowEventInsert;
        Update: never;
      };
      document_related_links: {
        Row: DocumentRelatedLink;
        Insert: DocumentRelatedLinkInsert;
        Update: never;
      };
    };
    Views: {};
    Functions: {
      current_profile_id: () => string | null;
      current_user_role: () => string | null;
      is_admin: () => boolean;
      is_active_user: () => boolean;
      has_document_permission: (doc_id: string, permission: string) => boolean;
      can_view_document: (doc_id: string) => boolean;
      can_download_document: (doc_id: string) => boolean;
      can_edit_document_metadata: (doc_id: string) => boolean;
      can_upload_new_version: (doc_id: string) => boolean;
      can_manage_document_permissions: (doc_id: string) => boolean;
    };
    Enums: {
      user_role: 'admin' | 'user';
      permission_type: 'view' | 'download' | 'edit_metadata' | 'upload_new_version' | 'delete' | 'approve' | 'check_out' | 'check_in' | 'manage_permissions';
      document_status: 'draft' | 'active' | 'under_review' | 'approved' | 'rejected' | 'archived';
      confidentiality_level: 'public_internal' | 'department' | 'confidential' | 'restricted';
      audit_result: 'success' | 'failed' | 'denied';
      access_request_status: 'pending' | 'approved' | 'rejected';
    };
  };
}

// Profile
export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  role: 'admin' | 'user';
  department: string | null;
  position: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id: string;
  full_name?: string | null;
  email: string;
  role?: 'admin' | 'user';
  department?: string | null;
  position?: string | null;
  avatar_url?: string | null;
  is_active?: boolean;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileUpdate {
  full_name?: string | null;
  department?: string | null;
  position?: string | null;
  avatar_url?: string | null;
  is_active?: boolean;
  last_login_at?: string | null;
  updated_at?: string;
}

// Category
export interface Category {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  level: number;
  path: string | null;
  sort_order: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryInsert {
  name: string;
  description?: string | null;
  parent_id?: string | null;
  level?: number;
  path?: string | null;
  sort_order?: number;
  is_active?: boolean;
  created_by?: string | null;
}

export interface CategoryUpdate {
  name?: string;
  description?: string | null;
  parent_id?: string | null;
  level?: number;
  path?: string | null;
  sort_order?: number;
  is_active?: boolean;
  updated_at?: string;
}

// Document Type
export interface DocumentType {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentTypeInsert {
  name: string;
  description?: string | null;
  icon?: string | null;
  is_active?: boolean;
}

export interface DocumentTypeUpdate {
  name?: string;
  description?: string | null;
  icon?: string | null;
  is_active?: boolean;
  updated_at?: string;
}

// Document
export interface Document {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  document_type_id: string | null;
  department: string | null;
  confidentiality_level: 'public_internal' | 'department' | 'confidential' | 'restricted';
  status: 'draft' | 'active' | 'under_review' | 'approved' | 'rejected' | 'archived';
  tags: string[];
  current_version_id: string | null;
  checked_out_by: string | null;
  checked_out_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  effective_date: string | null;
  expiry_date: string | null;
  is_archived: boolean;
  archived_by: string | null;
  archived_at: string | null;
  deleted_at: string | null;
}

export interface DocumentInsert {
  title: string;
  description?: string | null;
  category_id?: string | null;
  document_type_id?: string | null;
  department?: string | null;
  confidentiality_level?: 'public_internal' | 'department' | 'confidential' | 'restricted';
  status?: 'draft' | 'active' | 'under_review' | 'approved' | 'rejected' | 'archived';
  tags?: string[];
  current_version_id?: string | null;
  checked_out_by?: string | null;
  checked_out_at?: string | null;
  created_by?: string | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  is_archived?: boolean;
}

export interface DocumentUpdate {
  title?: string;
  description?: string | null;
  category_id?: string | null;
  document_type_id?: string | null;
  department?: string | null;
  confidentiality_level?: 'public_internal' | 'department' | 'confidential' | 'restricted';
  status?: 'draft' | 'active' | 'under_review' | 'approved' | 'rejected' | 'archived';
  tags?: string[];
  current_version_id?: string | null;
  checked_out_by?: string | null;
  checked_out_at?: string | null;
  effective_date?: string | null;
  expiry_date?: string | null;
  is_archived?: boolean;
  archived_by?: string | null;
  archived_at?: string | null;
  updated_at?: string;
}

// Document Version
export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_name: string;
  original_file_name: string | null;
  sanitized_file_name: string | null;
  file_extension: string | null;
  mime_type: string | null;
  file_size: number | null;
  google_drive_file_id: string;
  google_drive_web_view_link: string | null;
  google_drive_web_content_link: string | null;
  checksum: string | null;
  version_note: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  is_current: boolean;
}

export interface DocumentVersionInsert {
  document_id: string;
  version_number: number;
  file_name: string;
  original_file_name?: string | null;
  sanitized_file_name?: string | null;
  file_extension?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  google_drive_file_id: string;
  google_drive_web_view_link?: string | null;
  google_drive_web_content_link?: string | null;
  checksum?: string | null;
  version_note?: string | null;
  uploaded_by?: string | null;
  is_current?: boolean;
}

export interface DocumentVersionUpdate {
  is_current?: boolean;
}

// Document Permission
export interface DocumentPermission {
  id: string;
  document_id: string;
  user_id: string | null;
  role: 'admin' | 'user' | null;
  permission_type: 'view' | 'download' | 'edit_metadata' | 'upload_new_version' | 'delete' | 'approve' | 'check_out' | 'check_in' | 'manage_permissions';
  granted_by: string | null;
  granted_at: string;
}

export interface DocumentPermissionInsert {
  document_id: string;
  user_id?: string | null;
  role?: 'admin' | 'user' | null;
  permission_type: 'view' | 'download' | 'edit_metadata' | 'upload_new_version' | 'delete' | 'approve' | 'check_out' | 'check_in' | 'manage_permissions';
  granted_by?: string | null;
}

export interface DocumentPermissionUpdate {
  granted_by?: string | null;
}

// Audit Log
export interface AuditLog {
  id: string;
  user_id: string | null;
  document_id: string | null;
  action: string;
  result: 'success' | 'failed' | 'denied';
  details: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogInsert {
  user_id?: string | null;
  document_id?: string | null;
  action: string;
  result?: 'success' | 'failed' | 'denied';
  details?: Json | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

// Access Request
export interface AccessRequest {
  id: string;
  document_id: string;
  requested_by: string;
  requested_permission: 'view' | 'download' | 'edit_metadata' | 'upload_new_version';
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  created_at: string;
}

export interface AccessRequestInsert {
  document_id: string;
  requested_by: string;
  requested_permission: 'view' | 'download' | 'edit_metadata' | 'upload_new_version';
  reason?: string | null;
}

export interface AccessRequestUpdate {
  status?: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_comment?: string | null;
}

// System Setting
export interface SystemSetting {
  id: string;
  key: string;
  value: Json;
  is_secret: boolean;
  updated_by: string | null;
  updated_at: string;
}

export interface SystemSettingInsert {
  key: string;
  value: Json;
  is_secret?: boolean;
  updated_by?: string | null;
}

export interface SystemSettingUpdate {
  value?: Json;
  updated_by?: string | null;
  updated_at?: string;
}

// Document Workflow Event
export interface DocumentWorkflowEvent {
  id: string;
  document_id: string;
  from_status: string | null;
  to_status: string | null;
  comment: string | null;
  acted_by: string | null;
  created_at: string;
}

export interface DocumentWorkflowEventInsert {
  document_id: string;
  from_status?: string | null;
  to_status: string;
  comment?: string | null;
  acted_by?: string | null;
}

// Document Related Link
export interface DocumentRelatedLink {
  id: string;
  document_id: string;
  related_document_id: string;
  relation_type: string;
  created_by: string | null;
  created_at: string;
}

export interface DocumentRelatedLinkInsert {
  document_id: string;
  related_document_id: string;
  relation_type?: string;
  created_by?: string | null;
}

// Utility types for joined queries
export interface DocumentWithDetails extends Document {
  category?: Category | null;
  document_type?: DocumentType | null;
  creator?: Profile | null;
  current_version?: DocumentVersion | null;
  checked_out_by_profile?: Profile | null;
}

export interface AuditLogWithDetails extends AuditLog {
  user?: Profile | null;
  document?: Document | null;
}

export interface AccessRequestWithDetails extends AccessRequest {
  document?: Document | null;
  requester?: Profile | null;
  reviewer?: Profile | null;
}

export interface DocumentPermissionWithDetails extends DocumentPermission {
  user?: Profile | null;
}

// Permission Types for UI
export const PERMISSION_TYPES = [
  'view',
  'download',
  'edit_metadata',
  'upload_new_version',
  'delete',
  'approve',
  'check_out',
  'check_in',
  'manage_permissions',
] as const;

export const DOCUMENT_STATUSES = [
  'draft',
  'active',
  'under_review',
  'approved',
  'rejected',
  'archived',
] as const;

export const CONFIDENTIALITY_LEVELS = [
  'public_internal',
  'department',
  'confidential',
  'restricted',
] as const;

// File type restrictions
export const ALLOWED_FILE_TYPES = {
  pdf: ['application/pdf'],
  word: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  excel: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  powerpoint: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
  text: ['text/plain', 'text/rtf'],
} as const;

export const BLOCKED_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar', 'msi', 'sh', 'ps1', 'app', 'deb', 'rpm',
];

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
