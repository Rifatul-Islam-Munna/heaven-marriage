import { scoreMatch, compareMatches, countMatchPreferences, MATCH_FIELD_PATHS } from './matching';
import { reciprocalMatch, compareReciprocal } from './admin-matching';
import {premiumRecommendationSmsTargets} from './recommendation-sms';
import {SmsService} from './sms.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { User, UserDocument, UserType } from './entities/user.entity';
import { BkashService } from './bkash.service';
import { MessagingService } from './messaging.service';
import { completion, publicProfile, visibleFilter, PROFILE_FIELDS } from './profile-rules';
import {describeProfileCompletion} from './profile-completion-snapshot';
import { biodataStage, hasSubmittedBiodata } from './biodata-lifecycle';
import { QuestionConfigService } from '../profile-questions/question-config.service';
import { resolvePremiumSettings,premiumTotal } from './premium-settings';
import {premiumEntitlement,premiumIsActive,PREMIUM_STAGES} from './premium-service';
import {buildIncomeReport,type SettledOrder} from './admin-income';
import { dailyRotationExpression, selectDiscovery } from './discovery-selection';
import { discoveryCycle, recordDiscoveryEvent } from './discovery-cycle';

@Injectable()
export class PlatformService implements OnModuleInit {
  private readonly logger = new Logger(PlatformService.name);
  constructor(
    @InjectConnection() private db: Connection,
    @InjectModel(User.name) private users: Model<UserDocument>,
    private bkash: BkashService,
    private messages: MessagingService,
    private questionConfig: QuestionConfigService,
    private sms?: SmsService,
  ) {}
  async onModuleInit() {
    await this.db.collection('premium_orders').createIndex(
      { paymentId: 1 }, { unique: true, partialFilterExpression: { paymentId: { $type: 'string' } } },
    );
    await this.db.collection('premium_orders').createIndex({ userId: 1, createdAt: -1 });
    await this.db
      .collection('connection_orders')
      .createIndex(
        { paymentId: 1 },
        {
          unique: true,
          partialFilterExpression: { paymentId: { $type: 'string' } },
        },
      );
    await this.db
      .collection('identity_challenges')
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await this.db
      .collection('profile_visits')
      .createIndex({ profileId: 1, visitor: 1, day: 1 }, { unique: true });
    await this.db.collection('service_cases')
      .createIndex({ userId: 1, kind: 1, createdAt: -1 });
    await this.db.collection('discovery_engagement')
      .createIndex({ cycle: 1, score: -1, _id: 1 });
    await this.db.collection('discovery_engagement')
      .createIndex({ profileId: 1, cycle: 1 });
    await this.db.collection('member_recommendations')
      .createIndex({ recipientId: 1, createdAt: -1 });
    await this.db.collection('member_recommendations')
      .createIndex({ recipientId: 1, candidateId: 1 }, { unique: true });
    await this.db.collection('discovery_engagement')
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  }
  private oid(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid ID');
    return new Types.ObjectId(id);
  }
  async audit(actor: string, action: string, target: string, reason = '') {
    await this.db
      .collection('platform_audit')
      .insertOne({
        actor,
        action,
        target,
        reason: reason.slice(0, 500),
        createdAt: new Date(),
      });
  }
  async profile(target: string, actor?: string, role?: string) {
    const u: any = await this.users
      .findOne(
        Types.ObjectId.isValid(target) ? { _id: target } : { userId: target },
      )
      .lean();
    if (!u) throw new NotFoundException('Profile unavailable');
    const own = String(u._id) === actor,
      admin = role === 'admin';
    if (
      !own &&
      !admin &&
      (!u.isPublished ||
        !u.isPublishFromAdmin ||
        ['suspended', 'rejected'].includes(u.verificationStatus))
    )
      throw new NotFoundException('Profile unavailable');
    let unlocked = own || admin;
    if (actor && !unlocked) {
      const v: any = await this.users
        .findById(actor)
        .select('connectionUnlocks')
        .lean();
      unlocked = !!v?.connectionUnlocks?.some(
        (x: any) => x.profileId === String(u._id) && x.status === 'active',
      );
      if (!unlocked)
        unlocked = !!(await this.db
          .collection('requestnumbers')
          .findOne({ userId: this.oid(actor), requestUserId: u._id }));
    }
    const data=publicProfile(u, unlocked);
    const schema=await this.questionConfig.get();
    this.questionConfig.applyPublicVisibility(data,schema);
    data.publicAnswers=await this.questionConfig.publicAnswers(u,unlocked,schema);
    // The public page uses the exact same revision that filtered these values.
    // A 20-minute browser cache cannot accidentally display stale labels or
    // previously-public answers after an admin hides/archives a question.
    data.publicQuestionSchema=schema;
    return data;
  }
  async unlock(actor: string, target: string) {
    const profile: any = await this.users
      .findOne({ _id: this.oid(target), ...visibleFilter })
      .lean();
    if (!profile)
      throw new NotFoundException('Profile is not available for connection');
    if (actor === target)
      return {
        message: 'Your own profile',
        profile: await this.profile(target, actor),
        alreadyUnlocked: true,
      };
    for (let attempt = 0; attempt < 5; attempt++) {
      await this.expire(actor);
      const u: any = await this.users.findById(actor).lean();
      if (!u) throw new NotFoundException('Account unavailable');
      const legacy = await this.db
        .collection('requestnumbers')
        .findOne({ userId: this.oid(actor), requestUserId: this.oid(target) });
      if (
        legacy ||
        u.connectionUnlocks?.some(
          (x: any) => x.profileId === target && x.status === 'active',
        )
      )
        return {
          message: 'Already unlocked',
          alreadyUnlocked: true,
          profile: await this.profile(target, actor),
          userData: this.safeAccount(u),
        };
      const grant = u.connectionGrants?.find(
        (g: any) =>
          g.status === 'active' &&
          g.used < g.quantity &&
          (!g.expiresAt || new Date(g.expiresAt) > new Date()),
      );
      const filter: any = {
        _id: this.oid(actor),
        numberOfConnections: { $gte: 1 },
        connectionUnlocks: {
          $not: { $elemMatch: { profileId: target, status: 'active' } },
        },
      };
      const inc: any = { numberOfConnections: -1 };
      if (grant) {
        filter.connectionGrants = {
          $elemMatch: { id: grant.id, status: 'active', used: grant.used },
        };
        inc['connectionGrants.$.used'] = 1;
      }
      const result = await this.users.collection.findOneAndUpdate(
        filter,
        {
          $inc: inc,
          $push: {
            connectionUnlocks: {
              id: randomUUID(),
              profileId: target,
              paymentId: grant?.id || 'legacy',
              status: 'active',
              createdAt: new Date(),
            },
          } as any,
        },
        { returnDocument: 'after' },
      );
      if (result) {
        await this.users.updateOne(
          { _id: target },
          { $inc: { profileContactRequests: 1 } },
        );
        await recordDiscoveryEvent(this.db, target, 'connections')
          .catch((error) => this.logger.warn('Could not update discovery connection score: ' + String(error)));
        await this.audit(actor, 'connection.unlock', target);
        return {
          message: 'Identity and contact unlocked',
          profile: await this.profile(target, actor),
          userData: this.safeAccount(result),
        };
      }
      if ((u.numberOfConnections || 0) < 1)
        throw new BadRequestException(
          'Not enough connections. Please purchase a package.',
        );
    }
    throw new BadRequestException('Connection balance changed. Please retry.');
  }
  safeAccount(u: any) {
    return {
      _id: u._id,
      name: u.name,
      role: u.role,
      gender: u.gender,
      userId: u.userId,
      isOtpVerified: u.isOtpVerified,
      numberOfConnections: u.numberOfConnections,
      isSubscriber: u.isSubscriber,
    };
  }
  async expire(actor: string) {
    const u: any = await this.users
      .findById(actor)
      .select('connectionGrants')
      .lean();
    for (const g of u?.connectionGrants || [])
      if (
        g.status === 'active' &&
        g.expiresAt &&
        new Date(g.expiresAt) <= new Date()
      ) {
        await this.users.collection.updateOne(
          {
            _id: this.oid(actor),
            connectionGrants: {
              $elemMatch: { id: g.id, status: 'active', used: g.used },
            },
          },
          {
            $inc: { numberOfConnections: -(g.quantity - g.used) },
            $set: { 'connectionGrants.$.status': 'expired' },
          },
        );
      }
  }
  async connections(actor: string) {
    await this.expire(actor);
    const u: any = await this.users
      .findById(actor)
      .select('numberOfConnections connectionUnlocks connectionGrants')
      .lean();
    const legacy = await this.db
      .collection('requestnumbers')
      .find({ userId: this.oid(actor) })
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();
    const used =
      (u?.connectionUnlocks || []).filter((x: any) => x.status === 'active')
        .length + legacy.length;
    const remaining = Math.max(0, u?.numberOfConnections || 0);
    const payments = await this.db
      .collection('connection_orders')
      .find({ userId: actor }, { projection: { userId: 0 } })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    return {
      total: used + remaining,
      used,
      remaining,
      history: [
        ...(u?.connectionUnlocks || []),
        ...legacy.map((x) => ({
          profileId: String(x.requestUserId),
          createdAt: x.createdAt,
          status: 'active',
          paymentId: 'legacy',
        })),
      ],
      packages: u?.connectionGrants || [],
      payments,
    };
  }
  /** Preserve the old Member Management toggle while creating the same service record as Premium Admin. */
  async adminTogglePremium(actor:string,id:string,activate:boolean){
    const user:any=await this.users.findById(id).select('role isSubscriber premiumService').lean();
    if(!user||user.role!==UserType.USER)throw new NotFoundException('Member unavailable');
    const update:Record<string,unknown>={isSubscriber:activate};
    if(activate&&(!user.premiumService||!premiumIsActive(user))){
      const plan=resolvePremiumSettings((await this.db.collection('platform_settings')
        .findOne({key:'public'}))?.premium);
      update.premiumService=premiumEntitlement(plan,new Date(),'admin');
    }
    if(!activate&&user.premiumService){
      update['premiumService.stage']='paused';
      update['premiumService.updatedAt']=new Date();
    }
    await this.users.updateOne({_id:id,role:UserType.USER},{$set:update});
    await this.audit(actor,activate?'premium.admin.activate':'premium.admin.deactivate',id,
      'Member Management premium toggle');
    return {message:activate?'Premium activated':'Premium deactivated'};
  }
  /** Premium checkout is separate from connection_orders. It may grant only the configured included connections once. */
  async createPremiumPayment(actor: string) {
    const settings = resolvePremiumSettings(
      (await this.db.collection('platform_settings').findOne({ key: 'public' }))?.premium,
    );
    if (!settings.visible || !settings.enabled)
      throw new BadRequestException('Premium registration is currently unavailable');
    if (!this.bkash.isConfigured())
      throw new BadRequestException('Online bKash checkout is not configured yet');
    const member = await this.users.findById(actor).lean();
    if (!member || member.role !== UserType.USER)
      throw new ForbiddenException('Only members can purchase premium');
    if (premiumIsActive(member)) throw new BadRequestException('You already have an active premium membership');
    // Premium can be purchased before biodata completion; the team may help
    // the member complete their profile after successful payment.
    const cases = this.db.collection('service_cases');
    // A completed/expired Premium term needs a NEW case; never reuse its active case.
    const existing = await cases.findOne({
      userId: actor, kind: 'premium',
      status: { $in: ['pending', 'contacted', 'payment_pending', 'paid'] },
    });
    let caseId: string = existing?.id;
    const amount = premiumTotal(settings);
    if (!caseId) {
      caseId = randomUUID();
      await cases.insertOne({id:caseId,userId:actor,kind:'premium',
        status:'pending',message:'',fee:amount,createdAt:new Date(),updatedAt:new Date()});
    }
    if (!Number.isSafeInteger(amount) || amount < 1)
      throw new BadRequestException('Invalid premium fee');
    const id = randomUUID();
    await this.db.collection('premium_orders').insertOne({
      id, userId: actor, caseId, amount, currency: 'BDT',
      premiumSnapshot: settings, status: 'pending', createdAt: new Date(),
    });
    try {
      const payment = await this.bkash.createPayment(amount, id, 'premium');
      if (!payment.paymentId || !payment.paymentUrl)
        throw new Error('Missing bKash checkout URL');
      await this.db.collection('premium_orders').updateOne(
        { id }, { $set: { paymentId: payment.paymentId } },
      );
      return payment;
    } catch {
      await this.db.collection('premium_orders').updateOne(
        { id }, { $set: { status: 'failed' } },
      );
      throw new BadRequestException('Unable to start bKash premium checkout. Try again later.');
    }
  }

