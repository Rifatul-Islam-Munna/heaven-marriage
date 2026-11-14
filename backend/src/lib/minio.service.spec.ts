import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { MinioService } from './minio.service';

const endpoint = 'https://rustfs.example.test';
const config = {
  get: (name: string) =>
    (
      ({
        MINIO_URL: endpoint,
        MINIO_ACCESS_KEY: 'dummy-access-only',
        MINIO_SECRET_KEY: 'dummy-secret-only',
        ACCESS_TOKEN: 'dummy-test-session-signing-secret',
      }) as Record<string, string>
    )[name],
};

function service() {
  const storage = new MinioService(config as unknown as ConfigService);
  const client = new S3Client({
    region: 'us-east-1',
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: 'dummy-access-only',
      secretAccessKey: 'dummy-secret-only',
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
  });
  (storage as unknown as { s3: S3Client }).s3 = client;
  return { storage, client };
}

describe('RustFS direct upload presigning', () => {
  it('signs a short-lived PUT against the configured bucket without exposing credentials', async () => {
    const { storage } = service();
    const result = await storage.presignMedia('admin1', {
      name: 'hero.mp4',
      type: 'video/mp4',
      size: 5000,
    });
    const url = new URL(result.putUrl);
    expect(url.origin).toBe(endpoint);
    expect(url.pathname).toMatch(
      /^\/niqha-public-bukcet\/dashboard-media\/[0-9a-f-]{36}\.mp4$/,
    );
    expect(url.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('900');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[a-f0-9]{64}$/);
    expect(result.contentType).toBe('video/mp4');
    expect(result.ticket).toBeTruthy();
    expect(result.putUrl).not.toContain('dummy-secret-only');
  });

  it('supports camera formats with their correct signed MIME type', async () => {
    const { storage } = service();
    const signed = await storage.presignMedia('admin1', {
      name: 'IMG_3456.MOV',
      type: 'application/octet-stream',
      size: 3000,
    });
    expect(signed.contentType).toBe('video/quicktime');
    expect(signed.key).toMatch(/\.mov$/);
  });

  it('rejects unknown, mismatched, or too-large uploads before issuing URLs', async () => {
    const { storage } = service();
    await expect(
      storage.presignMedia('admin1', {
        name: 'malware.svg',
        type: 'image/svg+xml',
        size: 1000,
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      storage.presignMedia('admin1', {
        name: 'fake.mp4',
        type: 'image/png',
        size: 1000,
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      storage.presignMedia('admin1', {
        name: 'oversized.mp4',
        type: 'video/mp4',
        size: 81 * 1024 * 1024,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('validates the owner ticket, stored size and real file bytes before returning a URL', async () => {
    const { storage, client } = service();
    const signed = await storage.presignMedia('admin1', {
      name: 'hero.mp4',
      type: 'video/mp4',
      size: 5000,
    });
    const mock = jest
      .spyOn(client, 'send')
      .mockImplementation((command: unknown) => {
        if (command instanceof HeadObjectCommand)
          return Promise.resolve({
            ContentLength: 5000,
            ContentType: 'video/mp4',
          }) as never;
        if (command instanceof GetObjectCommand)
          return Promise.resolve({
            Body: {
              transformToByteArray: () =>
                Promise.resolve(
                  Buffer.concat([
                    Buffer.from([0, 0, 0, 20]),
                    Buffer.from('ftypisom'),
                    Buffer.alloc(40),
                  ]),
                ),
            },
          }) as never;
        return Promise.reject(new Error('Unexpected command')) as never;
      });
    const details = {
      key: signed.key,
      ticket: signed.ticket,
      contentType: signed.contentType,
      size: 5000,
    };
    await expect(
      storage.confirmMedia('different-admin', details),
    ).rejects.toThrow(UnauthorizedException);
    const confirmed = await storage.confirmMedia('admin1', details);
    expect(confirmed.url).toBe(endpoint + '/niqha-public-bukcet/' + signed.key);
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it('rejects a damaged upload with a mismatched actual object length', async () => {
    const { storage, client } = service();
    const signed = await storage.presignMedia('admin1', {
      name: 'hero.mp4',
      type: 'video/mp4',
      size: 5000,
    });
    jest.spyOn(client, 'send').mockResolvedValue({
      ContentLength: 4999,
      ContentType: 'video/mp4',
    } as never);
    await expect(
      storage.confirmMedia('admin1', {
        key: signed.key,
        ticket: signed.ticket,
        contentType: signed.contentType,
        size: 5000,
      }),
    ).rejects.toThrow('size mismatch');
  });
});
