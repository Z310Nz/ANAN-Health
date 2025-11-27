import { NextResponse } from "next/server";

export async function GET() {
  const results: any = {
    steps: [],
    success: false,
  };

  try {
    // Step 1: Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    results.steps.push({
      step: "1. Check Environment Variables",
      supabaseUrlExists: !!supabaseUrl,
      supabaseUrlValue: supabaseUrl
        ? supabaseUrl.substring(0, 40) + "..."
        : "NOT SET",
      supabaseAnonKeyExists: !!supabaseAnonKey,
      anonKeyLength: supabaseAnonKey?.length || 0,
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      results.steps.push({
        step: "ERROR",
        message: "Environment variables not set",
      });
      return NextResponse.json(results, { status: 500 });
    }

    // Step 2: Test basic HTTP connection to Supabase
    results.steps.push({
      step: "2. Testing basic HTTP connection...",
    });

    const healthCheck = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
      },
    }).catch((err) => {
      results.steps.push({
        step: "2. HTTP Connection",
        status: "FAILED",
        error: err.message,
      });
      throw err;
    });

    results.steps.push({
      step: "2. HTTP Connection",
      status: healthCheck.ok ? "OK" : "FAILED",
      statusCode: healthCheck.status,
      statusText: healthCheck.statusText,
    });

    // Step 3: List available tables
    results.steps.push({
      step: "3. Querying information_schema (list tables)...",
    });

    const tablesUrl = `${supabaseUrl}/rest/v1/information_schema.tables?select=table_name,table_schema`;
    console.log("Tables URL:", tablesUrl);

    const tablesResponse = await fetch(tablesUrl, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
    });

    console.log("Tables response status:", tablesResponse.status);
    const tablesBody = await tablesResponse.text();
    console.log("Tables response body:", tablesBody.substring(0, 200));

    if (tablesResponse.ok) {
      const tables = JSON.parse(tablesBody);
      const publicTables = tables
        .filter((t: any) => t.table_schema === "public")
        .map((t: any) => t.table_name);

      results.steps.push({
        step: "3. Available Tables",
        status: "OK",
        tables: publicTables,
      });
    } else {
      results.steps.push({
        step: "3. Available Tables",
        status: "FAILED",
        statusCode: tablesResponse.status,
        error: tablesBody.substring(0, 200),
      });
    }

    // Step 4: Try querying rider table
    results.steps.push({
      step: "4. Querying 'rider' table...",
    });

    const riderUrl = `${supabaseUrl}/rest/v1/rider?select=*&limit=1`;
    console.log("Rider URL:", riderUrl);

    const riderResponse = await fetch(riderUrl, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
    });

    console.log("Rider response status:", riderResponse.status);
    const riderBody = await riderResponse.text();
    console.log("Rider response body:", riderBody.substring(0, 300));

    if (riderResponse.ok) {
      const riderData = JSON.parse(riderBody);
      results.steps.push({
        step: "4. Query Rider Table",
        status: "OK",
        rowCount: riderData.length,
        sampleData: riderData.slice(0, 1),
      });
    } else {
      results.steps.push({
        step: "4. Query Rider Table",
        status: "FAILED",
        statusCode: riderResponse.status,
        error: riderBody.substring(0, 300),
      });
    }

    // Step 5: Try querying regular table
    results.steps.push({
      step: "5. Querying 'regular' table...",
    });

    const regularUrl = `${supabaseUrl}/rest/v1/regular?select=*&limit=1`;
    const regularResponse = await fetch(regularUrl, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
    });

    console.log("Regular response status:", regularResponse.status);
    const regularBody = await regularResponse.text();

    if (regularResponse.ok) {
      const regularData = JSON.parse(regularBody);
      results.steps.push({
        step: "5. Query Regular Table",
        status: "OK",
        rowCount: regularData.length,
        sampleData: regularData.slice(0, 1),
      });
    } else {
      results.steps.push({
        step: "5. Query Regular Table",
        status: "FAILED",
        statusCode: regularResponse.status,
        error: regularBody.substring(0, 300),
      });
    }

    results.success = true;
  } catch (error: any) {
    console.error("Test error:", error);
    results.steps.push({
      step: "ERROR",
      message: error.message,
      stack: error.stack,
    });
  }

  return NextResponse.json(results);
}