  /** Verify with bKash itself, not with browser-supplied status. */
  async executePremiumPayment(paymentId: string) {
    if (!paymentId || paymentId.length > 150) return { success: false };
    const orders = this.db.collection('premium_orders');
    const order = await orders.findOne({ paymentId });
    if (!order || order.status === 'refunded') return { success: false };
    if (order.status === 'paid') return { success: true };
    let result: any;
    try {
      result = await this.bkash.executePayment(paymentId);
      if (result?.transactionStatus !== 'Completed')
        result = await this.bkash.queryPayment(paymentId);
    } catch {
      try { result = await this.bkash.queryPayment(paymentId); }
      catch { return { success: false }; }
    }
    if (result?.paymentID !== paymentId ||
      result?.transactionStatus !== 'Completed' ||
      Number(result.amount) !== order.amount ||
      result.currency !== 'BDT' ||
      (result.payerReference !== order.id &&
        result.merchantInvoiceNumber !== order.id))
      return { success: false };

    const snapshot=resolvePremiumSettings(order.premiumSnapshot);
    const entitlement=premiumEntitlement(snapshot);
    const included=snapshot.includedConnections;
    const update = await this.users.collection.updateOne(
      { _id: this.oid(order.userId), creditedPaymentIds: { $ne: paymentId }, role: UserType.USER },
      {
        $set: { isSubscriber: true,premiumService:entitlement },
        $addToSet: { creditedPaymentIds: paymentId } as any,
        ...(included>0 ? {
          $inc: {numberOfConnections:included},
          $push: {connectionGrants:{id:'premium:'+paymentId,quantity:included,used:0,
            status:'active',source:'premium',createdAt:new Date(),expiresAt:entitlement.expiresAt}},
        } : {}),
      } as any,
    );
    const member = await this.users.collection.findOne(
      { _id: this.oid(order.userId), creditedPaymentIds: paymentId },
    );
    if (!member) return { success: false };
    await orders.updateOne({ paymentId, status: 'pending' },
      { $set: { status: 'paid', transactionId: String(result.trxID || ''), paidAt: new Date() } });
    await this.db.collection('service_cases').updateOne(
      { id: order.caseId, userId: order.userId, kind: 'premium',
        status: { $in: ['pending', 'contacted', 'payment_pending', 'paid'] } },
      { $set: { status: 'active', method: 'bkash',
        transactionReference: String(result.trxID || paymentId),
        paymentId, fee: order.amount, updatedAt: new Date(),serviceStage:'onboarding' } },
    );
    if (update.modifiedCount) await this.audit(order.userId, 'premium.bkash.activated', order.id);
    return { success: true };
  }

