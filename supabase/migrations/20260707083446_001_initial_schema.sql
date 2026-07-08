/*
# DMS Initial Schema - Core Tables

## Overview
This migration creates the foundational tables for the Document Management System (DMS),
a secure enterprise-grade document management platform. Security is the highest priority.

## Tables Created
1. `profiles` - User profile information linked to Supabase auth.users
2. `categories` - Hierarchical document organization structure
3. `document_types` - Document type definitions (Policy, Procedure, Form, etc.)
4. `documents` - Core document metadata (no actual files stored here)
5. `document_versions` - Version history for each document
6. `document_permissions` - Fine-grained document access control
7. `audit_logs` - Comprehensive audit trail for all actions
8. `access_requests` - User requests for document access
9. `system_settings` - System configuration (non-secret settings only)
10. `document_workflow_events` - Document status change history
11. `document_related_links` - Cross-document relationships

## Security Architecture
- RLS enabled on ALL tables (no exceptions)
- SQL helper functions for permission checks
- Server-side Edge Functions verify permissions before Google Drive operations
- Audit logs for all access and mutations
- User profiles default to inactive until admin approval
- Admin role has full access by default

## Important Notes
1. Never store actual secrets in system_settings - use Edge Function secrets
2. All file operations go through Edge Functions that verify permissions
3. The frontend never has direct access to Google Drive credentials
4. Files are private by default - no "anyone with link" access
5. All sensitive operations require server-side verification
*/

-- ============================================================================
-- PROFILES TABLE
-- Stores user information linked to Supabase auth
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    email text UNIQUE NOT NULL,
    role text NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
    department text,
    position text,
    avatar_url text,
    is_active boolean DEFAULT false,
    last_login_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- ============================================================================
-- CATEGORIES TABLE
-- Hierarchical folder structure for document organization
-- ============================================================================
CREATE TABLE IF NOT EXISTS categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
    level int DEFAULT 0,
    path text,
    sort_order int DEFAULT 0,
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES profiles(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_path ON categories(path);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- ============================================================================
-- DOCUMENT TYPES TABLE
-- Predefined document types (Policy, Procedure, Form, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    icon text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- DOCUMENTS TABLE
-- Core document metadata - actual files stored in Google Drive
-- ============================================================================
CREATE TABLE IF NOT EXISTS documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    category_id uuid REFERENCES categories(id),
    document_type_id uuid REFERENCES document_types(id),
    department text,
    confidentiality_level text CHECK (confidentiality_level IN ('public_internal', 'department', 'confidential', 'restricted')) DEFAULT 'department',
    status text CHECK (status IN ('draft', 'active', 'under_review', 'approved', 'rejected', 'archived')) DEFAULT 'active',
    tags text[] DEFAULT '{}',
    current_version_id uuid,
    checked_out_by uuid REFERENCES profiles(id),
    checked_out_at timestamptz,
    created_by uuid REFERENCES profiles(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    effective_date date,
    expiry_date date,
    is_archived boolean DEFAULT false,
    archived_by uuid REFERENCES profiles(id),
    archived_at timestamptz,
    deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);
CREATE INDEX IF NOT EXISTS idx_documents_category_id ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_document_type_id ON documents(document_type_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_confidentiality_level ON documents(confidentiality_level);
CREATE INDEX IF NOT EXISTS idx_documents_is_archived ON documents(is_archived);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);

-- ============================================================================
-- DOCUMENT VERSIONS TABLE
-- Version history for each document
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number int NOT NULL,
    file_name text NOT NULL,
    original_file_name text,
    sanitized_file_name text,
    file_extension text,
    mime_type text,
    file_size bigint,
    google_drive_file_id text NOT NULL,
    google_drive_web_view_link text,
    google_drive_web_content_link text,
    checksum text,
    version_note text,
    uploaded_by uuid REFERENCES profiles(id),
    uploaded_at timestamptz DEFAULT now(),
    is_current boolean DEFAULT false,
    CONSTRAINT unique_document_version UNIQUE (document_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_google_drive_file_id ON document_versions(google_drive_file_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_is_current ON document_versions(is_current);
CREATE INDEX IF NOT EXISTS idx_document_versions_uploaded_by ON document_versions(uploaded_by);

-- Set current_version_id foreign key after document_versions exists
ALTER TABLE documents
ADD CONSTRAINT fk_documents_current_version_id
FOREIGN KEY (current_version_id) REFERENCES document_versions(id);

-- ============================================================================
-- DOCUMENT PERMISSIONS TABLE
-- Fine-grained access control per document
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    role text CHECK (role IN ('admin', 'user')),
    permission_type text NOT NULL CHECK (permission_type IN (
        'view',
        'download',
        'edit_metadata',
        'upload_new_version',
        'delete',
        'approve',
        'check_out',
        'check_in',
        'manage_permissions'
    )),
    granted_by uuid REFERENCES profiles(id),
    granted_at timestamptz DEFAULT now(),
    CONSTRAINT check_user_or_role CHECK (user_id IS NOT NULL OR role IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_document_permissions_document_id ON document_permissions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_user_id ON document_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_role ON document_permissions(role);
CREATE INDEX IF NOT EXISTS idx_document_permissions_permission_type ON document_permissions(permission_type);

-- ============================================================================
-- AUDIT LOGS TABLE
-- Comprehensive audit trail for all actions
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id),
    document_id uuid REFERENCES documents(id),
    action text NOT NULL,
    result text CHECK (result IN ('success', 'failed', 'denied')) DEFAULT 'success',
    details jsonb,
    ip_address text,
    user_agent text,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_document_id ON audit_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- ACCESS REQUESTS TABLE
-- User requests for document access
-- ============================================================================
CREATE TABLE IF NOT EXISTS access_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
    requested_by uuid REFERENCES profiles(id),
    requested_permission text CHECK (requested_permission IN (
        'view',
        'download',
        'edit_metadata',
        'upload_new_version'
    )),
    reason text,
    status text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    reviewed_by uuid REFERENCES profiles(id),
    reviewed_at timestamptz,
    review_comment text,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_requests_document_id ON access_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_requested_by ON access_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);

-- ============================================================================
-- SYSTEM SETTINGS TABLE
-- Non-secret configuration only - use Edge Function secrets for real secrets
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text UNIQUE NOT NULL,
    value jsonb,
    is_secret boolean DEFAULT false,
    updated_by uuid REFERENCES profiles(id),
    updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- DOCUMENT WORKFLOW EVENTS TABLE
-- Status change history for documents
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_workflow_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
    from_status text,
    to_status text,
    comment text,
    acted_by uuid REFERENCES profiles(id),
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_workflow_events_document_id ON document_workflow_events(document_id);

-- ============================================================================
-- DOCUMENT RELATED LINKS TABLE
-- Cross-document relationships
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_related_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
    related_document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
    relation_type text DEFAULT 'related',
    created_by uuid REFERENCES profiles(id),
    created_at timestamptz DEFAULT now(),
    CONSTRAINT no_self_reference CHECK (document_id != related_document_id)
);

CREATE INDEX IF NOT EXISTS idx_document_related_links_document_id ON document_related_links(document_id);
CREATE INDEX IF NOT EXISTS idx_document_related_links_related_document_id ON document_related_links(related_document_id);

-- ============================================================================
-- ROW LEVEL SECURITY - ENABLE ON ALL TABLES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_workflow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_related_links ENABLE ROW LEVEL SECURITY;
