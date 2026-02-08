// src/sms/sms.service.ts
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';


@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly apiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('BULKSMSBD_API_KEY') as string;
    this.senderId = this.configService.get<string>('BULKSMSBD_SENDER_ID') as string;
    this.apiUrl = this.configService.get<string>('BULKSMSBD_API_URL') as string;

    if (!this.apiKey || !this.senderId || !this.apiUrl) {
      throw new Error('BulkSMSBD configuration is missing in environment variables');
    }
  }

  /**
   * Send SMS to a single recipient
   */
  async sendSms(sendSmsDto: { number: string; message: string }) {
    const { number, message } = sendSmsDto;

    try {
      this.logger.log(`Sending SMS to ${number}`);

      const params = {
        api_key: this.apiKey,
        type: 'text',
        number: this.formatPhoneNumber(number),
        senderid: this.senderId,
        message: message,
      };

      const response = await firstValueFrom(
        this.httpService.get(this.apiUrl, { params }),
      );

      this.logger.log(`SMS sent successfully to ${number}. Response: ${JSON.stringify(response.data)}`);

      return {
        success: true,
        message: 'SMS sent successfully',
        recipient: number,
        response: response.data,
      };
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${number}:`, error.message);
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to send SMS',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Send SMS to multiple recipients
   */
  /* async sendBulkSms(numbers: string[], message: string) {
    const results = [];
    const errors = [];

    for (const number of numbers) {
      try {
        const result = await this.sendSms({ number, message });
        results.push(result);
      } catch (error) {
        errors.push({
          number,
          error: error.message,
        });
      }
    }

    return {
      success: errors.length === 0,
      totalSent: results.length,
      totalFailed: errors.length,
      results,
      errors,
    };
  }
 */
  /**
   * Send OTP SMS
   */
  async sendOtpSms(number: string, otp: string) {
      const message = `আপনার Niqaha OTP হল: ${otp}। এই কোডটি ২৫ মিনিটের মধ্যে মেয়াদ শেষ হবে। কারো সাথে শেয়ার করবেন না।`;
    
    return this.sendSms({ number, message });
  }

  /**
   * Format phone number for Bangladesh
   * Ensures number starts with country code
   */
  private formatPhoneNumber(number: string): string {
    // Remove spaces, dashes, and plus signs
    let cleaned = number.replace(/[\s\-\+]/g, '');

    // If starts with 0, replace with 880
    if (cleaned.startsWith('0')) {
      cleaned = '880' + cleaned.substring(1);
    }

    // If doesn't start with 880, add it
    if (!cleaned.startsWith('880')) {
      cleaned = '880' + cleaned;
    }

    return cleaned;
  }

  /**
   * Check SMS balance (if API supports it)
   */
  async checkBalance() {
    try {
      // Adjust this endpoint based on your SMS provider's API
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/balance`, {
          params: { api_key: this.apiKey },
        }),
      );

      return {
        success: true,
        balance: response.data,
      };
    } catch (error) {
      this.logger.error('Failed to check SMS balance:', error.message);
      return {
        success: false,
        message: 'Failed to check balance',
      };
    }
  }
}