  async createPayment(actor: string, pkgId: string) {
    const p = await this.db
      .collection('pricings')
      .findOne({ _id: this.oid(pkgId), disabled: { $ne: true } });
    if (
      !p ||
      !Number.isInteger(p.numberOfConnections) ||
      p.numberOfConnections < 1
    )
      throw new BadRequestException('Invalid connection package');
    const amount = p.discountPrice ?? p.originalPrice;
    if (!Number.isFinite(amount) || amount <= 0)
      throw new BadRequestException('Invalid package price');
    const id = randomUUID();
    await this.db
      .collection('connection_orders')
      .insertOne({
        id,
        userId: actor,
        packageId: pkgId,
        packageName: p.title,
        quantity: p.numberOfConnections,
        amount,
        currency: 'BDT',
        validityDays: p.validityDays || null,
        status: 'pending',
        createdAt: new Date(),
      });
    try {
      const payment = await this.bkash.createPayment(amount, id);
      if (!payment.paymentId || !payment.paymentUrl)
        throw new Error('Payment service unavailable');
      await this.db
        .collection('connection_orders')
        .updateOne({ id }, { $set: { paymentId: payment.paymentId } });
      return payment;
    } catch (e) {
      await this.db
        .collection('connection_orders')
        .updateOne({ id }, { $set: { status: 'failed' } });
      throw new BadRequestException('Unable to create payment. Please retry.');
    }
  }
  async executePayment(paymentId: string) {
    const orders = this.db.collection('connection_orders'),
      order = await orders.findOne({ paymentId });
    if (!order || order.status === 'refunded') return { success: false };
    if (order.status === 'paid') return { success: true };
    let result: any;
    try {
      result = await this.bkash.executePayment(paymentId);
      if (result?.transactionStatus !== 'Completed')
        result = await this.bkash.queryPayment(paymentId);
    } catch {
      result = await this.bkash.queryPayment(paymentId);
    }
    if (
      result?.paymentID !== paymentId ||
      result?.transactionStatus !== 'Completed' ||
      Number(result.amount) !== order.amount ||
      result.currency !== 'BDT' ||
      (result.payerReference !== order.id &&
        result.merchantInvoiceNumber !== order.id)
    )
      return { success: false };
    // Grant + deduplication key live in the same atomic MongoDB user update.
    await this.users.collection.updateOne(
      { _id: this.oid(order.userId), creditedPaymentIds: { $ne: paymentId } },
      {
        $inc: { numberOfConnections: order.quantity },
        $addToSet: { creditedPaymentIds: paymentId } as any,
        $push: {
          connectionGrants: {
            id: paymentId,
            quantity: order.quantity,
            used: 0,
            status: 'active',
            packageId: order.packageId,
            packageName: order.packageName,
            createdAt: new Date(),
            expiresAt: order.validityDays
              ? new Date(Date.now() + order.validityDays * 86400000)
              : null,
          },
        } as any,
      },
    );
    const credited = await this.users.collection.findOne({
      _id: this.oid(order.userId),
      creditedPaymentIds: paymentId,
    });
    if (!credited) return { success: false };
    await orders.updateOne(
      { paymentId, status: { $ne: 'refunded' } },
      {
        $set: {
          status: 'paid',
          transactionId: result.trxID,
          paidAt: new Date(),
        },
      },
    );
    return { success: true };
  }
  /** Existing service_cases collection; member account remains usable after approval. */
  async myDeletionRequest(actor: string) {
    return this.db.collection('service_cases').findOne(
      { userId: actor, kind: 'deletion' },
      { projection: { _id: 0, id: 1, kind: 1, status: 1,
          createdAt: 1, updatedAt: 1, reviewedAt: 1, decisionReason: 1 },
        sort: { createdAt: -1 } },
    );
  }

  async requestBiodataDeletion(actor: string, payload: any = {}) {
    const member: any = await this.users.findById(actor)
      .select('role biodataStatus deletionRequested').lean();
    if (!member || member.role !== UserType.USER)
      throw new ForbiddenException('Only members can request biodata deletion');
    const existing = await this.myDeletionRequest(actor);
    if (member.biodataStatus === 'deleted') {
      if (existing?.status === 'approved') return existing;
      throw new BadRequestException('This biodata was already removed');
    }
    if (existing && ['pending', 'contacted'].includes(existing.status)) return existing;
    const reserved = await this.users.updateOne(
      { _id: this.oid(actor), role: UserType.USER, deletionRequested: { $ne: true },
        biodataStatus: { $ne: 'deleted' } },
      { $set: { deletionRequested: true } },
    );
    if (!reserved.modifiedCount) {
      const pending = await this.myDeletionRequest(actor);
      if (pending && ['pending', 'contacted'].includes(pending.status)) return pending;
      throw new BadRequestException('A deletion request is being processed. Refresh its status.');
    }
    const c = { id: randomUUID(), userId: actor, kind: 'deletion',
      message: String(payload?.message || '').trim().slice(0, 1000),
      status: 'pending', createdAt: new Date(), updatedAt: new Date() };
    try {
      await this.db.collection('service_cases').insertOne(c);
    } catch (error) {
      await this.users.updateOne(
        { _id: this.oid(actor), biodataStatus: { $ne: 'deleted' } },
        { $set: { deletionRequested: false } },
      );
      throw error;
    }
    await this.audit(actor, 'deletion.request', c.id);
    return { id: c.id, kind: c.kind, status: c.status, createdAt: c.createdAt,
      updatedAt: c.updatedAt };
  }

