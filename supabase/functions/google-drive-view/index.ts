/**
 * Google Drive View Edge Function
 *
 * Securely provides document view access.
 * SECURITY: Frontend should never call Google Drive API directly.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { GoogleAuth } from "npm:google-auth-library@9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const googleClientEmail = Deno.env.get("GOOGLE_CLIENT_EMAIL");
    const googlePrivateKeyRaw = Deno.env.get("GOOGLE_PRIVATE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    if (!googleClientEmail || !googlePrivateKeyRaw) {
      throw new Error("Google Drive not configured");
    }

    const googlePrivateKey = googlePrivateKeyRaw.replace(/\\n/g, "\n");

    // Extract JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Missing authorization token");
    }
    const token = authHeader.replace("Bearer ", "");

    // Create clients
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Verify user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Invalid or expired token");
    }

    // Parse request
    const body = await req.json();
    const { document_id, version_id } = body;

    if (!document_id) {
      throw new Error("Document ID required");
    }

    // Check if user has view permission
    const { data: hasPermission } = await supabaseAdmin.rpc("can_view_document", {
      doc_id: document_id,
    });

    if (!hasPermission) {
      // Log unauthorized attempt
      await supabaseAdmin.from("audit_logs").insert({
        user_id: user.id,
        document_id,
        action: "document_view",
        result: "denied",
        details: { reason: "No view permission" },
      });
      throw new Error("You do not have permission to view this document");
    }

    // Get document and version
    const { data: document, error: docError } = await supabaseAdmin
      .from("documents")
      .select("*, current_version:document_versions!current_version_id(*)")
      .eq("id", document_id)
      .single();

    if (docError || !document) {
      throw new Error("Document not found");
    }

    // Get specific version if provided
    let version = document.current_version;
    if (version_id) {
      const { data: specificVersion } = await supabaseAdmin
        .from("document_versions")
        .select("*")
        .eq("id", version_id)
        .single();
      if (specificVersion) {
        version = specificVersion;
      }
    }

    if (!version?.google_drive_file_id) {
      throw new Error("Document version not found");
    }

    // Get Google access token
    const auth = new GoogleAuth({
      credentials: {
        client_email: googleClientEmail,
        private_key: googlePrivateKey,
      },
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });

    const authClient = await auth.getClient();
    const { token: accessToken } = await authClient.getAccessToken();

    if (!accessToken) {
      throw new Error("Failed to obtain Google access token");
    }

    // Get web view link from Google Drive
    const fileResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${version.google_drive_file_id}?fields=webViewLink,webContentLink`,
      {
        headers: { "Authorization": `Bearer ${accessToken}` },
      }
    );

    const fileData = await fileResponse.json();

    // Generate a preview URL (Google Drive viewer)
    // For PDFs and common formats, we can use the Google Drive viewer
    const viewUrl = fileData.webViewLink || `https://drive.google.com/file/d/${version.google_drive_file_id}/view`;

    // Log view action
    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id,
      document_id,
      action: "document_view",
      result: "success",
      details: {
        version_id: version.id,
        version_number: version.version_number,
        file_name: version.file_name,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        view_url: viewUrl,
        google_drive_file_id: version.google_drive_file_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("View error:", error);

    const userMessage = error.message.includes("permission")
      ? "You do not have permission to view this document"
      : error.message.includes("not configured")
      ? "Google Drive is not configured"
      : error.message.includes("expired")
      ? "Session expired. Please log in again."
      : "Unable to view document. Please try again.";

    return new Response(
      JSON.stringify({ error: userMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
