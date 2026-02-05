import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

export enum TelegramChannel {
  NEW_USER = 'NEW_USER',
  PAYMENT = 'PAYMENT',
  ERROR = 'ERROR',
  GENERAL = 'GENERAL',
}

interface SendMessageOptions {
  channel: TelegramChannel;
  message: string;
  isHTML?: boolean;
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string;
  private readonly baseUrl: string;
  private readonly channelIds: Map<TelegramChannel, string>;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') as string;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;

    // Initialize channel mappings from environment variables
    this.channelIds = new Map([
      [
        TelegramChannel.NEW_USER,
        this.configService.get<string>('TELEGRAM_CHANNEL_NEW_USER') as string,
      ],
      [
        TelegramChannel.PAYMENT,
        this.configService.get<string>('TELEGRAM_CHANNEL_PAYMENT')  as string,
      ],
      [
        TelegramChannel.ERROR,
        this.configService.get<string>('TELEGRAM_CHANNEL_ERROR')  as string,
      ],
      [
        TelegramChannel.GENERAL,
        this.configService.get<string>('TELEGRAM_CHANNEL_GENERAL')  as string,
      ],
    ]);

    if (!this.botToken) {
      this.logger.error('TELEGRAM_BOT_TOKEN is not configured') ;
    }
  }

  /**
   * Send message to a specific channel
   * @param options - Channel, message, and format options
   */
  async sendToChannel(options: SendMessageOptions): Promise<boolean> {
    try {
      const channelId = this.channelIds.get(options.channel);

      if (!channelId) {
        this.logger.warn(`Channel ${options.channel} is not configured`);
        return false;
      }

      const response: AxiosResponse = await lastValueFrom(
        this.httpService.post(`${this.baseUrl}/sendMessage`, {
          chat_id: channelId,
          text: options.message,
          parse_mode: options.isHTML ? 'HTML' : undefined,
          disable_web_page_preview: true,
        }),
      );

      if (response.data.ok) {
        this.logger.log(`Message sent to ${options.channel} channel`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(
        `Failed to send message to ${options.channel}: ${error.response?.data?.description || error.message}`,
      );
      return false;
    }
  }

  /**
   * Send HTML message to a specific channel
   * @param channel - Target channel
   * @param html - HTML formatted message
   */
  async sendHTML(channel: TelegramChannel, html: string): Promise<boolean> {
    return this.sendToChannel({
      channel,
      message: html,
      isHTML: true,
    });
  }

  /**
   * Send plain text to a specific channel
   * @param channel - Target channel
   * @param text - Plain text message
   */
  async sendText(channel: TelegramChannel, text: string): Promise<boolean> {
    return this.sendToChannel({
      channel,
      message: text,
      isHTML: false,
    });
  }

  /**
   * Send message to multiple channels at once
   * @param channels - Array of target channels
   * @param message - Message to send
   * @param isHTML - Whether message is HTML formatted
   */
  async sendToMultipleChannels(
    channels: TelegramChannel[],
    message: string,
    isHTML = false,
  ): Promise<boolean> {
    const results = await Promise.all(
      channels.map((channel) =>
        this.sendToChannel({ channel, message, isHTML }),
      ),
    );

    return results.every((result) => result === true);
  }

  /**
   * Get configured channel ID
   * @param channel - Channel type
   */
  getChannelId(channel: TelegramChannel): string | undefined {
    return this.channelIds.get(channel);
  }

  /**
   * Check if bot is configured properly
   */
  async testConnection(): Promise<boolean> {
    try {
      const response: AxiosResponse = await lastValueFrom(
        this.httpService.get(`${this.baseUrl}/getMe`),
      );

      if (response.data.ok) {
        this.logger.log(
          `Telegram bot connected: @${response.data.result.username}`,
        );
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Telegram bot connection failed: ${error.message}`);
      return false;
    }
  }
}