  async createCase(actor: string, kind: string, p: any) {
    if (!['premium', 'report', 'deletion', 'support'].includes(kind))
      throw new BadRequestException('Invalid request type');
    if (kind === 'deletion') return this.requestBiodataDeletion(actor, p);
    if (kind === 'report' && !p.targetId)
      throw new BadRequestException('Profile is required');
    if (kind === 'premium') {
      const u = await this.users.findById(actor).lean();
      const config = await this.questionConfig.get();
      if (!u || completion(u,config.questions).percentage < 100)
        throw new BadRequestException(
          'Please submit your completed biodata first.',
        );
    }
    const existing = await this.db
      .collection('service_cases')
      .findOne({
        userId: actor,
        kind,
        status: {
          $in: ['pending', 'contacted', 'payment_pending', 'paid', 'active'],
        },
      });
    if (existing && kind !== 'report') return existing;
    const premium = kind === 'premium'
      ? resolvePremiumSettings((await this.db.collection('platform_settings').findOne({ key: 'public' }))?.premium)
      : null;
    if (premium && (!premium.visible || !premium.enabled))
      throw new BadRequestException('Premium applications are currently unavailable');
    const c = {
      id: randomUUID(),
      userId: actor,
      kind,
      targetId: p.targetId || null,
      message: String(p.message || '').slice(0, 2000),
      status: 'pending',
      fee: premium ? premiumTotal(premium) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.db.collection('service_cases').insertOne(c);
    await this.audit(actor, kind + '.request', c.id);
    return c;
  }
  async myCases(actor: string) {
    return this.db
      .collection('service_cases')
      .find({ userId: actor }, { projection: { adminNotes: 0, assignedTo: 0 } })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
  }
  async adminCases() {
    return this.db
      .collection('service_cases')
      .find({})
      .sort({ updatedAt: -1 })
      .limit(200)
      .toArray();
  }
  /** Admin-only decision. A request alone NEVER removes profile data. */
  private async reviewBiodataDeletion(actor: string, c: any, payload: any) {
    const admin: any = await this.users.findById(actor).select('role').lean();
    if (admin?.role !== UserType.ADMIN)
      throw new ForbiddenException('Only administrators can approve or reject deletion');
    if (!['pending', 'contacted'].includes(c.status) ||
        !['approved', 'rejected'].includes(payload.status))
      throw new BadRequestException('Deletion request is no longer awaiting a decision');
    const reason = typeof payload.reason === 'string' ? payload.reason.trim() : '';
    if (reason.length < 5)
      throw new BadRequestException('A review reason of at least five characters is required');
    if (payload.status === 'approved' && payload.confirmDeletion !== true)
      throw new BadRequestException('Explicit approval confirmation is required');
    if (payload.status === 'approved') {
      const member: any = await this.users.findById(c.userId)
        .select('role biodataStatus').lean();
      if (!member || member.role !== UserType.USER)
        throw new NotFoundException('Member no longer exists');
    }
    const cases = this.db.collection('service_cases');
    const reviewedAt = new Date();
    const updated = await cases.findOneAndUpdate(
      { id: c.id, status: c.status },
      { $set: {
        status: payload.status, decisionReason: reason,
        reviewedBy: actor, reviewedAt, updatedAt: reviewedAt,
        adminNotes: String(payload.adminNotes || c.adminNotes || '').slice(0, 4000),
      } },
      { returnDocument: 'after' },
    );
    if (!updated) throw new BadRequestException('Request changed. Refresh and retry.');
    try {
      if (payload.status === 'approved') {
        // Preserve authentication, contact, payments and the user's audit trail;
        // remove biodata answers only AFTER an administrator approves.
        const clear = Object.fromEntries(
          PROFILE_FIELDS.filter((key) => key !== 'name').map((key) => [key, '']),
        );
        const result = await this.users.updateOne(
          { _id: this.oid(c.userId), role: UserType.USER },
          { $set: {
              isPublished: false, isPublishFromAdmin: false,
              biodataStatus: 'deleted', deletionRequested: true,
              verificationStatus: 'pending', statusReason: '',
              deletedAt: reviewedAt, draftStep: 0,
            },
            $unset: clear,
          },
        );
        if (!result.matchedCount) throw new NotFoundException('Member unavailable');
      } else {
        await this.users.updateOne(
          { _id: this.oid(c.userId), role: UserType.USER },
          { $set: { deletionRequested: false } },
        );
      }
    } catch (error) {
      // A failed biodata update must not leave a falsely completed decision.
      await cases.updateOne(
        { id: c.id, status: payload.status, reviewedBy: actor },
        { $set: { status: c.status, updatedAt: new Date() },
          $unset: { decisionReason: '', reviewedAt: '', reviewedBy: '' } },
      );
      throw error;
    }
    await this.audit(actor, 'deletion.' + payload.status, c.id, reason);
    return updated;
  }

  async caseAction(actor: string, id: string, p: any) {
    const cases = this.db.collection('service_cases'),
      c = await cases.findOne({ id });
    if (!c) throw new NotFoundException('Request unavailable');
    if (c.kind === 'deletion' && p?.status)
      return this.reviewBiodataDeletion(actor, c, p);
    const allowed: any = {
      pending: ['contacted', 'rejected'],
      contacted: ['payment_pending', 'approved', 'rejected', 'active'],
      payment_pending: ['paid', 'rejected'],
      paid: ['active', 'refunded'],
      active: ['completed', 'refunded', 'rejected'],
    };
    if (
      p.status &&
      p.status !== c.status &&
      !allowed[c.status]?.includes(p.status)
    )
      throw new BadRequestException('Invalid status transition');
    if (p.status === 'paid' && (!p.transactionReference || !p.reason))
      throw new BadRequestException(
        'Verified payment reference and reason are required',
      );
    if (
      c.kind === 'premium' &&
      p.status === 'active' &&
      !['paid', 'active'].includes(c.status)
    )
      throw new BadRequestException('Confirm payment before activation');
    await this.audit(
      actor,
      'case.' + (p.status || 'note'),
      id,
      String(p.reason || ''),
    );
    const updated = await cases.findOneAndUpdate(
      { id, status: c.status },
      {
        $set: {
          status: p.status || c.status,
          adminNotes: String(p.adminNotes || c.adminNotes || '').slice(0, 4000),
          assignedTo: p.assignedTo || c.assignedTo || null,
          transactionReference:
            p.transactionReference || c.transactionReference || null,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' },
    );
    if (!updated)
      throw new BadRequestException('Request changed. Refresh and retry.');
    if (c.kind === 'premium' && p.status === 'active') {
      if (!['paid', 'active'].includes(c.status))
        throw new BadRequestException('Confirm payment before activation');
      const existingMember:any=await this.users.findById(c.userId).select('premiumService').lean();
      const set:any={isSubscriber:true};
      if(!existingMember?.premiumService){
        const settings=resolvePremiumSettings((await this.db.collection('platform_settings')
          .findOne({key:'public'}))?.premium);
        set.premiumService=premiumEntitlement(settings,new Date(),'admin');
      }
      await this.users.updateOne(
        { _id: c.userId,role:UserType.USER },
        { $set:set },
      );
    }
    if (c.kind === 'premium' && p.status === 'refunded')
      await this.users.updateOne(
        { _id: c.userId },
        { $set: { isSubscriber: false,'premiumService.stage':'paused' } },
      );
    if (c.kind === 'report' && p.status === 'approved')
      await this.users.updateOne(
        { _id: c.targetId },
        {
          $set: { isPublishFromAdmin: false, verificationStatus: 'suspended' },
        },
      );

    return updated;
  }
  async remind(actor: string, userId: string, p: any) {
    const u: any = await this.users.findById(userId).lean();
    if (!u) throw new NotFoundException('Account unavailable');
    const subject = p.channel === 'email' ? u.email : u.phoneNumber;
    if (!subject) throw new BadRequestException('Contact address unavailable');
    const text = String(
      p.message ||
        'আসসালামু আলাইকুম। আপনার Niqaha.com বায়োডাটা সম্পন্ন করুন: https://niqaha.com/login । সহযোগিতা: 01748919251',
    ).slice(0, 1500);
    const id = randomUUID();
    try {
      await this.messages.send(
        subject,
        text,
        'আপনার Niqaha.com বায়োডাটা সম্পূর্ণ করুন',
      );
      await this.db
        .collection('reminder_history')
        .insertOne({
          id,
          userId,
          actor,
          channel: p.channel,
          status: 'sent',
          createdAt: new Date(),
        });
      return { message: 'Reminder sent' };
    } catch (e) {
      await this.db
        .collection('reminder_history')
        .insertOne({
          id,
          userId,
          actor,
          channel: p.channel,
          status: 'failed',
          reason: 'Delivery failed or provider unavailable',
          createdAt: new Date(),
        });
      throw e;
    }
  }
  async visit(actor: string, target: string) {
    if (actor === target) return { success: true };
    await this.profile(target, actor);
    const day = new Date().toISOString().slice(0, 10);
    const r = await this.db
      .collection('profile_visits')
      .updateOne(
        { profileId: target, visitor: actor, day },
        { $setOnInsert: { createdAt: new Date() } },
        { upsert: true },
      );
    if (r.upsertedCount) {
      await this.users.updateOne(
        { _id: target },
        { $inc: { profileViews: 1 } },
      );
      await recordDiscoveryEvent(this.db, target, 'views')
        .catch((error) => this.logger.warn('Could not update discovery view score: ' + String(error)));
    }
    return { success: true };
  }
  /** Admin-only, reciprocal, explainable matching. No private identity fields in results. */
  async adminMatches(target: string, page = 1, limit = 12) {
    const search = String(target || '').trim();
    const digits = search.replace(/[^\d]/g, '');
    const phoneOptions = new Set([search]);
    if (/^(?:\+?88)?01[3-9]\d{8}$/.test(search)) {
      phoneOptions.add(digits.startsWith('88') ? '0' + digits.slice(2) : digits);
      phoneOptions.add(digits.startsWith('88') ? digits : '88' + digits);
      phoneOptions.add('+' + (digits.startsWith('88') ? digits : '88' + digits));
    }
    const source: any = await this.users.findOne(
      Types.ObjectId.isValid(search) ? { _id: search } :
        { $or: [{ userId: search }, { email: search.toLowerCase() },
          { phoneNumber: { $in: [...phoneOptions] } }] },
    ).lean();
    if (!source || source.role !== UserType.USER || source.biodataStatus === 'deleted')
      throw new NotFoundException('Member not found');
    if (!['male', 'female'].includes(source.gender))
      throw new BadRequestException('Member gender is required');
    const settings = await this.db.collection('platform_settings').findOne({key:'public'});
    const schema = await this.questionConfig.get();
    const candidates = this.users.find({
      ...visibleFilter, role: UserType.USER,
      biodataStatus: { $ne:'deleted' },
      gender: source.gender === 'male' ? 'female':'male',
      _id: { $ne: source._id },
    }).select('userId gender age maritalStatus createdAt isSubscriber expectedLifePartner address educationInfo personalInformation occupational familyInfo').lean().cursor();
    // Preference explanations can only use the fields configured for public visibility.
    const clean = (member: any) => {
      const item = publicProfile(member);
      this.questionConfig.applyPublicVisibility(item,schema);
      return item;
    };
    const all: ReturnType<typeof reciprocalMatch>[] = [];
    for await (const candidate of candidates) {
      const match = reciprocalMatch(
        { ...clean(source), expectedLifePartner: source.expectedLifePartner },
        { ...clean(candidate), expectedLifePartner: candidate.expectedLifePartner },
        settings || {},
      );
      if(match.score !== null) {
        match.profile = clean(candidate);
        all.push(match);
      }
    }
    all.sort(compareReciprocal);
    const currentPage = Math.max(1, Math.min(1000, Math.floor(Number(page)||1)));
    const pageSize = Math.max(1, Math.min(24, Math.floor(Number(limit)||12)));
    return { source: { _id:source._id,userId:source.userId,name:source.name },
      profiles:all.slice((currentPage-1)*pageSize,currentPage*pageSize),
      total:all.length,page:currentPage,limit:pageSize,
      message:'Scores compare both members\' stated preferences, not marriage compatibility.' };
  }

  /** Admin can recommend to the searched member only, or to both members.
   * Both actions preserve independent per-recipient records and SMS eligibility. */
  async recommendPair(actor: string, memberId: string, candidateId: string,
    recipientScope:'both'|'source'='both') {
    if(recipientScope!=='both' && recipientScope!=='source')
      throw new BadRequestException('Invalid recommendation recipient scope');
    if(memberId === candidateId || !Types.ObjectId.isValid(memberId) ||
      !Types.ObjectId.isValid(candidateId))
      throw new BadRequestException('Select two different valid members');
    const members: any[] = await this.users.find({
      _id:{$in:[this.oid(memberId),this.oid(candidateId)]},
      role:UserType.USER,biodataStatus:{$ne:'deleted'},
    }).lean();
    if(members.length!==2 || members.some(m=>m.verificationStatus==='suspended'))
      throw new BadRequestException('Both members must have active accounts');
    const [a,b] = [members.find(m=>String(m._id)===memberId),members.find(m=>String(m._id)===candidateId)];
    if(!a || !b || a.gender===b.gender || !['male','female'].includes(a.gender) ||
      !['male','female'].includes(b.gender))
      throw new BadRequestException('Select members of opposite genders');
    if(![a,b].every(m=>m.isPublished && m.isPublishFromAdmin &&
      m.verificationStatus!=='rejected'))
      throw new BadRequestException('Both biodata must be published before recommendations');
    const now = new Date();
    const operations = [
      {updateOne:{filter:{recipientId:memberId,candidateId},
        update:{$set:{updatedAt:now,actor},$setOnInsert:{createdAt:now}},upsert:true}},
      ...(recipientScope==='both' ? [{updateOne:{filter:{recipientId:candidateId,candidateId:memberId},
        update:{$set:{updatedAt:now,actor},$setOnInsert:{createdAt:now}},upsert:true}}] : []),
    ];
    const write = await this.db.collection('member_recommendations').bulkWrite(operations);
    await this.audit(actor,recipientScope==='both'?'matching.admin.recommend':'matching.admin.recommend.source_only',
      memberId,candidateId);
    // Only a newly inserted recommendation to an active subscriber triggers SMS.
    // For source-only, the candidate is neither written nor notified.
    const upserts = write.upsertedIds || {};
    const targets = premiumRecommendationSmsTargets([
      {...a,isNew:Object.prototype.hasOwnProperty.call(upserts,'0')},
      ...(recipientScope==='both' ? [{...b,isNew:Object.prototype.hasOwnProperty.call(upserts,'1')}] : []),
    ]);
    const publicUrl = (process.env.FRONTEND_URL || 'https://niqaha.com').replace(/\/$/,'');
    const notified = await Promise.allSettled((this.sms ? targets : []).map(async recipient => {
      const other = recipient.id === memberId ? b : a;
      await this.sms!.sendSms({
        number:recipient.number,
        message:`Niqaha: Apnar jonno notun biodata suparish ache. Dekhun: ${publicUrl}/profile/recommendations (Biodata: ${other.userId || 'new'})`,
      });
    }));
    if (notified.some(result=>result.status==='rejected'))
      this.logger.warn('One or more premium recommendation SMS notifications failed');
    return {message:recipientScope==='both'
        ? 'Recommendations saved for both members'
        : 'Recommendation saved for the searched member only',
      recipientScope,
      smsSent:notified.filter(result=>result.status==='fulfilled').length,
      smsFailed:targets.length-notified.filter(result=>result.status==='fulfilled').length};
  }

  /** Hide a recommendation only for the authenticated recipient. Keep the
   * original record for audits/sent-counts and the other member's list. */
  async dismissRecommendation(actor:string,candidateId:string) {
    this.oid(candidateId);
    const result=await this.db.collection('member_recommendations').updateOne(
      {recipientId:actor,candidateId,dismissedAt:{$exists:false}},
      {$set:{dismissedAt:new Date()}},
    );
    if(!result.matchedCount)throw new NotFoundException('Recommendation not found');
    return {message:'Recommendation removed from your list'};
  }

  async myRecommendations(actor:string) {
    const docs = await this.db.collection('member_recommendations')
      .find({recipientId:actor,dismissedAt:{$exists:false}}).sort({updatedAt:-1}).limit(50).toArray();
    const ids = docs.map(d=>this.oid(d.candidateId));
    const profiles:any[] = await this.users.find({
      _id:{$in:ids},...visibleFilter,role:UserType.USER,
      biodataStatus:{$ne:'deleted'},
    }).lean();
    const schema=await this.questionConfig.get();
    const byId = new Map(profiles.map(p=>[String(p._id),p]));
    return {recommendations:docs.flatMap(doc=>{
      const profile=byId.get(doc.candidateId);
      if(!profile)return [];
      const safe=publicProfile(profile);
      this.questionConfig.applyPublicVisibility(safe,schema);
      return [{profile:safe,createdAt:doc.createdAt,updatedAt:doc.updatedAt}];
    })};
  }

  async matches(actor: string, page = 1, limit = 12) {
    const currentPage = Number.isFinite(page) ? Math.max(1, Math.min(100, Math.floor(page))) : 1;
    const pageSize = Number.isFinite(limit) ? Math.max(1, Math.min(24, Math.floor(limit))) : 12;
    const u: any = await this.users.findById(actor)
      .select('gender role verificationStatus expectedLifePartner').lean();
    if (!u || u.verificationStatus === 'suspended' || u.role !== 'user' ||
        !['male', 'female'].includes(u.gender))
      return { profiles: [], page: currentPage, limit: pageSize, total: 0,
        preferenceCount: 0, message: 'আপনার বায়োডাটায় লিঙ্গের তথ্য পূরণ করুন।' };
    const preferenceCount = countMatchPreferences(u);
    if (!preferenceCount)
      return { profiles: [], page: currentPage, limit: pageSize, total: 0,
        preferenceCount: 0, message: 'প্রত্যাশিত জীবনসঙ্গীর তথ্য পূরণ করলে ম্যাচ দেখা যাবে।' };
    const settings = await this.db.collection('platform_settings').findOne({ key: 'public' });
    if (settings?.discoveryEnabled === false)
      return { profiles: [], page: currentPage, limit: pageSize, total: 0,
        preferenceCount, message: 'ম্যাচিং সুবিধা বর্তমানে বন্ধ আছে।' };
    const schema = await this.questionConfig.get();
    const allowed = new Set(
      schema.questions.filter((q) => q.enabled && q.showPublic &&
        (q.gender === 'both' || q.gender === (u.gender === 'male' ? 'female' : 'male')))
        .map((q) => q.path),
    );
    // Non-public answers are never used for a score or an explanation.
    const projection = ['_id', 'userId', 'createdAt', 'age', 'gender',
      'maritalStatus', 'isPublished', 'isPublishFromAdmin', 'isSubscriber',
      'verificationStatus', ...MATCH_FIELD_PATHS]
      .filter((field) => !MATCH_FIELD_PATHS.includes(field) || allowed.has(field))
      .join(' ');
    const opposite = u.gender === 'male' ? 'female' : 'male';
    const query = this.users.find({
      ...visibleFilter, role: UserType.USER, gender: opposite,
      _id: { $ne: u._id },
    }).select(projection).sort({ _id: -1 }).lean().cursor();
    const all: ReturnType<typeof scoreMatch>[] = [];
    for await (const candidate of query) {
      const safe = publicProfile(candidate);
      this.questionConfig.applyPublicVisibility(safe, schema);
      const scored = scoreMatch(u, safe, settings || {});
      if (scored.score !== null && scored.score >=
          Math.max(0, Number(settings?.minMatchScore ?? 0) || 0)) all.push(scored);
    }
    all.sort(compareMatches);
    return {
      profiles: all.slice((currentPage - 1) * pageSize, currentPage * pageSize),
      page: currentPage, limit: pageSize, total: all.length, preferenceCount,
      message: 'এই স্কোর আপনার উল্লেখ করা শর্তগুলোর হিসাব; সম্পর্কের নিশ্চয়তা নয়।',
    };
  }
  async discovery() {
    const today = new Date();
    const { cycle } = discoveryCycle(today);
    const eligible = { ...visibleFilter, role: UserType.USER };
    const [ranked, newest, underexposed] = await Promise.all([
      // A real 15-day leaderboard: historical/lifetime totals never affect rank.
      this.db.collection('discovery_engagement').aggregate([
        { $match: { cycle, score: { $gt: 0 } } },
        { $sort: { score: -1, _id: 1 } },
        { $lookup: {
            from: this.users.collection.name,
            localField: 'profileId', foreignField: '_id', as: 'member',
          },
        },
        { $unwind: '$member' },
        { $replaceRoot: { newRoot: { $mergeObjects: [
          '$member',
          { cycleEngagement: {
            views: { $ifNull: ['$views', 0] },
            favourites: { $ifNull: ['$favourites', 0] },
            connections: { $ifNull: ['$connections', 0] },
          } },
        ] } } },
        { $match: eligible },
        { $limit: 32 },
      ]).toArray(),
      this.users.find(eligible).sort({ createdAt: -1, _id: -1 }).limit(32).lean(),
      // Low-engagement members rotate every day, independently of lifetime fame.
      this.users.aggregate([
        { $match: eligible },
        { $lookup: {
          from: 'discovery_engagement',
          let: { memberId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [
              { $eq: ['$profileId', '$$memberId'] },
              { $eq: ['$cycle', cycle] },
            ] } } },
            { $project: { score: 1, _id: 0 } },
          ],
          as: 'periodEngagement',
        } },
        { $addFields: {
          cycleScore: { $ifNull: [{ $arrayElemAt: ['$periodEngagement.score', 0] }, 0] },
        } },
        { $match: { cycleScore: { $lte: 10 } } },
        { $addFields: { dailyRotation: dailyRotationExpression(today) } },
        { $sort: { dailyRotation: 1, _id: 1 } },
        { $limit: 32 },
      ]),
    ]);
    const selection = selectDiscovery(ranked, newest, underexposed, today);
    // The badge and its displayed numbers both refer to the CURRENT cycle.
    // Personal lifetime engagement totals remain untouched in user accounts.
    const safe = (u: any) => ({
      ...publicProfile(u),
      discoverySource: u.discoverySource,
      ...(u.rankingPosition ? { rankingPosition: u.rankingPosition } : {}),
      engagement: {
        views: Math.max(0, Number(u.cycleEngagement?.views) || 0),
        favourites: Math.max(0, Number(u.cycleEngagement?.favourites) || 0),
        connections: Math.max(0, Number(u.cycleEngagement?.connections) || 0),
      },
    });
    return {
      popular: selection.popular.map(safe),
      recent: selection.recent.map(safe),
    };
  }
  /** Finance overview: only confirmed settled orders are revenue; pending and credits are not. */
  async adminIncome() {
    const projection={_id:0,id:1,status:1,amount:1,currency:1,paidAt:1,refundedAt:1,paymentId:1,transactionId:1,refundReference:1};
    const [connections,premium]=await Promise.all([
      this.db.collection('connection_orders').find({status:{$in:['paid','refunded']}},{projection}).toArray(),
      this.db.collection('premium_orders').find({status:{$in:['paid','refunded']}},{projection}).toArray(),
    ]);
    return buildIncomeReport(connections as unknown as SettledOrder[],premium as unknown as SettledOrder[]);
  }
  async summary(actor: string) {
    const u: any = await this.users.findById(actor).lean();
    if (!u) throw new NotFoundException('Account unavailable');
    const config=await this.questionConfig.get();
    const profileCompletion=describeProfileCompletion(u,config).completion;
    const stage=biodataStage(u,profileCompletion.percentage);
    return {
      completion: profileCompletion,
      biodataStage: stage,
      alreadySubmitted: hasSubmittedBiodata(u),
      submittedAt: u.submittedAt || null,
      accountType: premiumIsActive(u) ? 'premium' : 'general',
      premiumService: u.premiumService ? {
        stage:u.premiumService.stage,expiresAt:u.premiumService.expiresAt,
        startedAt:u.premiumService.startedAt,assistedAllowance:u.premiumService.assistedAllowance,
        assistedUsed:u.premiumService.assistedUsed,
      } : null,
      verificationStatus:
        u.verificationStatus || (u.isPublishFromAdmin ? 'approved' : 'pending'),
      biodataStatus: u.biodataStatus || 'draft',
      statusReason: u.statusReason || '',
      profileViews: u.profileViews || 0,
      journey: {
        created: true,
        completed: profileCompletion.percentage === 100,
        submitted: hasSubmittedBiodata(u),
        underReview: stage === 'under_review',
        approved: stage === 'published',
        published: stage === 'published',
      },
      connections: await this.connections(actor),
    };
  }

