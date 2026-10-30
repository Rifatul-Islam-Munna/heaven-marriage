import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

// Every rendered route may have a separate set of copy overrides. The original
// JSX text is never rewritten or copied to MongoDB: it stays the fallback.
export function normalizeVisualScope(input: unknown): string {
  if (input === '@global') return '@global';
  if (typeof input !== 'string' || input.length > 180) {
    throw new BadRequestException('Invalid page');
  }
  const path = input === '/' ? '/' : input.replace(/\/$/, '');
  if (!/^\/(?:[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*)?$/.test(path) ||
      path.split('/').length > 12 ||
      /^\/(?:api|_next)(?:\/|$)/.test(path)) {
    throw new BadRequestException('Invalid page path');
  }
  return path;
}
export function validateVisualKey(input: unknown): string {
  if (typeof input !== 'string' || !/^[tpal]_[a-f0-9]{16}$/.test(input)) {
    throw new BadRequestException('Invalid text identifier');
  }
  return input;
}
type TextEntries = Record<string, string>;
interface ContentRecord {
  scope: string;
  draft?: TextEntries;
  published?: TextEntries;
  updatedAt?: Date;
  publishedAt?: Date;
}
const safeEntries = (entries?: TextEntries): TextEntries =>
  Object.fromEntries(Object.entries(entries || {}).filter(
    ([key, value]) => /^[tpal]_[a-f0-9]{16}$/.test(key) && typeof value === 'string',
  ));
function sameEntries(a: TextEntries, b: TextEntries) {
  const left = Object.keys(a).sort();
  const right = Object.keys(b).sort();
  return left.length === right.length &&
    left.every((key, i) => key === right[i] && a[key] === b[key]);
}
@Injectable()
export class VisualContentService implements OnModuleInit {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onModuleInit() {
    // Prevent concurrent first-edit upserts from creating duplicate page records.
    await this.collection.createIndex({ scope: 1 }, { unique: true, name: 'unique_visual_content_scope' });
  }
  private get collection() {
    return this.connection.collection<ContentRecord>('visual_page_content');
  }
  private async record(scope: string) {
    return this.collection.findOne({ scope });
  }
  async publicPage(input: unknown) {
    const path = normalizeVisualScope(input);
    const [page, global] = await Promise.all([this.record(path), this.record('@global')]);
    return {
      path, page: safeEntries(page?.published), global: safeEntries(global?.published),
    };
  }
  async adminPage(input: unknown) {
    const path = normalizeVisualScope(input);
    const [page, global] = await Promise.all([this.record(path), this.record('@global')]);
    const view = (doc: ContentRecord | null) => ({
      draft: safeEntries(doc?.draft),
      published: safeEntries(doc?.published),
      updatedAt: doc?.updatedAt ?? null,
      publishedAt: doc?.publishedAt ?? null,
    });
    return { path, page: view(page), global: view(global) };
  }
  async list() {
    const docs = await this.collection.find({}, {
      projection: { scope: 1, draft: 1, published: 1, updatedAt: 1, publishedAt: 1 },
    }).sort({ updatedAt: -1 }).limit(300).toArray();
    return docs.map(doc => ({
      scope: doc.scope,
      edits: Object.keys(safeEntries(doc.draft)).length,
      published: Object.keys(safeEntries(doc.published)).length,
      hasUnpublishedChanges: !sameEntries(safeEntries(doc.draft), safeEntries(doc.published)),
      updatedAt: doc.updatedAt ?? null,
    }));
  }
  async update(userId: string, body: Record<string, unknown>) {
    const scope = normalizeVisualScope(body?.scope);
    const key = validateVisualKey(body?.key);
    if (typeof body?.value !== 'string' || body.value.length > 10000) {
      throw new BadRequestException('Text must be at most 10,000 characters');
    }
    // Only plain text: React text nodes / DOM attributes, never HTML.
    const current = await this.record(scope);
    if (!Object.hasOwn(current?.draft || {}, key) &&
      Object.keys(current?.draft || {}).length >= 1200) {
      throw new BadRequestException('Page text limit reached');
    }
    await this.collection.updateOne(
      { scope },
      { $set: { [`draft.${key}`]: body.value, updatedAt: new Date() },
        $setOnInsert: { scope } },
      { upsert: true },
    );
    await this.audit(userId, 'draft.update', scope, key);
    return { scope, key, value: body.value };
  }
  async reset(userId: string, body: Record<string, unknown>) {
    const scope = normalizeVisualScope(body?.scope);
    const key = validateVisualKey(body?.key);
    await this.collection.updateOne(
      { scope }, { $unset: { [`draft.${key}`]: '' }, $set: { updatedAt: new Date() } },
    );
    await this.audit(userId, 'draft.reset', scope, key);
    return { scope, key };
  }
  async publish(userId: string, body: Record<string, unknown>) {
    const scope = normalizeVisualScope(body?.scope);
    if (!await this.record(scope)) throw new BadRequestException('Save an edit first');
    // Atomic draft snapshot. Removed overrides disappear on publication and
    // the JSX original is displayed again, without touching the source code.
    await this.collection.updateOne(
      { scope },
      [{ $set: { published: { $ifNull: ['$draft', {}] }, publishedAt: '$$NOW' } }],
    );
    await this.audit(userId, 'publish', scope);
    return { scope, message: 'Changes published' };
  }
  private async audit(userId: string, action: string, scope: string, key?: string) {
    await this.connection.collection('visual_content_audit').insertOne({
      actorId: userId, action, scope, ...(key ? { key } : {}), createdAt: new Date(),
    });
  }
}
