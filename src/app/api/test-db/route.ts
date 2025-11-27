import { NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET() {
  try {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    const sql = postgres(connectionString);
    
    // Simple test query
    const result = await sql`SELECT NOW()`;
    
    await sql.end();

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      timestamp: result[0],
      environment: process.env.NODE_ENV,
    });
  } catch (error: any) {
    console.error('Database connection error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Connection failed',
        hint: 'Check DATABASE_URL in Vercel environment variables',
      },
      { status: 500 }
    );
  }
}
