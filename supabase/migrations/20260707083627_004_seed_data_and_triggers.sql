/*
# DMS Seed Data

## Overview
Default data for document types and categories. This provides the foundation
for the document management system.

## Data Created
1. Default document types (Policy, Procedure, Form, Report, etc.)
2. Default categories (Administration, Finance, HR, IT, etc.)
3. Default system settings

## Notes
- Admin user must be created through Supabase Auth
- Profile will be auto-created via trigger when user signs up
- Default profile is inactive until admin approval
*/

-- ============================================================================
-- DEFAULT DOCUMENT TYPES
-- ============================================================================

INSERT INTO document_types (name, description, icon, is_active) VALUES
    ('Policy', 'นโยบาย', 'file-text', true),
    ('Procedure', 'ขั้นตอนการปฏิบัติงาน', 'list-checks', true),
    ('Form', 'แบบฟอร์ม', 'file-input', true),
    ('Report', 'รายงาน', 'bar-chart', true),
    ('Contract', 'สัญญา', 'scroll-text', true),
    ('Purchase Order', 'ใบสั่งซื้อ', 'shopping-cart', true),
    ('Invoice', 'ใบแจ้งหนี้', 'receipt', true),
    ('Manual', 'คู่มือ', 'book-open', true),
    ('Certificate', 'ใบรับรอง', 'award', true),
    ('Other', 'อื่นๆ', 'file', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- DEFAULT CATEGORIES
-- ============================================================================

INSERT INTO categories (name, description, level, sort_order, is_active) VALUES
    ('Administration', 'เอกสารด้านการบริหารจัดการ', 0, 1, true),
    ('Finance', 'เอกสารด้านการเงินและบัญชี', 0, 2, true),
    ('HR', 'เอกสารด้านทรัพยากรบุคคล', 0, 3, true),
    ('IT', 'เอกสารด้านเทคโนโลยีสารสนเทศ', 0, 4, true),
    ('Purchase', 'เอกสารด้านจัดซื้อจัดจ้าง', 0, 5, true),
    ('Operation', 'เอกสารด้านการดำเนินงาน', 0, 6, true),
    ('Legal', 'เอกสารด้านกฎหมาย', 0, 7, true),
    ('ISO / Compliance', 'เอกสารด้านมาตรฐานและการปฏิบัติตามกฎระเบียบ', 0, 8, true);

-- ============================================================================
-- DEFAULT SYSTEM SETTINGS
-- ============================================================================

INSERT INTO system_settings (key, value, is_secret) VALUES
    ('app_name', '"DMS - Document Management System"', false),
    ('department_name', '"Document Management Department"', false),
    ('max_upload_size', '52428800', false), -- 50MB in bytes
    ('allowed_file_types', '["pdf","doc","docx","xls","xlsx","ppt","pptx","jpg","jpeg","png","gif","txt","rtf"]', false),
    ('default_confidentiality', '"department"', false),
    ('public_link_mode_enabled', 'false', false),
    ('access_request_enabled', 'true', false),
    ('workflow_enabled', 'true', false),
    ('google_drive_configured', 'false', false)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- AUTO-CREATE PROFILE TRIGGER
-- Creates profile automatically when user signs up via Supabase Auth
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, is_active, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'user',
        false, -- New users start inactive
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- AUDIT LOG TRIGGER FOR PROFILES
-- Logs when a profile's role or is_active changes
-- ============================================================================

CREATE OR REPLACE FUNCTION log_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Log role changes
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        INSERT INTO audit_logs (user_id, action, result, details)
        VALUES (
            NEW.id,
            'profile_role_change',
            'success',
            jsonb_build_object(
                'old_role', OLD.role,
                'new_role', NEW.role
            )
        );
    END IF;

    -- Log is_active changes
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
        INSERT INTO audit_logs (user_id, action, result, details)
        VALUES (
            NEW.id,
            'profile_status_change',
            'success',
            jsonb_build_object(
                'old_status', OLD.is_active,
                'new_status', NEW.is_active
            )
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_update ON profiles;
CREATE TRIGGER on_profile_update
    AFTER UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION log_profile_update();

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_document_types_updated_at ON document_types;
CREATE TRIGGER update_document_types_updated_at
    BEFORE UPDATE ON document_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
