import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class BkashService implements OnModuleInit {
  private readonly logger = new Logger(BkashService.name);
  private accessToken: string = '';
  private refreshToken: string = '';
  private tokenExpiresAt: number = 0;

  private readonly BKASH_APP_KEY: string;
  private readonly BKASH_APP_SECRET: string;
  private readonly BKASH_USERNAME: string;
  private readonly BKASH_PASSWORD: string;
  private readonly BKASH_BASE_URL: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.BKASH_APP_KEY = this.configService.get<string>('BKASH_APP_KEY') as string;
    this.BKASH_APP_SECRET = this.configService.get<string>('BKASH_APP_SECRET') as string;
    this.BKASH_USERNAME = this.configService.get<string>('BKASH_USERNAME') as string;
    this.BKASH_PASSWORD = this.configService.get<string>('BKASH_PASSWORD') as string;
    this.BKASH_BASE_URL = this.configService.get<string>('BKASH_BASE_URL') as string;
  }

  async onModuleInit() {
    await this.getAccessToken();
  }

  private async getAccessToken(): Promise<void> {
    try {
      const response: AxiosResponse = await lastValueFrom(
        this.httpService.post(
          `${this.BKASH_BASE_URL}/token/grant`,
          {
            app_key: this.BKASH_APP_KEY,
            app_secret: this.BKASH_APP_SECRET,
          },
          {
            headers: {
              'content-type': 'application/json',
              accept: 'application/json',
              username: this.BKASH_USERNAME,
              password: this.BKASH_PASSWORD,
            },
          },
        ),
      );

      this.logger.log('API Response:', response.data);

      // Check if bKash returned an error
      if (response.data.statusCode && response.data.statusCode !== '0000') {
        throw new Error(`bKash Error: ${response.data.statusMessage || 'Unknown error'}`);
      }

      this.accessToken = response.data.id_token;
      this.refreshToken = response.data.refresh_token;
      const expiresIn = response.data.expires_in;

      if (!expiresIn || isNaN(expiresIn)) {
        throw new Error('Invalid expires_in value');
      }

      this.tokenExpiresAt = Date.now() + expiresIn * 1000;
      this.logger.log('Access token obtained successfully');

      setTimeout(() => this.refreshAccessToken(), expiresIn * 900);
    } catch (error) {
      this.logger.error('Error fetching access token:', error.message);
      // Don't throw error to prevent app crash - just log it
      // throw error;
    }
  }

  private async refreshAccessToken(): Promise<void> {
    try {
      const response: AxiosResponse = await lastValueFrom(
        this.httpService.post(
          `${this.BKASH_BASE_URL}/token/refresh`,
          {
            app_key: this.BKASH_APP_KEY,
            app_secret: this.BKASH_APP_SECRET,
            refresh_token: this.refreshToken,
          },
          {
            headers: {
              username: this.BKASH_USERNAME,
              password: this.BKASH_PASSWORD,
            },
          },
        ),
      );

      // Check if bKash returned an error
      if (response.data.statusCode && response.data.statusCode !== '0000') {
        throw new Error(`bKash Error: ${response.data.statusMessage || 'Unknown error'}`);
      }

      this.accessToken = response.data.id_token;
      this.refreshToken = response.data.refresh_token;
      const expiresIn = response.data.expires_in;

      if (!expiresIn || isNaN(expiresIn)) {
        throw new Error('Invalid expires_in value');
      }

      this.tokenExpiresAt = Date.now() + expiresIn * 1000;
      this.logger.log('Access token refreshed successfully');

      setTimeout(() => this.refreshAccessToken(), expiresIn * 900);
    } catch (error) {
      this.logger.error('Error refreshing access token:', error.message);
    }
  }

  async ensureAccessToken(): Promise<void> {
    const now = Date.now();
    if (!this.accessToken || now >= this.tokenExpiresAt) {
      await this.getAccessToken();
    }
  }

  async createPayment(
    amount: number,
    userId: string,
 
  ): Promise<{ paymentUrl: string; paymentId: string }> {
    await this.ensureAccessToken();

    const callbackURL = `${this.configService.get('BACKEND_URL')}/user/execute-payment-callback`;

    try {
      const response: AxiosResponse = await lastValueFrom(
        this.httpService.post(
          `${this.BKASH_BASE_URL}/create`,
          {
            mode: '0011',
            payerReference: userId,
            callbackURL: callbackURL,
            amount: amount,
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber:
              'INV-' + Math.random().toString(36).substring(2, 9),
           
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `Bearer ${this.accessToken}`,
              'X-App-Key': this.BKASH_APP_KEY,
            },
          },
        ),
      );

      return {
        paymentUrl: response.data.bkashURL,
        paymentId: response.data.paymentID,
      };
    } catch (error) {
      this.logger.error('Error creating payment:', error.message);
      throw error;
    }
  }

  async executePayment(paymentID: string): Promise<any> {
    await this.ensureAccessToken();

    try {
      const response: AxiosResponse = await lastValueFrom(
        this.httpService.post(
          `${this.BKASH_BASE_URL}/execute`,
          { paymentID: paymentID },
          {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              'X-App-Key': this.BKASH_APP_KEY,
            },
          },
        ),
      );

      console.log(response.data);
      return response.data;
    } catch (error) {
      this.logger.error(
        'Error executing payment:',
        error.response || error.message,
      );
      throw error;
    }
  }
}