  async adjust(actor: string, id: string, p: any) {
    const paymentId = 'adjustment:' + p.requestId;
    const before: any = await this.users
      .findById(id)
      .select('numberOfConnections')
      .lean();
    if (!before) throw new NotFoundException('Account unavailable');
    const result = await this.users.collection.updateOne(
      { _id: this.oid(id), creditedPaymentIds: { $ne: paymentId } },
      {
        $inc: { numberOfConnections: p.amount },
        $addToSet: { creditedPaymentIds: paymentId } as any,
        $push: {
          connectionGrants: {
            id: paymentId,
            quantity: p.amount,
            used: 0,
            status: 'active',
            source: 'admin',
            actor,
            reason: String(p.reason).slice(0, 500),
            before: before.numberOfConnections || 0,
            after: (before.numberOfConnections || 0) + p.amount,
            createdAt: new Date(),
          },
        } as any,
      },
    );
    if (result.modifiedCount)
      await this.audit(actor, 'connection.adjust', id, String(p.reason));
    return {
      message: result.modifiedCount
        ? 'Adjustment recorded'
        : 'Already recorded',
    };
  }
  async refund(actor: string, id: string, p: any) {
    // This records an already-verified money reversal; it never initiates a gateway refund.
    if (p.confirmMoneyReversed !== true || !p.reason || !p.transactionReference)
      throw new BadRequestException(
        'Verified reversal reference, reason and confirmation are required',
      );
    const order = await this.db
      .collection('connection_orders')
      .findOne({ id, status: { $in: ['paid', 'refunded'] } });
    if (!order) throw new NotFoundException('Paid order unavailable');
    const uid = this.oid(order.userId);
    for (let i = 0; i < 5; i++) {
      const u: any = await this.users.findById(uid).lean(),
        g = u?.connectionGrants?.find((g: any) => g.id === order.paymentId);
      if (!g) throw new BadRequestException('Grant unavailable');
      if (g.status === 'refunded') break;
      const unused = g.status === 'active' ? g.quantity - g.used : 0;
      const history = {
        id: randomUUID(),
        profileId: '',
        paymentId: order.paymentId,
        status: 'refund',
        actor,
        reason: String(p.reason).slice(0, 500),
        createdAt: new Date(),
      };
      const result = await this.users.collection.updateOne(
        {
          _id: uid,
          connectionGrants: {
            $elemMatch: { id: g.id, used: g.used, status: g.status },
          },
        },
        [
          {
            $set: {
              numberOfConnections: {
                $subtract: [{ $ifNull: ['$numberOfConnections', 0] }, unused],
              },
              connectionGrants: {
                $map: {
                  input: '$connectionGrants',
                  as: 'g',
                  in: {
                    $cond: [
                      { $eq: ['$$g.id', order.paymentId] },
                      { $mergeObjects: ['$$g', { status: 'refunded' }] },
                      '$$g',
                    ],
                  },
                },
              },
              connectionUnlocks: {
                $concatArrays: [
                  {
                    $map: {
                      input: { $ifNull: ['$connectionUnlocks', []] },
                      as: 'x',
                      in: {
                        $cond: [
                          { $eq: ['$$x.paymentId', order.paymentId] },
                          { $mergeObjects: ['$$x', { status: 'revoked' }] },
                          '$$x',
                        ],
                      },
                    },
                  },
                  [{ $literal: history }],
                ],
              },
            },
          },
        ],
      );
      if (result.modifiedCount) break;
      if (i === 4) throw new BadRequestException('Balance changed; retry.');
    }
    await this.db
      .collection('connection_orders')
      .updateOne(
        { id },
        {
          $set: {
            status: 'refunded',
            refundReference: String(p.transactionReference).slice(0, 100),
            refundedAt: new Date(),
            refundActor: actor,
          },
        },
      );
    await this.audit(actor, 'connection.refund', id, String(p.reason));
    return {
      message:
        'Reversal recorded; unused credits removed and linked permissions revoked',
    };
  }

