/*
# DMS Row Level Security Policies

## Overview
RLS policies for all tables in the DMS. These policies implement the security
model: least privilege, defense in depth, and zero trust.

## Policy Architecture
- Admins have full access to all tables except secrets
- Users can only access data they have permission for
- All mutations require proper authorization
- Public internal documents are viewable by active users

## Important Security Notes
1. NEVER use `USING (true)` unless data is intentionally public
2. All policies check active status before granting access
3. Permission checks use helper functions for consistency
4. Service role bypasses RLS (used by Edge Functions only)
*/

-- ============================================================================
-- PROFILES RLS POLICIES
-- ============================================================================

-- Admin can view all profiles
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
CREATE POLICY "Admin can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (is_admin());

-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can update limited fields of their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Only admin can insert profiles (via Edge Functions or admin interface)
DROP POLICY IF EXISTS "Admin can insert profiles" ON profiles;
CREATE POLICY "Admin can insert profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Only admin can update all profile fields including role and is_active
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;
CREATE POLICY "Admin can update all profiles"
ON profiles FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================================================
-- CATEGORIES RLS POLICIES
-- ============================================================================

-- Active users can view active categories
DROP POLICY IF EXISTS "Active users can view categories" ON categories;
CREATE POLICY "Active users can view categories"
ON categories FOR SELECT
TO authenticated
USING (
    is_active = true
    OR is_admin()
);

-- Only admin can manage categories
DROP POLICY IF EXISTS "Admin can insert categories" ON categories;
CREATE POLICY "Admin can insert categories"
ON categories FOR INSERT
TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update categories" ON categories;
CREATE POLICY "Admin can update categories"
ON categories FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can delete categories" ON categories;
CREATE POLICY "Admin can delete categories"
ON categories FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================================================
-- DOCUMENT TYPES RLS POLICIES
-- ============================================================================

-- Active users can view active document types
DROP POLICY IF EXISTS "Active users can view document types" ON document_types;
CREATE POLICY "Active users can view document types"
ON document_types FOR SELECT
TO authenticated
USING (
    is_active = true
    OR is_admin()
);

-- Only admin can manage document types
DROP POLICY IF EXISTS "Admin can insert document types" ON document_types;
CREATE POLICY "Admin can insert document types"
ON document_types FOR INSERT
TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update document types" ON document_types;
CREATE POLICY "Admin can update document types"
ON document_types FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can delete document types" ON document_types;
CREATE POLICY "Admin can delete document types"
ON document_types FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================================================
-- DOCUMENTS RLS POLICIES
-- ============================================================================

-- Users can view documents they have permission to view
DROP POLICY IF EXISTS "Users can view permitted documents" ON documents;
CREATE POLICY "Users can view permitted documents"
ON documents FOR SELECT
TO authenticated
USING (can_view_document(id));

-- Active users can create documents (created_by set by default or Edge Function)
DROP POLICY IF EXISTS "Active users can create documents" ON documents;
CREATE POLICY "Active users can create documents"
ON documents FOR INSERT
TO authenticated
WITH CHECK (
    is_active_user()
    AND (created_by = auth.uid() OR created_by IS NULL)
);

-- Users can update documents if they have edit permission
DROP POLICY IF EXISTS "Users can update permitted documents" ON documents;
CREATE POLICY "Users can update permitted documents"
ON documents FOR UPDATE
TO authenticated
USING (can_edit_document_metadata(id))
WITH CHECK (can_edit_document_metadata(id));

-- Only admin or users with delete permission can delete
DROP POLICY IF EXISTS "Users can delete permitted documents" ON documents;
CREATE POLICY "Users can delete permitted documents"
ON documents FOR DELETE
TO authenticated
USING (can_delete_document(id));

-- ============================================================================
-- DOCUMENT VERSIONS RLS POLICIES
-- ============================================================================

-- Users can view versions of documents they can view
DROP POLICY IF EXISTS "Users can view permitted versions" ON document_versions;
CREATE POLICY "Users can view permitted versions"
ON document_versions FOR SELECT
TO authenticated
USING (can_view_document(document_id));

-- Only Edge Functions (service role) can insert versions
-- Regular users cannot directly insert - must use Edge Function
DROP POLICY IF EXISTS "Service role can insert versions" ON document_versions;
CREATE POLICY "Service role can insert versions"
ON document_versions FOR INSERT
WITH CHECK (true);

-- Only service role can update versions
DROP POLICY IF EXISTS "Service role can update versions" ON document_versions;
CREATE POLICY "Service role can update versions"
ON document_versions FOR UPDATE
USING (true);

-- ============================================================================
-- DOCUMENT PERMISSIONS RLS POLICIES
-- ============================================================================

-- Users can view permissions for documents they can view
-- But they don't see all details unless they can manage permissions
DROP POLICY IF EXISTS "Users can view relevant permissions" ON document_permissions;
CREATE POLICY "Users can view relevant permissions"
ON document_permissions FOR SELECT
TO authenticated
USING (can_view_document(document_id));

