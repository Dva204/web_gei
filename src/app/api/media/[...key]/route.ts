import { apiRoute } from '@/server/http/response';
import { serveMedia } from '@/server/media/serve';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, route: { params: Promise<{ key: string[] }> }) {
  return apiRoute(async request => serveMedia(request, (await route.params).key))(request);
}
