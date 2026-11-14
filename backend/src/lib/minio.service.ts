import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdtemp, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import {
  getMediaFormat,
  hasValidMediaHeader,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  type MediaFormat,
} from '../image/media-upload';

const BUCKET = 'niqha-public-bukcet'; // Keep existing bucket and public URLs.
const PREFIX = 'dashboard-media/';
const PUT_EXPIRES_SECONDS = 15 * 60;
const TICKET_EXPIRES_SECONDS = 30 * 60;
const OBJECT_KEY = /^dashboard-media\/[a-f0-9-]{36}\.[a-z0-9]+$/;

export type SignedMedia = {
  putUrl: string;
  key: string;
  ticket: string;
  contentType: string;
  expiresIn: number;
};
export type VerifiedMedia = {
  key: string;
  size: number;
  format: MediaFormat;
  url: string;
};

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private s3!: S3Client;
  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const endpoint = this.configService.get<string>('MINIO_URL');
    const accessKeyId = this.configService.get<string>('MINIO_ACCESS_KEY');
    const secretAccessKey = this.configService.get<string>('MINIO_SECRET_KEY');
    if (!endpoint || !accessKeyId || !secretAccessKey)
      throw new ServiceUnavailableException(
        'Storage endpoint and credentials must be configured',
      );
    this.s3 = new S3Client({
      region: 'us-east-1',
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });
    // Do not recreate RustFS buckets or replace production bucket policies on
    // each application startup. Existing media already uses this public bucket.
    // Bootstrap is opt-in for a fresh installation with admin credentials.
    if (this.configService.get<string>('MINIO_BOOTSTRAP_BUCKET') === 'true') {
      await this.createBucketIfNotExists(BUCKET);
      await this.makeBucketPublic(BUCKET);
    }
  }

  private publicUrl(key: string): string {
    // Upload URLs must point at the same externally reachable RustFS host
    // that signed the PUT; avoid stale MinIO public URL overrides.
    const raw = this.configService.get<string>('MINIO_URL');
    const base = new URL((raw || '').replace(/\/$/, '') + '/');
    return new URL(BUCKET + '/' + key, base).toString();
  }

  private ticketSecret(): string {
    const secret =
      this.configService.get<string>('MEDIA_UPLOAD_SIGNING_SECRET') ||
      this.configService.get<string>('ACCESS_TOKEN');
    if (!secret)
      throw new ServiceUnavailableException(
        'Media signing secret is not configured',
      );
    return secret;
  }

  private makeTicket(
    userId: string,
    key: string,
    size: number,
    mime: string,
    expires: number,
  ): string {
    const message = [userId, key, size, mime, expires].join(':');
    const hmac = createHmac('sha256', this.ticketSecret())
      .update(message)
      .digest('base64url');
    return expires + '.' + hmac;
  }

  async presignMedia(userId: string, payload: unknown): Promise<SignedMedia> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload))
      throw new BadRequestException('Missing media details');
    const input = payload as Record<string, unknown>;
    if (
      typeof input.name !== 'string' ||
      input.name.length > 200 ||
      typeof input.type !== 'string' ||
      input.type.length > 120 ||
      typeof input.size !== 'number' ||
      !Number.isSafeInteger(input.size)
    )
      throw new BadRequestException('Invalid file name, type or size');
    const format = getMediaFormat(input.name, input.type);
    if (!format) throw new BadRequestException('Unsupported media format');
    const size = input.size;
    const limit = format.kind === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (size <= 0 || size > limit)
      throw new BadRequestException(
        format.kind === 'video'
          ? 'Video must be 80 MB or smaller'
          : 'Image or PDF must be 25 MB or smaller',
      );
    const key = PREFIX + randomUUID() + '.' + format.extension;
    try {
      const putUrl = await getSignedUrl(
        this.s3,
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          ContentType: format.mime,
        }),
        { expiresIn: PUT_EXPIRES_SECONDS },
      );
      const expires = Math.floor(Date.now() / 1000) + TICKET_EXPIRES_SECONDS;
      return {
        putUrl,
        key,
        ticket: this.makeTicket(userId, key, size, format.mime, expires),
        contentType: format.mime,
        expiresIn: PUT_EXPIRES_SECONDS,
      };
    } catch (error) {
      this.logger.error(
        'Could not sign a direct RustFS media upload',
        error instanceof Error ? error.name : 'Error',
      );
      throw new ServiceUnavailableException('Unable to start RustFS upload');
    }
  }

  async confirmMedia(userId: string, payload: unknown): Promise<VerifiedMedia> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload))
      throw new BadRequestException('Missing upload confirmation');
    const input = payload as Record<string, unknown>;
    if (
      typeof input.key !== 'string' ||
      !OBJECT_KEY.test(input.key) ||
      typeof input.contentType !== 'string' ||
      typeof input.ticket !== 'string' ||
      input.ticket.length > 220 ||
      typeof input.size !== 'number' ||
      !Number.isSafeInteger(input.size)
    )
      throw new BadRequestException('Invalid upload confirmation');
    const format = getMediaFormat(input.key, input.contentType);
    if (!format || format.mime !== input.contentType)
      throw new BadRequestException('Invalid media type');
    const limit = format.kind === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (input.size <= 0 || input.size > limit)
      throw new BadRequestException('Uploaded media exceeds the size limit');

    const [expiryText, signature, ...extra] = input.ticket.split('.');
    const expires = Number(expiryText);
    if (
      extra.length ||
      !Number.isSafeInteger(expires) ||
      expires < Math.floor(Date.now() / 1000) ||
      expires > Math.floor(Date.now() / 1000) + TICKET_EXPIRES_SECONDS ||
      !signature
    )
      throw new UnauthorizedException('Upload authorization expired');
    const expected = this.makeTicket(
      userId,
      input.key,
      input.size,
      input.contentType,
      expires,
    );
    const expectedSignature = expected.split('.')[1];
    const presented = Buffer.from(signature, 'utf8');
    const trusted = Buffer.from(expectedSignature, 'utf8');
    if (
      presented.length !== trusted.length ||
      !timingSafeEqual(presented, trusted)
    )
      throw new UnauthorizedException('Upload authorization is invalid');

    try {
      const head = await this.s3.send(
        new HeadObjectCommand({ Bucket: BUCKET, Key: input.key }),
      );
      if (head.ContentLength !== input.size)
        throw new BadRequestException(
          'Uploaded object size mismatch. Please retry.',
        );
      const storedMime = (head.ContentType || '').split(';')[0].toLowerCase();
      if (storedMime !== format.mime)
        throw new BadRequestException(
          'Uploaded object type mismatch. Please retry.',
        );
      // Verify the object bytes, not only the metadata supplied by the browser.
      const check = await this.s3.send(
        new GetObjectCommand({
          Bucket: BUCKET,
          Key: input.key,
          Range: 'bytes=0-4095',
        }),
      );
      if (!check.Body)
        throw new BadRequestException('Uploaded object is missing');
      const header = await check.Body.transformToByteArray();
      if (!hasValidMediaHeader(header, format.extension))
        throw new BadRequestException(
          'Uploaded file content is not a valid media format',
        );
      return {
        key: input.key,
        size: input.size,
        format,
        url: this.publicUrl(input.key),
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      )
        throw error;
      this.logger.error(
        'RustFS could not confirm uploaded object',
        error instanceof Error ? error.name : 'Error',
      );
      throw new BadGatewayException('RustFS could not verify the upload');
    }
  }

  async downloadToTemporaryFile(
    key: string,
    extension: string,
  ): Promise<{ path: string; directory: string; size: number }> {
    const directory = await mkdtemp(join(tmpdir(), 'niqaha-media-'));
    const path = join(directory, 'original.' + extension);
    try {
      const result = await this.s3.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      );
      if (!result.Body)
        throw new BadGatewayException('RustFS returned an empty file');
      await pipeline(result.Body as Readable, createWriteStream(path));
      return { path, directory, size: (await stat(path)).size };
    } catch (error) {
      await rm(directory, { force: true, recursive: true }).catch(() => {});
      throw error;
    }
  }

  async createBucketIfNotExists(bucketName: string) {
    try {
      await this.s3.send(new CreateBucketCommand({ Bucket: bucketName }));
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      if (name === 'BucketAlreadyOwnedByYou' || name === 'BucketAlreadyExists')
        return;
      this.logger.error('Could not prepare media bucket', name);
      throw error;
    }
  }

  async makeBucketPublic(bucketName: string) {
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicRead',
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucketName}/*`],
        },
      ],
    };
    try {
      await this.s3.send(
        new PutBucketPolicyCommand({
          Bucket: bucketName,
          Policy: JSON.stringify(policy),
        }),
      );
    } catch (error) {
      this.logger.error(
        'Could not set public media policy',
        error instanceof Error ? error.name : 'Error',
      );
      throw error;
    }
  }

  async uploadFile(file: Express.Multer.File) {
    try {
      const response = await this.s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: file.filename,
          Body: createReadStream(file.path),
          ContentLength: file.size,
          ContentType: file.mimetype,
          ContentDisposition: 'inline',
        }),
      );
      this.logger.debug('Media uploaded to RustFS');
      return this.publicUrl(file.filename);
    } catch (error) {
      this.logger.error(
        'RustFS upload error',
        error instanceof Error ? error.name : 'Error',
      );
      throw new BadGatewayException('Failed to store media in RustFS');
    }
  }

  async deleteService(fileName: string) {
    if (
      !fileName ||
      typeof fileName !== 'string' ||
      fileName.includes('..') ||
      fileName.startsWith('/') ||
      fileName.includes('\\')
    )
      throw new BadRequestException('Invalid file name');
    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: BUCKET, Key: fileName }),
      );
      return true;
    } catch (error) {
      this.logger.error(
        'Could not delete temporary media object',
        error instanceof Error ? error.name : 'Error',
      );
      throw new BadGatewayException('Could not delete media object');
    }
  }
}
