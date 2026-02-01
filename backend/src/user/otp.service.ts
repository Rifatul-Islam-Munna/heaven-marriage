// otp.service.ts
import { Injectable } from '@nestjs/common';
import NodeCache from 'node-cache';
import crypto from 'crypto';

@Injectable()
export class OtpService {
  private usedOtpsCache: NodeCache;

  constructor() {
    // Cache to prevent duplicate OTPs for 30 minutes
    this.usedOtpsCache = new NodeCache({ 
      stdTTL: 1800,  // 30 minutes in seconds
      checkperiod: 120 
    });
  }

  // Generate unique OTP not used in last 30 minutes
  generateUniqueOTP(): string {
    let otp: string;
    let attempts = 0;

    do {
      otp = crypto.randomInt(100000, 999999).toString();
      attempts++;
      
      if (attempts >= 20) {
        // Very unlikely to happen with 1 million possible OTPs
        throw new Error('Failed to generate unique OTP');
      }
    } while (this.usedOtpsCache.has(otp)); // Check if OTP used in last 30 min

    // Mark this OTP as used for 30 minutes
    this.usedOtpsCache.set(otp, true, 1800);

    return otp;
  }
}
