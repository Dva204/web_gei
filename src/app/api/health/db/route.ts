import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'ok',
      database: 'postgresql',
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'postgresql',
        message:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : 'Database unavailable',
      },
      { status: 503 },
    );
  }
}
