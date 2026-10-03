import { NextResponse } from 'next/server';
export function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return params.then(() => NextResponse.redirect('https://example.com'));
}
