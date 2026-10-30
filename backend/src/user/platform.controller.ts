import { normalizeMessengerUrl } from './messenger-url';
import { resolvePolicySettings, suppliedPolicies } from './policy-defaults';
import { IdentityService } from './identity.service';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { PlatformService } from './platform.service';
import { User, UserDocument, UserType } from './entities/user.entity';
import { AuthGuard, type ExpressRequest } from '../lib/auth.guard';
import { RolesGuard } from '../lib/roles.guard';
import { Roles } from '../lib/roles.decorator';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { completion } from './profile-rules';
@Controller('platform')
@UseGuards(AuthGuard, ThrottlerGuard)
export class PlatformController {
  constructor(
    private service: PlatformService,
    private identity: IdentityService,
    @InjectConnection() private db: Connection,
    @InjectModel(User.name) private users: Model<UserDocument>,
  ) {}
  @Post('contact-change')
  @Throttle({ default: { limit: 5, ttl: 600000 } })
  contactChange(@Req() r: ExpressRequest, @Body() p: any) {
    return this.identity.requestContact(r.user.id, p);
  }
  @Post('contact-verify')
  @Throttle({ default: { limit: 10, ttl: 600000 } })
  contactVerify(@Req() r: ExpressRequest, @Body() p: any) {
    return this.identity.verifyContact(r.user.id, p);
  }
  @Get('summary') summary(@Req() r: ExpressRequest) {
    return this.service.summary(r.user.id);
  }
  @Get('admirers') admirers(@Req() r: ExpressRequest) {
    return this.service.admirers(r.user.id);
  }
  @Get('connections') connections(@Req() r: ExpressRequest) {
    return this.service.connections(r.user.id);
  }
  @Get('matches') matches(@Req() r: ExpressRequest) {
    return this.service.matches(r.user.id);
  }
  @Get('requests') requests(@Req() r: ExpressRequest) {
    return this.service.myCases(r.user.id);
  }
  @Post('request/:kind')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  request(
    @Req() r: ExpressRequest,
    @Param('kind') kind: string,
    @Body() p: any,
  ) {
    return this.service.createCase(r.user.id, kind, p);
  }
  @Post('visit/:id') visit(@Req() r: ExpressRequest, @Param('id') id: string) {
    return this.service.visit(r.user.id, id);
  }
  @Post('premium-payment') async premiumPayment(
    @Req() r: ExpressRequest,
    @Body() p: any,
  ) {
    const c = await this.db.collection('service_cases').findOne({
      id: p.id,
      userId: r.user.id,
      kind: 'premium',
      status: 'payment_pending',
    });
    if (!c)
      throw new BadRequestException(
        'Please wait for the team to verify your application.',
      );
    if (
      !p.transactionReference ||
      !['bkash', 'nagad', 'rocket'].includes(p.method)
    )
      throw new BadRequestException(
        'Payment method and transaction reference are required',
      );
    await this.db.collection('service_cases').updateOne(
      { id: c.id, status: 'payment_pending' },
      {
        $set: {
          transactionReference: String(p.transactionReference).slice(0, 100),
          method: p.method,
          paymentSubmittedAt: new Date(),
        },
      },
    );
    return { message: 'Payment information submitted for admin verification' };
  }
  @Get('admin/cases')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  cases() {
    return this.service.adminCases();
  }
  @Patch('admin/cases/:id')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  caseAction(
    @Req() r: ExpressRequest,
    @Param('id') id: string,
    @Body() p: any,
  ) {
    return this.service.caseAction(r.user.id, id, p);
  }
  @Post('admin/remind/:id')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  remind(@Req() r: ExpressRequest, @Param('id') id: string, @Body() p: any) {
    return this.service.remind(r.user.id, id, p);
  }
  @Get('admin/summary')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  async stats() {
    const [users, cases, orders] = await Promise.all([
      this.users
        .find({ role: UserType.USER })
        .select(
          'createdAt gender isSubscriber isPublished isPublishFromAdmin verificationStatus biodataStatus numberOfConnections connectionUnlocks name maritalStatus age weight nationality address educationInfo personalInformation occupational expectedLifePartner pledge familyInfo',
        )
        .lean(),
      this.db.collection('service_cases').find({}).toArray(),
      this.db.collection('connection_orders').find({}).toArray(),
    ]);
    return {
      total: users.length,
      incomplete: users.filter((u) => completion(u).percentage < 100).length,
      submitted: users.filter((u: any) => u.biodataStatus === 'submitted')
        .length,
      approved: users.filter((u) => u.isPublishFromAdmin).length,
      pending: users.filter((u) => !u.isPublishFromAdmin).length,
      premium: users.filter((u) => u.isSubscriber).length,
      general: users.filter((u) => !u.isSubscriber).length,
      connectionsRemaining: users.reduce(
        (n, u) => n + (u.numberOfConnections || 0),
        0,
      ),
      connectionsUsed: users.reduce(
        (n, u: any) => n + (u.connectionUnlocks?.length || 0),
        0,
      ),
      premiumRequests: cases.filter(
        (c) => c.kind === 'premium' && c.status === 'pending',
      ).length,
      reports: cases.filter(
        (c) => c.kind === 'report' && c.status === 'pending',
      ).length,
      paymentPending: orders.filter((o) => o.status === 'pending').length,
      paymentPaid: orders.filter((o) => o.status === 'paid').length,
      connectionSales: orders
        .filter((o) => o.status === 'paid')
        .reduce((n, o) => n + o.amount, 0),
    };
  }
  @Get('admin/audit')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  audit() {
    return this.db
      .collection('platform_audit')
      .find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();
  }
  @Get('admin/connections/:id')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  userConnections(@Param('id') id: string) {
    return this.service.connections(id);
  }
  @Get('admin/reminders')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  reminders() {
    return this.db
      .collection('reminder_history')
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
  }

