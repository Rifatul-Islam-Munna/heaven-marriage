import {BadRequestException,ConflictException,NotFoundException} from '@nestjs/common';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {createConnection,type Connection} from 'mongoose';
import {
  BlogService,slugify,safeBlogUrl,validateBlogDocument,validateDraft,articleText,
  type BlogDocument,
} from './blog.service';

const original:BlogDocument={type:'doc',content:[
  {type:'paragraph',content:[
    {type:'text',text:'Important article text is preserved across changes. '},
    {type:'text',text:'A longer helpful explanation for readers.',marks:[{type:'bold'}]},
  ]},
  {type:'heading',attrs:{level:2},content:[{type:'text',text:'Marriage advice'}]},
  {type:'paragraph',content:[{type:'text',text:'A useful second section.'}]},
]};
const draft=(title='First article')=>({
  title,slug:'first-article',excerpt:'A practical introduction to marriage and family guidance.',
  author:'Niqaha Editorial',category:'Islamic marriage',tags:['marriage','family'],
  cover:{url:'https://example.com/cover.webp',alt:'A family gathering in a bright room'},
  content:original,seoTitle:'Niqaha marriage guide',seoDescription:'Useful and truthful SEO description',
  featured:true,noindex:false,
});

describe('Blog safety and rich text',()=>{
  it('accepts Bangla and English titles as clean URL slugs',()=>{
    expect(slugify('How to marry well 2026')).toBe('how-to-marry-well-2026');
    expect(slugify('ইসলামিক বিবাহ নির্দেশিকা')).toMatch(/ইসলামিক/);
  });
  it('rejects script links, unsupported rich blocks and missing image alt',()=>{
    expect(()=>safeBlogUrl('javascript:alert(1)','image')).toThrow(BadRequestException);
    expect(()=>safeBlogUrl('//bad.example/path','image')).toThrow(BadRequestException);
    expect(()=>validateBlogDocument({type:'doc',content:[{type:'iframe',attrs:{src:'https://bad.com'}}]}))
      .toThrow(BadRequestException);
    expect(()=>validateBlogDocument({type:'doc',content:[
      {type:'paragraph',content:[{type:'text',text:'example',marks:[{type:'link',
        attrs:{href:'javascript:alert(1)'}}]}]}]})).toThrow(BadRequestException);
    expect(()=>validateDraft({...draft(),cover:{url:'https://example.com/a.webp',alt:''}}))
      .toThrow(BadRequestException);
  });
  it('retains whitespace between rich-marked text',()=>{
    expect(articleText(validateBlogDocument(original))).toContain('preserved across changes. ');
    expect(validateBlogDocument(original).content[0].content?.[0].text?.endsWith(' ')).toBe(true);
  });
});

describe('MongoDB blog draft/publish and SEO workflow',()=>{
  let mongo:MongoMemoryServer,db:Connection,service:BlogService;
  beforeAll(async()=>{
    mongo=await MongoMemoryServer.create();
    db=await createConnection(mongo.getUri(),{dbName:'blog_workflow_tests'}).asPromise();
    service=new BlogService(db);
    await service.onModuleInit();
  },120000);
  beforeEach(async()=>{
    await db.collection('blog_posts').deleteMany({});
    await db.collection('blog_audit').deleteMany({});
  });
  afterAll(async()=>{await db?.close();await mongo?.stop();});

  it('keeps drafts private; publishes snapshots, revisions and sitemap',async()=>{
    let state=await service.create('admin');
    expect(state.status).toBe('draft');
    expect((await service.listPublic()).total).toBe(0);
    state=await service.save('admin',state.id,{revision:1,draft:draft()});
    expect(state.revision).toBe(2);
    expect((await service.listPublic()).total).toBe(0);
    await expect(service.onePublished('first-article')).rejects.toBeInstanceOf(NotFoundException);
    state=await service.publish('admin',state.id,{revision:2});
    expect(state.status).toBe('published');
    expect(state.revision).toBe(3);
    const publicArticle=await service.onePublished('first-article');
    expect(publicArticle.title).toBe('First article');
    expect(publicArticle.content.content[0].type).toBe('paragraph');
    expect((await service.sitemap()).map(x=>x.slug)).toEqual(['first-article']);

    const edited=await service.save('admin',state.id,{revision:3,draft:{...draft('Edited title'),
      slug:'first-article',excerpt:'An updated summary that should stay private until publish.'}});
    expect(edited.revision).toBe(4);
    expect((await service.onePublished('first-article')).title).toBe('First article');
    await expect(service.publish('admin',state.id,{revision:3})).rejects.toBeInstanceOf(ConflictException);
    state=await service.publish('admin',state.id,{revision:4});
    expect((await service.onePublished('first-article')).title).toBe('Edited title');
    expect(state.publishedAt).toBeTruthy();
    expect(await db.collection('blog_audit').countDocuments()).toBe(5);
  });

  it('supports unpublished articles, archiving, categories, search and noindex',async()=>{
    let one=await service.create('admin');
    one=await service.save('admin',one.id,{revision:1,draft:draft()});
    one=await service.publish('admin',one.id,{revision:2});
    expect((await service.listPublic({category:'Islamic marriage'})).items).toHaveLength(1);
    expect((await service.listPublic({q:'practical'})).items).toHaveLength(1);
    expect((await service.categories())[0].name).toBe('Islamic marriage');
    one=await service.save('admin',one.id,{revision:3,draft:{...draft(),noindex:true}});
    one=await service.publish('admin',one.id,{revision:4});
    expect(await service.sitemap()).toEqual([]);
    one=await service.unpublish('admin',one.id,{revision:5});
    expect((await service.listPublic()).total).toBe(0);
    expect(await service.sitemap()).toEqual([]);
    one=await service.archive('admin',one.id,{revision:6});
    expect(one.status).toBe('archived');
    expect((await service.adminOne(one.id)).draft.title).toBe('First article');
    one=await service.save('admin',one.id,{revision:7,draft:draft()});
    expect(one.status).toBe('draft');
  });

  it('protects published slugs and rejects conflicting URLs',async()=>{
    let first=await service.create('admin');
    first=await service.save('admin',first.id,{revision:1,draft:draft()});
    first=await service.publish('admin',first.id,{revision:2});
    await expect(service.save('admin',first.id,{revision:3,draft:{...draft(),slug:'changed-url'}}))
      .rejects.toBeInstanceOf(BadRequestException);
    let second=await service.create('admin');
    await expect(service.save('admin',second.id,{revision:1,draft:draft()}))
      .rejects.toBeInstanceOf(ConflictException);
    expect((await service.onePublished('first-article')).slug).toBe('first-article');
  });
});
