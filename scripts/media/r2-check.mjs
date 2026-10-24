import nextEnv from '@next/env';
import { randomUUID } from 'node:crypto';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production', { info() {}, error() {} });

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Thiếu ${name}.`);
  return value;
}

let client;
let privateBucket;
let probeKey;
let publicBucket;
let publicProbeKey;
try {
  if (required('MEDIA_STORAGE_DRIVER') !== 'r2') throw new Error('MEDIA_STORAGE_DRIVER phải là r2.');
  const accountId = required('R2_ACCOUNT_ID');
  privateBucket = required('R2_PRIVATE_BUCKET');
  publicBucket = required('R2_PUBLIC_BUCKET');
  const publicBase = new URL(required('NEXT_PUBLIC_MEDIA_BASE_URL'));
  if (publicBase.protocol !== 'https:') throw new Error('NEXT_PUBLIC_MEDIA_BASE_URL của R2 phải dùng HTTPS.');
  client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: required('R2_ACCESS_KEY_ID'),
      secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
    },
    maxAttempts: 3,
  });
  await client.send(new HeadBucketCommand({ Bucket: privateBucket }));
  await client.send(new HeadBucketCommand({ Bucket: publicBucket }));
  probeKey = `__health/${randomUUID()}.txt`;
  const expected = `r2-check-${randomUUID()}`;
  await client.send(new PutObjectCommand({
    Bucket: privateBucket,
    Key: probeKey,
    Body: expected,
    ContentType: 'text/plain',
    IfNoneMatch: '*',
  }));
  const response = await client.send(new GetObjectCommand({ Bucket: privateBucket, Key: probeKey }));
  if (!response.Body || await response.Body.transformToString() !== expected)
    throw new Error('Nội dung probe đọc lại không khớp.');
  publicProbeKey = `__health/${randomUUID()}.txt`;
  await client.send(new CopyObjectCommand({
    Bucket: publicBucket,
    Key: publicProbeKey,
    CopySource: `${encodeURIComponent(privateBucket)}/${probeKey.split('/').map(encodeURIComponent).join('/')}`,
    ContentType: 'text/plain',
    CacheControl: 'no-store',
    MetadataDirective: 'REPLACE',
  }));
  const publicUrl = new URL(publicProbeKey, `${publicBase.href.replace(/\/$/, '')}/`);
  const publicResponse = await fetch(publicUrl, { cache: 'no-store' });
  if (!publicResponse.ok || await publicResponse.text() !== expected)
    throw new Error(`Public URL chưa đọc được object kiểm tra (HTTP ${publicResponse.status}).`);
  console.log('R2 sẵn sàng: private đọc/ghi/xóa được; public URL đọc object thành công.');
} catch (error) {
  console.error(`R2 chưa sẵn sàng: ${error instanceof Error ? error.message : 'Lỗi không xác định.'}`);
  process.exitCode = 1;
} finally {
  if (client && privateBucket && probeKey) {
    await client.send(new DeleteObjectCommand({ Bucket: privateBucket, Key: probeKey })).catch(() => {});
  }
  if (client && publicBucket && publicProbeKey) {
    await client.send(new DeleteObjectCommand({ Bucket: publicBucket, Key: publicProbeKey })).catch(() => {});
  }
  client?.destroy();
}
