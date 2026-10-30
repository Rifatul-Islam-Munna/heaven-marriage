import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';
export function normalizePhone(value: string) {
  let v = String(value || '')
    .replace(/[০-৯]/g, (n) => String('০১২৩৪৫৬৭৮৯'.indexOf(n)))
    .replace(/[\s()-]/g, '');
  if (/^01[3-9]\d{8}$/.test(v)) return v;
  if (/^\+8801[3-9]\d{8}$/.test(v)) return '0' + v.slice(4);
  if (!/^\+[1-9]\d{6,14}$/.test(v))
    throw new BadRequestException(
      'সঠিক আন্তর্জাতিক নম্বর (+country code) লিখুন',
    );
  return v;
}
@Injectable()
export class MessagingService {
  constructor(
    private config: ConfigService,
    private sms: SmsService,
  ) {}
  async send(subject: string, text: string, title = 'Niqaha.com verification') {
    if (subject.includes('@')) {
      const key = this.config.get<string>('RESEND_API_KEY'),
        from = this.config.get<string>('EMAIL_FROM');
      if (!key || !from)
        throw new ServiceUnavailableException(
          'Email service is not configured. Please contact support.',
        );
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to: [subject], subject: title, text }),
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok)
        throw new ServiceUnavailableException(
          'Email delivery failed. Please retry.',
        );
      return;
    }
    const phone = normalizePhone(subject);
    if (phone.startsWith('01')) {
      await this.sms.sendSms({ number: phone, message: text });
      return;
    }
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID'),
      token = this.config.get<string>('TWILIO_AUTH_TOKEN'),
      from = this.config.get<string>('TWILIO_FROM');
    if (!sid || !token || !from)
      throw new ServiceUnavailableException(
        'International SMS is not configured. Please use email verification.',
      );
    const r = await fetch(
      'https://api.twilio.com/2010-04-01/Accounts/' +
        encodeURIComponent(sid) +
        '/Messages.json',
      {
        method: 'POST',
        headers: {
          Authorization:
            'Basic ' + Buffer.from(sid + ':' + token).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: phone, From: from, Body: text }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!r.ok)
      throw new ServiceUnavailableException(
        'SMS delivery failed. Please retry.',
      );
  }
}
