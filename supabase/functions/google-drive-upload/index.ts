/**
 * Google Drive Upload Edge Function
 *
 * This function handles secure file uploads to Google Drive.
 * SECURITY: Never expose Google credentials to the frontend.
 * All uploads must go through this server-side function.
 *
 * Features:
 * - JWT verification
 * - User activity check
 * - File validation (size, type, extension)
 * - Filename sanitization
 * - Google Drive file upload
 * - Database metadata storage
 * - Initial permission assignment
 * - Audit logging
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { JWT } from "npm:google-auth-library@9";
import { GoogleAuth } from "npm:google-auth-library@9";
import { normalize } from "npm:path";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/rtf",
];
const BLOCKED_EXTENSIONS = [
  "exe", "bat", "cmd", "com", "pif", "scr", "vbs", "js", "jar", "msi", "sh", "ps1", "app", "deb", "rpm",
];

interface UploadMetadata {
  title: string;
  description?: string;
  category_id?: string;
  document_type_id?: string;
  department?: string;
  confidentiality_level?: 'public_internal' | 'department' | 'confidential' | 'restricted';
  effective_date?: string;
  expiry_date?: string;
  version_note?: string;
  tags?: string[];
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Verify environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const googleClientEmail = Deno.env.get("GOOGLE_CLIENT_EMAIL");
    const googlePrivateKeyRaw = Deno.env.get("GOOGLE_PRIVATE_KEY");
    const googleDriveFolderId = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID");
    console.log({
  hasClientEmail: !!googleClientEmail,
  hasPrivateKey: !!googlePrivateKeyRaw,
  hasFolderId: !!googleDriveFolderId,
});
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    if (!googleClientEmail || !googlePrivateKeyRaw || !googleDriveFolderId) {
      throw new Error("Google Drive not configured. Please set up Edge Function secrets.");
    }

    // Handle probe request for configuration check
    const contentType = req.headers.get("Content-Type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (body._probe) {
        return new Response(
          JSON.stringify({ configured: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Normalize private key (handle \\n to \n conversion)
    const googlePrivateKey = googlePrivateKeyRaw.replace(/\\n/g, "\n");

    // Extract JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Missing authorization token");
    }
    const token = authHeader.replace("Bearer ", "");

    // Create Supabase clients
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Invalid or expired token");
    }

    // Get user profile and verify active status
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      throw new Error("User profile not found");
    }

    if (!profile.is_active) {
      throw new Error("User account is not active");
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const metadataStr = formData.get("metadata") as string | null;

    if (!file) {
      throw new Error("No file provided");
    }

    if (!metadataStr) {
      throw new Error("No metadata provided");
    }

    let metadata: UploadMetadata;
    try {
      metadata = JSON.parse(metadataStr);
    } catch {
      throw new Error("Invalid metadata format");
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }

    // Get file extension and validate
    const originalFileName = file.name;
    const extension = originalFileName.split(".").pop()?.toLowerCase() || "";
    if (BLOCKED_EXTENSIONS.includes(extension)) {
      throw new Error(`File extension .${extension} is not allowed for security reasons`);
    }

    // Sanitize filename
    const sanitizeFileName = (name: string): string => {
      // Remove path traversal
      let sanitized = name.replace(/\.\./g, "");
      // Remove special characters except letters, numbers, Thai, dot, dash, underscore
      sanitized = sanitized.replace(/[^a-zA-Z0-9.\-_\u0E00-\u0E7F]/g, "_");
      // Remove multiple underscores
      sanitized = sanitized.replace(/_+/g, "_");
      return sanitized;
    };

    const sanitizedName = sanitizeFileName(originalFileName);

    // Read file content
    const fileBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(fileBuffer);

    // ========================================
    // Upload to Google Drive
    // ========================================

    // Create access token using JWT
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      iss: googleClientEmail,
      sub: googleClientEmail,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      scope: "https://www.googleapis.com/auth/drive.file",
    };

    const jwt = new JWT({
      email: googleClientEmail,
      key: googlePrivateKey,
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });

    const accessToken = await jwt.request({
      url: "https://oauth2.googleapis.com/token",
      method: "POST",
      data: {
        grant_type: "urn:ietf(params:oauth):grant-type:jwt-bearer",
        assertion: await jwt.encodeJWT(jwtPayload),
      },
    });

    // Alternative: Use OAuth2 client directly
    const auth = new GoogleAuth({
      credentials: {
        client_email: googleClientEmail,
        private_key: googlePrivateKey,
      },
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });

    const authClient = await auth.getClient();
    const { token } = await authClient.getAccessToken();

    if (!token) {
      throw new Error("Failed to obtain Google access token");
    }

    // Upload file to Google Drive using resumable upload
    const metadataFileName = `doc_${Date.now()}_${sanitizedName}`;

    // Initiate resumable upload
    const initiateResponse = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: metadataFileName,
          parents: [googleDriveFolderId],
          mimeType: file.type,
        }),
      }
    );

    if (!initiateResponse.ok) {
      const errorText = await initiateResponse.text();
      console.error("Google Drive initiate upload error:", errorText);
      throw new Error("Failed to initiate Google Drive upload");
    }

    const uploadUrl = initiateResponse.headers.get("Location");
    if (!uploadUrl) {
      throw new Error("Failed to get upload URL");
    }

    // Upload file content
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": file.type,
        "Content-Length": file.size.toString(),
      },
      body: fileData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Google Drive upload error:", errorText);
      throw new Error("Failed to upload file to Google Drive");
    }

    const googleFile = await uploadResponse.json();
    const googleDriveFileId = googleFile.id;

    // Get web view link
    const fileMetaResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${googleDriveFileId}?fields=webViewLink,webContentLink`,
      {
        headers: { "Authorization": `Bearer ${token}` },
      }
    );

    const googleFileMeta = await fileMetaResponse.json();

    // ========================================
    // Save to Database
    // ========================================

    // Create document record
    const { data: document, error: docError } = await supabaseAdmin
      .from("documents")
      .insert({
        title: metadata.title,
        description: metadata.description || null,
        category_id: metadata.category_id || null,
        document_type_id: metadata.document_type_id || null,
        department: metadata.department || null,
        confidentiality_level: metadata.confidentiality_level || "department",
        status: "active",
        tags: metadata.tags || [],
        created_by: user.id,
        effective_date: metadata.effective_date || null,
        expiry_date: metadata.expiry_date || null,
      })
      .select()
      .single();

    if (docError) {
      // Attempt to delete uploaded file from Google Drive
      await fetch(
        `https://www.googleapis.com/drive/v3/files/${googleDriveFileId}`,
        {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` },
        }
      );
      throw new Error(`Failed to create document: ${docError.message}`);
    }

    // Create document version
    const { data: version, error: versionError } = await supabaseAdmin
      .from("document_versions")
      .insert({
        document_id: document.id,
        version_number: 1,
        file_name: metadataFileName,
        original_file_name: originalFileName,
        sanitized_file_name: sanitizedName,
        file_extension: extension,
        mime_type: file.type,
        file_size: file.size,
        google_drive_file_id: googleDriveFileId,
        google_drive_web_view_link: googleFileMeta.webViewLink || null,
        google_drive_web_content_link: googleFileMeta.webContentLink || null,
        version_note: metadata.version_note || null,
        uploaded_by: user.id,
        is_current: true,
      })
      .select()
      .single();

    if (versionError) {
      // Cleanup: Delete document and Google Drive file
      await supabaseAdmin.from("documents").delete().eq("id", document.id);
      await fetch(
        `https://www.googleapis.com/drive/v3/files/${googleDriveFileId}`,
        {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` },
        }
      );
      throw new Error(`Failed to create version: ${versionError.message}`);
    }

    // Update document with current_version_id
    await supabaseAdmin
      .from("documents")
      .update({ current_version_id: version.id })
      .eq("id", document.id);

    // Create initial permissions for creator and admin
    const creatorPermissions = [
      "view",
      "download",
      "edit_metadata",
      "upload_new_version",
      "check_out",
      "check_in",
    ];

    const permissions = [
      // Creator permissions
      ...creatorPermissions.map((perm) => ({
        document_id: document.id,
        user_id: user.id,
        permission_type: perm,
        granted_by: user.id,
      })),
      // Admin role permissions (admin has full access anyway, but explicit is good)
      {
        document_id: document.id,
        role: "admin",
        permission_type: "view",
        granted_by: user.id,
      },
    ];

    await supabaseAdmin.from("document_permissions").insert(permissions);

    // Create audit log
    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id,
      document_id: document.id,
      action: "document_upload",
      result: "success",
      details: {
        file_name: originalFileName,
        file_size: file.size,
        mime_type: file.type,
        title: metadata.title,
        confidentiality: metadata.confidentiality_level || "department",
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        document_id: document.id,
        version_id: version.id,
        google_drive_file_id: googleDriveFileId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Upload error:", error);

    // Determine user-friendly error message
    let userMessage = "Upload failed. Please try again.";
    if (error.message.includes("not configured")) {
      userMessage = "Google Drive is not configured. Contact administrator.";
    } else if (error.message.includes("not active")) {
      userMessage = "Your account is not yet activated.";
    } else if (error.message.includes("exceeds limit")) {
      userMessage = error.message;
    } else if (error.message.includes("not allowed")) {
      userMessage = error.message;
    } else if (error.message.includes("Invalid or expired token")) {
      userMessage = "Session expired. Please log in again.";
    }

    return new Response(
      JSON.stringify({ error: userMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
