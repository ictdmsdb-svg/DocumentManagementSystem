/**
 * Document Check-in Edge Function
 *
 * Securely checks in a document after editing.
 * SECURITY: Permission is verified server-side.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

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

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile?.is_active) {
      throw new Error("User account is not active");
    }

    // Parse request
    const body = await req.json();
    const { document_id } = body;

    if (!document_id) {
      throw new Error("Document ID required");
    }

    // Get document
    const { data: document, error: docError } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("id", document_id)
      .single();

    if (docError || !document) {
      throw new Error("Document not found");
    }

    const isAdmin = profile.role === "admin";

    // Check if document is checked out
    if (!document.checked_out_by) {
      throw new Error("Document is not checked out");
    }

    // Check if user can check in (must be checkout owner or admin)
    if (document.checked_out_by !== user.id && !isAdmin) {
      throw new Error("Only the user who checked out the document or an admin can check it in");
    }

    // Perform check-in
    const { error: updateError } = await supabaseAdmin
      .from("documents")
      .update({
        checked_out_by: null,
        checked_out_at: null,
      })
      .eq("id", document_id);

    if (updateError) {
      throw new Error("Failed to check in document");
    }

    // Log action
    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id,
      document_id,
      action: "document_checkin",
      result: "success",
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Check-in error:", error);

    return new Response(
      JSON.stringify({ error: error.message || "Failed to check in document" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