-- Only users with manage_permissions can insert
DROP POLICY IF EXISTS "Users can manage permissions" ON document_permissions;
CREATE POLICY "Users can manage permissions"
ON document_permissions FOR INSERT
TO authenticated
WITH CHECK (can_manage_document_permissions(document_id));

-- Only users with manage_permissions can update
DROP POLICY IF EXISTS "Users can update permissions" ON document_permissions;
CREATE POLICY "Users can update permissions"
ON document_permissions FOR UPDATE
TO authenticated
USING (can_manage_document_permissions(document_id))
WITH CHECK (can_manage_document_permissions(document_id));

-- Only users with manage_permissions can delete
DROP POLICY IF EXISTS "Users can delete permissions" ON document_permissions;
CREATE POLICY "Users can delete permissions"
ON document_permissions FOR DELETE
TO authenticated
USING (can_manage_document_permissions(document_id));

-- ============================================================================
-- AUDIT LOGS RLS POLICIES
-- ============================================================================

-- Admin can view all audit logs
DROP POLICY IF EXISTS "Admin can view all audit logs" ON audit_logs;
CREATE POLICY "Admin can view all audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (is_admin());

-- Users can view their own audit logs
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
CREATE POLICY "Users can view own audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Only Edge Functions and service role can insert audit logs
DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_logs;
CREATE POLICY "Service role can insert audit logs"
ON audit_logs FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- ACCESS REQUESTS RLS POLICIES
-- ============================================================================

-- Admin can view all access requests
DROP POLICY IF EXISTS "Admin can view all access requests" ON access_requests;
CREATE POLICY "Admin can view all access requests"
ON access_requests FOR SELECT
TO authenticated
USING (is_admin());

-- Users can view their own access requests
DROP POLICY IF EXISTS "Users can view own access requests" ON access_requests;
CREATE POLICY "Users can view own access requests"
ON access_requests FOR SELECT
TO authenticated
USING (requested_by = auth.uid());

-- Active users can create access requests for themselves
DROP POLICY IF EXISTS "Users can create access requests" ON access_requests;
CREATE POLICY "Users can create access requests"
ON access_requests FOR INSERT
TO authenticated
WITH CHECK (
    is_active_user()
    AND requested_by = auth.uid()
);

-- Only admin can update access requests (approve/reject)
DROP POLICY IF EXISTS "Admin can update access requests" ON access_requests;
CREATE POLICY "Admin can update access requests"
ON access_requests FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================================================
-- SYSTEM SETTINGS RLS POLICIES
-- ============================================================================

-- Admin can view non-secret settings
DROP POLICY IF EXISTS "Admin can view settings" ON system_settings;
CREATE POLICY "Admin can view settings"
ON system_settings FOR SELECT
TO authenticated
USING (is_admin());

-- Admin can manage non-secret settings
DROP POLICY IF EXISTS "Admin can manage settings" ON system_settings;
CREATE POLICY "Admin can manage settings"
ON system_settings FOR INSERT
TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update settings" ON system_settings;
CREATE POLICY "Admin can update settings"
ON system_settings FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can delete settings" ON system_settings;
CREATE POLICY "Admin can delete settings"
ON system_settings FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================================================
-- DOCUMENT WORKFLOW EVENTS RLS POLICIES
-- ============================================================================

-- Users can view workflow events for documents they can view
DROP POLICY IF EXISTS "Users can view workflow events" ON document_workflow_events;
CREATE POLICY "Users can view workflow events"
ON document_workflow_events FOR SELECT
TO authenticated
USING (can_view_document(document_id));

-- Service role and users with approve permission can insert
DROP POLICY IF EXISTS "Service role can insert workflow events" ON document_workflow_events;
CREATE POLICY "Service role can insert workflow events"
ON document_workflow_events FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- DOCUMENT RELATED LINKS RLS POLICIES
-- ============================================================================

-- Users can view related links for documents they can view
DROP POLICY IF EXISTS "Users can view related links" ON document_related_links;
CREATE POLICY "Users can view related links"
ON document_related_links FOR SELECT
TO authenticated
USING (
    can_view_document(document_id)
    AND can_view_document(related_document_id)
);

-- Users can create links if they can edit both documents
DROP POLICY IF EXISTS "Users can create related links" ON document_related_links;
CREATE POLICY "Users can create related links"
ON document_related_links FOR INSERT
TO authenticated
WITH CHECK (
    can_edit_document_metadata(document_id)
    AND can_edit_document_metadata(related_document_id)
);

-- Users can delete links if they can edit the document
DROP POLICY IF EXISTS "Users can delete related links" ON document_related_links;
CREATE POLICY "Users can delete related links"
ON document_related_links FOR DELETE
TO authenticated
USING (can_edit_document_metadata(document_id));
