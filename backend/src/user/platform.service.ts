import { rankMatches } from './matching';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { User, UserDocument } from './entities/user.entity';
import { BkashService } from './bkash.service';
import { MessagingService } from './messaging.service';
import { completion, publicProfile, visibleFilter } from './profile-rules';
import { QuestionConfigService } from '../profile-questions/question-config.service';

@Injectable()
export class PlatformService implements OnModuleInit {
  constructor(
    @InjectConnection() private db: Connection,
    @InjectModel(User.name) private users: Model<UserDocument>,
    private bkash: BkashService,
    private messages: MessagingService,
    private questionConfig: QuestionConfigService,
  ) {}
  async onModuleInit() {
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
  async createCase(actor: string, kind: string, p: any) {
    if (!['premium', 'report', 'deletion', 'support'].includes(kind))
      throw new BadRequestException('Invalid request type');
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
    const c = {
      id: randomUUID(),
      userId: actor,
      kind,
      targetId: p.targetId || null,
      message: String(p.message || '').slice(0, 2000),
      status: 'pending',
      fee: kind === 'premium' ? 1000 : null,
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
  async caseAction(actor: string, id: string, p: any) {
    const cases = this.db.collection('service_cases'),
      c = await cases.findOne({ id });
    if (!c) throw new NotFoundException('Request unavailable');
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
      await this.users.updateOne(
        { _id: c.userId },
        { $set: { isSubscriber: true } },
      );
    }
    if (c.kind === 'premium' && p.status === 'refunded')
      await this.users.updateOne(
        { _id: c.userId },
        { $set: { isSubscriber: false } },
      );
    if (c.kind === 'report' && p.status === 'approved')
      await this.users.updateOne(
        { _id: c.targetId },
        {
          $set: { isPublishFromAdmin: false, verificationStatus: 'suspended' },
        },
      );
    if (c.kind === 'deletion' && p.status === 'approved')
      await this.users.updateOne(
        { _id: c.userId },
        {
          $set: {
            isPublished: false,
            isPublishFromAdmin: false,
            verificationStatus: 'suspended',
            deletionRequested: true,
          },
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
    if (r.upsertedCount)
      await this.users.updateOne(
        { _id: target },
        { $inc: { profileViews: 1 } },
      );
    return { success: true };
  }
  async matches(actor: string) {
    const u: any = await this.users.findById(actor).lean();
    if (!u || u.verificationStatus==="suspended" || !u.gender)
      return {
        profiles: [],
        message: 'Complete your biodata to receive suggestions',
      };
    const candidates: any[] = await this.users
      .find({
        ...visibleFilter,
        gender: u.gender === 'male' ? 'female' : 'male',
        _id: { $ne: actor },
      })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    const settings = await this.db
      .collection('platform_settings')
      .findOne({ key: 'public' });
    const scored = rankMatches(u, candidates, settings || {});
    return {
      profiles: scored,
      message: 'Suggestions are based on stated preferences, not a guarantee.',
    };
  }
  async discovery() {
    const [popular, recent] = await Promise.all([
      this.users.aggregate([
        { $match: visibleFilter },
        {
          $addFields: {
            rank: {
              $add: [
                { $ifNull: ['$profileViews', 0] },
                { $multiply: [3, { $ifNull: ['$profileInterests', 0] }] },
                { $multiply: [5, { $ifNull: ['$profileContactRequests', 0] }] },
              ],
            },
          },
        },
        { $sort: { rank: -1, createdAt: -1 } },
        { $limit: 6 },
      ]),
      this.users.find(visibleFilter).sort({ createdAt: -1 }).limit(6).lean(),
    ]);
    return {
      popular: popular.map((x) => publicProfile(x)),
      recent: recent.map((x) => publicProfile(x)),
    };
  }
  async summary(actor: string) {
    const u: any = await this.users.findById(actor).lean();
    if (!u) throw new NotFoundException('Account unavailable');
    const config=await this.questionConfig.get();
    const profileCompletion=completion(u,config.questions);
    return {
      completion: profileCompletion,
      accountType: u.isSubscriber ? 'premium' : 'general',
      verificationStatus:
        u.verificationStatus || (u.isPublishFromAdmin ? 'approved' : 'pending'),
      biodataStatus: u.biodataStatus || 'draft',
      statusReason: u.statusReason || '',
      profileViews: u.profileViews || 0,
      journey: {
        created: true,
        completed: profileCompletion.percentage === 100,
        submitted: ['submitted', 'approved'].includes(u.biodataStatus),
        approved: u.isPublishFromAdmin,
        published: u.isPublished,
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
