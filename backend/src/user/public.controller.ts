import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { PlatformService } from './platform.service';
import { resolvePolicySettings, suppliedPolicies } from './policy-defaults';
import { resolvePremiumSettings } from './premium-settings';
@Controller('public')
export class PublicController {
  constructor(
    private service: PlatformService,
    @InjectConnection() private db: Connection,
  ) {}
  @Get('discovery') async discovery() {
    const s = await this.db
      .collection('platform_settings')
      .findOne({ key: 'public' });
    return s?.discoveryEnabled !== false
      ? this.service.discovery()
      : { popular: [], recent: [] };
  }
  @Get('settings') async settings() {
    const s = resolvePolicySettings(
      await this.db.collection('platform_settings').findOne({ key: 'public' }),
    );
    return {
      messengerUrl: s.messengerUrl || '',
      discoveryEnabled: s.discoveryEnabled !== false,
      premium: resolvePremiumSettings(s.premium),
      policies: Object.fromEntries(
        ['terms', 'privacy', 'refund'].map((k) => [k, !!s[k + 'Published']]),
      ),
    };
  }
  @Get('policy/:kind') async policy(@Param('kind') kind: string) {
    if (!['terms', 'privacy', 'refund'].includes(kind))
      throw new NotFoundException();
    const s = resolvePolicySettings(
      await this.db.collection('platform_settings').findOne({ key: 'public' }),
    );
    if (!s[kind + 'Published'] || !s[kind])
      throw new NotFoundException({
        message: 'Policy is not published',
        policyHidden: true,
      });
    const source =
      kind === 'terms' || kind === 'refund'
        ? suppliedPolicies[kind]
        : undefined;
    return {
      kind,
      text: s[kind],
      title: source?.title,
      blocks: source && source.text === s[kind] ? source.blocks : undefined,
      sourceHash: source && source.text === s[kind] ? source.sha256 : undefined,
      updatedAt: s.updatedAt,
    };
  }
}