  async verifyManualPayment(actor: string, id: string, p: any) {
    if (p.confirm !== true || !p.reason)
      throw new BadRequestException(
        'Verification confirmation and reason are required',
      );
    const orders = this.db.collection('connection_orders'),
      order = await orders.findOne({
        id,
        paymentId: /^manual:/,
        status: { $in: ['pending_manual', 'paid'] },
      });
    if (!order) throw new NotFoundException('Manual payment unavailable');
    await this.users.collection.updateOne(
      {
        _id: this.oid(order.userId),
        creditedPaymentIds: { $ne: order.paymentId },
      },
      {
        $inc: { numberOfConnections: order.quantity },
        $addToSet: { creditedPaymentIds: order.paymentId } as any,
        $push: {
          connectionGrants: {
            id: order.paymentId,
            quantity: order.quantity,
            used: 0,
            status: 'active',
            packageId: order.packageId,
            packageName: order.packageName,
            createdAt: new Date(),
            expiresAt: order.validityDays
              ? new Date(Date.now() + order.validityDays * 86400000)
              : null,
            verifiedBy: actor,
          },
        } as any,
      },
    );
    const user = await this.users.collection.findOne({
      _id: this.oid(order.userId),
      creditedPaymentIds: order.paymentId,
    });
    if (!user) throw new BadRequestException('Account unavailable');
    await orders.updateOne(
      { id },
      { $set: { status: 'paid', paidAt: new Date(), verifiedBy: actor } },
    );
    await this.audit(actor, 'payment.manual.verify', id, String(p.reason));
    return { message: 'Payment verified and connections granted' };
  }