  @Get('admin/settings')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  async settings() {
    return {
      discoveryEnabled: true,
      minMatchScore: 1,
      matchWeights: {
        district: 1,
        maritalStatus: 1,
        profession: 1,
        education: 1,
        age: 1,
      },
      ...resolvePolicySettings(
        await this.db
          .collection('platform_settings')
          .findOne({ key: 'public' }),
      ),
    };
  }
  @Patch('admin/settings')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  async saveSettings(@Req() r: ExpressRequest, @Body() p: any) {
    const allowed = [
      'messengerUrl',
      'discoveryEnabled',
      'terms',
      'privacy',
      'refund',
      'termsPublished',
      'privacyPublished',
      'refundPublished',
      'minMatchScore',
    ];
    const updates: any = { updatedAt: new Date() };
    for (const k of allowed)
      if (p[k] !== undefined)
        updates[k] =
          k.endsWith('Published') || k === 'discoveryEnabled'
            ? p[k] === true
            : String(p[k]).slice(0, 50000);
    if (p.messengerUrl !== undefined) {
      const normalized = normalizeMessengerUrl(String(p.messengerUrl));
      if (String(p.messengerUrl).trim() && !normalized)
        throw new BadRequestException(
          'Use a valid HTTPS Messenger URL (m.me/page or messenger.com/t/page).',
        );
      updates.messengerUrl = normalized;
    }
    const current = resolvePolicySettings(
      await this.db.collection('platform_settings').findOne({ key: 'public' }),
    );
    for (const kind of ['terms', 'privacy', 'refund']) {
      if (
        updates[kind + 'Published'] === true &&
        !String(updates[kind] ?? current[kind] ?? '').trim()
      )
        throw new BadRequestException(
          'Policy content is required before publishing',
        );
      if (
        (kind === 'terms' || kind === 'refund') &&
        (updates[kind] !== undefined ||
          updates[kind + 'Published'] !== undefined)
      ) {
        updates[kind + 'SourceHash'] = suppliedPolicies[kind].sha256;
        if (updates[kind] === undefined) updates[kind] = current[kind];
        if (updates[kind + 'Published'] === undefined)
          updates[kind + 'Published'] = current[kind + 'Published'];
      }
    }
    if (p.matchWeights) {
      updates.matchWeights = {};
      for (const key of [
        'district',
        'maritalStatus',
        'profession',
        'education',
        'age',
      ]) {
        const n = Number(p.matchWeights[key]);
        if (!Number.isFinite(n) || n < 0 || n > 100)
          throw new BadRequestException('Matching weights must be 0–100');
        updates.matchWeights[key] = n;
      }
    }
    if (updates.minMatchScore !== undefined) {
      updates.minMatchScore = Number(updates.minMatchScore);
      if (
        !Number.isFinite(updates.minMatchScore) ||
        updates.minMatchScore < 0 ||
        updates.minMatchScore > 100
      )
        throw new BadRequestException('Minimum score must be 0–100');
    }
    await this.service.audit(r.user.id, 'settings.update', 'public');
    await this.db
      .collection('platform_settings')
      .updateOne({ key: 'public' }, { $set: updates }, { upsert: true });
    return { message: 'Settings saved' };
  }
  @Post('admin/adjust-connections/:id')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  async adjust(
    @Req() r: ExpressRequest,
    @Param('id') id: string,
    @Body() p: any,
  ) {
    if (
      !Number.isSafeInteger(p.amount) ||
      p.amount < 1 ||
      p.amount > 10000 ||
      !p.reason ||
      typeof p.requestId !== 'string'
    )
      throw new BadRequestException(
        'Positive quantity, reason and unique requestId are required',
      );
    return this.service.adjust(r.user.id, id, p);
  }
  @Post('admin/refund/:id')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  refund(@Req() r: ExpressRequest, @Param('id') id: string, @Body() p: any) {
    return this.service.refund(r.user.id, id, p);
  }
  @Get('admin/matches/:id')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  adminMatches(@Param('id') id: string) {
    return this.service.matches(id);
  }

  @Post('manual-connection-payment')
  @Throttle({ default: { limit: 5, ttl: 600000 } })
  async manualConnection(@Req() r: ExpressRequest, @Body() p: any) {
    return this.service.manualPayment(r.user.id, p);
  }
  @Post('admin/verify-manual-payment/:id')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  async verifyManual(
    @Req() r: ExpressRequest,
    @Param('id') id: string,
    @Body() p: any,
  ) {
    return this.service.verifyManualPayment(r.user.id, id, p);
  }
  @Get('admin/payments')
  @UseGuards(RolesGuard)
  @Roles(UserType.ADMIN)
  payments() {
    return this.db
      .collection('connection_orders')
      .find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();
  }
}
