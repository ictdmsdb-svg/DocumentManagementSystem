/*
# DMS RLS Helper Functions

## Overview
SQL helper functions to support Row Level Security policies. These functions
provide reusable permission checking logic that can be used in RLS policies
and server-side code.

## Functions Created
1. current_profile_id() - Returns auth.uid() wrapped for convenience
2. current_user_role() - Returns the current user's role
3. is_admin() - Checks if current user is an active admin
4. is_active_user() - Checks if current user has an active profile
5. has_document_permission(doc_id, permission) - Core permission check
6. can_view_document(doc_id) - Check if user can view a document
7. can_download_document(doc_id) - Check if user can download
8. can_edit_document_metadata(doc_id) - Check if user can edit metadata
9. can_upload_new_version(doc_id) - Check if user can upload new version
10. can_manage_document_permissions(doc_id) - Check if user can manage permissions

## Security Notes
- Functions use SECURITY DEFINER for elevated permission checks
- Admin role bypasses most permission checks (by design)
- Document creator gets implicit permissions (by design)
- Public internal documents are viewable by active users
*/

-- ============================================================================
-- SECURITY HELPER FUNCTIONS
-- ============================================================================

-- Get current authenticated user ID
CREATE OR REPLACE FUNCTION current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
SELECT auth.uid();
$$;

-- Get current user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Check if current user is an active admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = true
);
$$;

-- Check if current user is active
CREATE OR REPLACE FUNCTION is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_active = true
);
$$;

-- Core permission check function
CREATE OR REPLACE FUNCTION has_document_permission(
    doc_id uuid,
    permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
SELECT
    -- Admin has all permissions
    is_admin()
    OR
    -- User has explicit permission on this document
    EXISTS (
        SELECT 1 FROM document_permissions
        WHERE document_id = doc_id
        AND permission_type = permission
        AND (
            user_id = auth.uid()
            OR role = (SELECT role FROM profiles WHERE id = auth.uid())
        )
    );
$$;

-- Check if user can view a document
CREATE OR REPLACE FUNCTION can_view_document(doc_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
SELECT
    -- Admin can view all
    is_admin()
    OR
    -- Document creator can view their own documents
    EXISTS (SELECT 1 FROM documents WHERE id = doc_id AND created_by = auth.uid())
    OR
    -- User has explicit view permission
    has_document_permission(doc_id, 'view')
    OR
    -- Public internal documents are viewable by all active users
    (
        EXISTS (
            SELECT 1 FROM documents
            WHERE id = doc_id
            AND confidentiality_level = 'public_internal'
            AND status IN ('active', 'approved')
            AND is_archived = false
        )
        AND is_active_user()
    );
$$;

-- Check if user can download a document
CREATE OR REPLACE FUNCTION can_download_document(doc_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
SELECT
    is_admin()
    OR has_document_permission(doc_id, 'download');
$$;

-- Check if user can edit document metadata
CREATE OR REPLACE FUNCTION can_edit_document_metadata(doc_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
SELECT
    is_admin()
    OR has_document_permission(doc_id, 'edit_metadata');
$$;

-- Check if user can upload new version
-- Must have permission AND document not checked out by another user
CREATE OR REPLACE FUNCTION can_upload_new_version(doc_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
SELECT
    is_admin()
    OR
    (
        has_document_permission(doc_id, 'upload_new_version')
        AND NOT EXISTS (
            SELECT 1 FROM documents
            WHERE id = doc_id
            AND checked_out_by IS NOT NULL
            AND checked_out_by != auth.uid()
        )
    );
$$;

-- Check if user can manage document permissions
CREATE OR REPLACE FUNCTION can_manage_document_permissions(doc_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
SELECT
    is_admin()
    OR has_document_permission(doc_id, 'manage_permissions');
$$;

-- Check if user can delete a document
CREATE OR REPLACE FUNCTION can_delete_document(doc_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
SELECT
    is_admin()
    OR has_document_permission(doc_id, 'delete');
$$;

-- Check if user can check out a document
CREATE OR REPLACE FUNCTION can_check_out_document(doc_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
SELECT
    is_admin()
    OR has_document_permission(doc_id, 'check_out');
$$;

-- Check if user can check in a document
-- Only checkout owner or admin can check in
CREATE OR REPLACE FUNCTION can_check_in_document(doc_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
SELECT
    is_admin()
    OR
    (
        has_document_permission(doc_id, 'check_in')
        AND EXISTS (
            SELECT 1 FROM documents
            WHERE id = doc_id
            AND (checked_out_by = auth.uid() OR checked_out_by IS NULL)
        )
    )
    OR
    -- Checkout owner can always check in
    EXISTS (
        SELECT 1 FROM documents
        WHERE id = doc_id
        AND checked_out_by = auth.uid()
    );
$$;