  async setBalance(
    actor: string,
    id: string,
    target: number,
    reason: string,
    requestId: string,
  ) {
    if (
      !Number.isSafeInteger(target) ||
      target < 0 ||
      target > 100000 ||
      !reason ||
      !requestId
    )
      throw new BadRequestException(
        'Valid balance, reason and request ID are required',
      );
    const uid = this.oid(id),
      key = 'balance:' + requestId;
    for (let i = 0; i < 8; i++) {
      const u: any = await this.users.findById(uid).lean();
      if (!u) throw new NotFoundException('Account unavailable');
      if (u.creditedPaymentIds?.includes(key))
        return { message: 'Already adjusted' };
      const before = u.numberOfConnections || 0,
        delta = target - before;
      if (!delta) return { message: 'Balance unchanged' };
      const grants = (u.connectionGrants || []).map((g: any) => ({ ...g }));
      if (delta > 0)
        grants.push({
          id: key,
          quantity: delta,
          used: 0,
          status: 'active',
          source: 'admin',
          createdAt: new Date(),
        });
      else {
        // Consume legacy unallocated balance first, then remove unused grant credits.
        const allocated = grants
          .filter((g: any) => g.status === 'active')
          .reduce((n: number, g: any) => n + g.quantity - g.used, 0);
        let left = Math.max(0, -delta - Math.max(0, before - allocated));
        for (const g of grants) {
          if (g.status !== 'active' || !left) continue;
          const remove = Math.min(left, g.quantity - g.used);
          g.originalQuantity = g.originalQuantity ?? g.quantity;
          g.quantity -= remove;
          g.adjustedAway = (g.adjustedAway || 0) + remove;
          left -= remove;
        }
        if (left)
          throw new BadRequestException(
            'Cannot adjust below the valid unused balance',
          );
      }
      const filter: any = {
        _id: uid,
        numberOfConnections:
          u.numberOfConnections === undefined ? { $exists: false } : before,
        connectionGrants:
          u.connectionGrants === undefined
            ? { $exists: false }
            : u.connectionGrants,
        creditedPaymentIds: { $ne: key },
      };
      const record = {
        id: key,
        actor,
        before,
        after: target,
        delta,
        reason: String(reason).slice(0, 500),
        createdAt: new Date(),
      };
      const changed = await this.users.collection.updateOne(filter, {
        $set: { numberOfConnections: target, connectionGrants: grants },
        $addToSet: { creditedPaymentIds: key } as any,
        $push: { connectionAdjustments: record } as any,
      });
      if (changed.modifiedCount) {
        await this.audit(actor, 'connection.balance.adjust', id, reason);
        return { message: 'Balance adjustment recorded' };
      }
    }
    throw new BadRequestException('Balance changed; refresh and retry');
  }

  async admirers(actor: string) {
    const current=await this.users.findById(actor).select("verificationStatus").lean();
    if(current?.verificationStatus==="suspended")return [];
    const lists = await this.db
      .collection('shortlists')
      .find({ shortlistedUserId: this.oid(actor) })
      .limit(100)
      .toArray();
    const users = await this.users
      .find({ _id: { $in: lists.map((x) => x.userId) }, ...visibleFilter })
      .lean();
    return users.map((u) => publicProfile(u));
  }
}
