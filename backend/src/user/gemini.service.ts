import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  constructor(private readonly config: ConfigService) {}
  enabled() {
    return !!(
      this.config.get<string>('GEMINI_API_KEY') ||
      this.config.get<string>('GOOGLE_GENERATIVE_AI_API_KEY')
    )?.trim();
  }
  async generate<T>(
    system: string,
    text: string,
    schema: z.ZodType<T>,
    media?: { mime_type: string; data: string },
  ): Promise<T> {
    const key = (
      this.config.get<string>('GEMINI_API_KEY') ||
      this.config.get<string>('GOOGLE_GENERATIVE_AI_API_KEY')
    )?.trim();
    if (!key)
      throw new ServiceUnavailableException(
        'AI সহায়তা এখন চালু নেই। ফর্মটি নিজে পূরণ করতে পারবেন।',
      );
    try {
      // Native dynamic imports keep the ESM AI SDK compatible with this Nest application.
      const [{ generateText, Output }, { createGoogle }] = await Promise.all([
        import('ai'),
        import('@ai-sdk/google'),
      ]);
      const google = createGoogle({ apiKey: key });
      const result = await generateText({
        model: google(
          this.config.get<string>('GEMINI_MODEL')?.trim() || 'gemini-3.8-flash',
        ),
        system,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text },
              ...(media
                ? [
                    {
                      type: 'file' as const,
                      data: Buffer.from(media.data, 'base64'),
                      mediaType: media.mime_type,
                    },
                  ]
                : []),
            ],
          },
        ],
        output: Output.object({ schema }),
        maxOutputTokens: 4000,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(45000),
      });
      return schema.parse(result.output);
    } catch (error: any) {
      // Never expose provider errors, prompts, biodata or API credentials in logs/responses.
      // Only the error class and HTTP status are logged, e.g. a 403 billing/permission problem.
      this.logger.warn(`Gemini request failed: ${error?.name || 'Error'}${error?.statusCode ? ' (HTTP ' + error.statusCode + ')' : ''}`);
      throw new ServiceUnavailableException(
        'AI উত্তর দিতে পারেনি। আবার চেষ্টা করুন অথবা ফর্মটি নিজে পূরণ করুন।',
      );
    }
  }
}
