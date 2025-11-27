import { NextResponse } from "next/server";
import postgres from "postgres";

export async function GET() {
  try {
    const connectionString = process.env.DATABASE_URL;

    console.log("=== Database Connection Test ===");
    console.log("NODE_ENV:", process.env.NODE_ENV);
    console.log("DATABASE_URL exists:", !!connectionString);
    console.log(
      "DATABASE_URL prefix:",
      connectionString?.substring(0, 30) + "***"
    );
    console.log(
      "All env vars keys:",
      Object.keys(process.env).filter(
        (k) => k.includes("DATABASE") || k.includes("SUPABASE")
      )
    );

    if (!connectionString) {
      return NextResponse.json(
        {
          error: "DATABASE_URL not configured",
          debugInfo: {
            envVars: Object.keys(process.env).slice(0, 10),
          },
        },
        { status: 500 }
      );
    }

    const sql = postgres(connectionString);

    // Simple test query
    const result = await sql`SELECT NOW()`;

    await sql.end();

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      timestamp: result[0],
      environment: process.env.NODE_ENV,
    });
  } catch (error: any) {
    console.error("Database connection error:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Connection failed",
        errorCode: error.code,
        hint: "Check DATABASE_URL in Vercel environment variables",
        suggestion:
          error.code === "ENOTFOUND"
            ? "DNS resolution failed - verify DATABASE_URL is set correctly in Vercel"
            : "Connection failed - check database is accessible",
      },
      { status: 500 }
    );
  }
}
