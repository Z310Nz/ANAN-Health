import { NextResponse } from "next/server";

export async function GET() {
  try {
    // ใช้ Supabase REST API แทน direct database connection
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log("=== Supabase REST API Test ===");
    console.log("SUPABASE_URL exists:", !!supabaseUrl);
    console.log("SUPABASE_ANON_KEY exists:", !!supabaseAnonKey);

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        {
          error: "Supabase environment variables not configured",
          hint: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
        },
        { status: 500 }
      );
    }

    // Test query using REST API - query rider table instead of RPC
    const url = `${supabaseUrl}/rest/v1/rider?select=*&limit=1`;
    console.log("Fetching from:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    }).catch((err) => {
      console.error("Fetch error:", err);
      throw err;
    });

    console.log("Response status:", response.status);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Response body:", errorBody);
      throw new Error(
        `HTTP ${response.status}: ${response.statusText} - ${errorBody}`
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: "Supabase REST API connection successful",
      dataCount: data.length,
      sampleData: data.slice(0, 1),
      environment: process.env.NODE_ENV,
    });
  } catch (error: any) {
    console.error("Connection error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Connection failed",
        errorCode: error.code,
        hint: "Ensure Supabase API keys are set and table 'rider' exists",
      },
      { status: 500 }
    );
  }
}
