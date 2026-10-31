import {BadRequestException,ConflictException} from '@nestjs/common';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {createConnection,type Connection} from 'mongoose';
import {SeoSettingsService,normalizeSeoScope,validateSeoSettings} from './seo-settings.service';

describe('SEO settings validation and safe fallbacks',()=>{
  it.each(['/','/about','/policies/privacy','/policies/[kind]','/biodata/[id]','@site'])(
    'accepts a valid page scope: %s',scope=>expect(normalizeSeoScope(scope)).toBe(scope));
  it.each(['/api/private','/_next/data','/about?x=1','https://bad.site','/../dashboard','//example.com'])(
    'rejects unsupported scopes: %s',scope=>expect(()=>normalizeSeoScope(scope)).toThrow(BadRequestException));
  it('accepts percent-encoded Bengali blog article paths but rejects encoded traversal',()=>{
    const slug=encodeURIComponent('ইসলামিক-বিবাহ-নির্দেশিকা');
    expect(normalizeSeoScope('/blog/'+slug)).toBe('/blog/'+slug);
    expect(()=>normalizeSeoScope('/blog/%2Fdashboard')).toThrow(BadRequestException);
    expect(()=>normalizeSeoScope('/blog/%2e%2e')).toThrow(BadRequestException);
    expect(()=>normalizeSeoScope('/blog/%')).toThrow(BadRequestException);
  });
  it('validates social URLs, canonical domain and schema JSON',()=>{
    expect(()=>validateSeoSettings({canonical:'https://bad.example/about'})).toThrow(BadRequestException);
    expect(()=>validateSeoSettings({openGraph:{image:'javascript:alert(1)'}})).toThrow(BadRequestException);
    expect(()=>validateSeoSettings({structuredData:'{"@context":"https://attacker.example","@type":"Organization"}'}))
      .toThrow(BadRequestException);
    expect(()=>validateSeoSettings({structuredData:'not json'})).toThrow(BadRequestException);
    const valid=validateSeoSettings({
      title:'About Niqaha',description:'Matrimony information',canonical:'/about',
      robots:{index:false,follow:true,maxSnippet:100,maxImagePreview:'large'},
      openGraph:{image:'/logo.png',title:'Open Graph Title'},
      structuredData:JSON.stringify({'@context':'https://schema.org','@type':'FAQPage'}),
      languages:{'bn':'/','en':'/en'},sitemap:{include:false,priority:0.2},
    });
    expect(valid.title).toBe('About Niqaha');
    expect(valid.robots?.index).toBe(false);
    expect(valid.sitemap?.include).toBe(false);
  });
});
describe('MongoDB SEO drafts, publishing, and revisions',()=>{
  let mongo:MongoMemoryServer,db:Connection,service:SeoSettingsService;
  beforeAll(async()=>{
    mongo=await MongoMemoryServer.create();
    db=await createConnection(mongo.getUri(),{dbName:'seo_editor_tests'}).asPromise();
    service=new SeoSettingsService(db);
    await service.onModuleInit();
  },120000);
  afterAll(async()=>{await db?.close();await mongo?.stop();});
  beforeEach(async()=>{
    await db.collection('seo_page_settings').deleteMany({});
    await db.collection('seo_settings_audit').deleteMany({});
  });
  it('keeps original SEO until publication, then restores fallback without deleting metadata history',async()=>{
    expect((await service.publicPage('/about')).settings).toEqual({});
    let state=await service.save('admin',{scope:'/about',revision:0,
      settings:{title:'Changed page',description:'Published only when ready',
        openGraph:{image:'/share.jpg'},robots:{index:true},
        sitemap:{include:true,priority:0.8}}});
    expect(state.revision).toBe(1);
    expect(state.hasUnpublishedChanges).toBe(true);
    expect((await service.publicPage('/about')).settings).toEqual({});
    state=await service.publish('admin',{scope:'/about',revision:1});
    expect(state.hasUnpublishedChanges).toBe(false);
    expect((await service.publicPage('/about')).settings.title).toBe('Changed page');
    await expect(service.save('different-admin',{scope:'/about',revision:0,
      settings:{title:'Stale'}})).rejects.toBeInstanceOf(ConflictException);
    state=await service.save('admin',{scope:'/about',revision:1,settings:{}});
    expect((await service.publicPage('/about')).settings.title).toBe('Changed page');
    await service.publish('admin',{scope:'/about',revision:state.revision});
    expect((await service.publicPage('/about')).settings).toEqual({});
    expect(await db.collection('seo_settings_audit').countDocuments()).toBe(4);
  });
  it('supports specific URLs and templates with exact overrides winning',async()=>{
    await service.save('admin',{scope:'/policies/[kind]',revision:0,settings:{title:'Policy template'}});
    await service.publish('admin',{scope:'/policies/[kind]',revision:1});
    expect((await service.publicPage('/policies/privacy','/policies/[kind]')).settings.title)
      .toBe('Policy template');
    await service.save('admin',{scope:'/policies/privacy',revision:0,settings:{title:'Privacy only'}});
    // A private draft must not replace the template's published SEO.
    expect((await service.publicPage('/policies/privacy','/policies/[kind]')).settings.title)
      .toBe('Policy template');
    await service.publish('admin',{scope:'/policies/privacy',revision:1});
    expect((await service.publicPage('/policies/privacy','/policies/[kind]')).settings.title)
      .toBe('Privacy only');
    expect((await service.publicPage('/policies/terms','/policies/[kind]')).settings.title)
      .toBe('Policy template');
  });
  it('saves site-wide verification and includes only published sitemap records',async()=>{
    await service.save('admin',{scope:'@site',revision:0,
      settings:{siteName:'Niqaha',verification:{google:'sample-google-token',bing:'sample-bing-token'},
        openGraph:{image:'/new-cover.png'}}});
    await service.publish('admin',{scope:'@site',revision:1});
    await service.save('admin',{scope:'/pricing',revision:0,settings:{title:'New pricing page',sitemap:{include:true}}});
    expect(await service.publicSitemap()).toEqual([]);
    await service.publish('admin',{scope:'/pricing',revision:1});
    const config=await service.publicPage('/pricing');
    expect(config.site.verification?.google).toBe('sample-google-token');
    expect(config.settings.title).toBe('New pricing page');
    expect((await service.publicSitemap()).map(x=>x.path)).toEqual(['/pricing']);
    expect((await service.adminPage('/pricing')).publishedAt).not.toBeNull();
  });
});
