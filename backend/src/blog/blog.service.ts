import {BadRequestException,ConflictException,Injectable,NotFoundException,OnModuleInit} from '@nestjs/common';
import {InjectConnection} from '@nestjs/mongoose';
import {Connection,Types} from 'mongoose';

export type BlogNode={type:string;text?:string;attrs?:Record<string,unknown>;marks?:{type:string;attrs?:{href:string}}[];content?:BlogNode[]};
export type BlogDocument={type:'doc';content:BlogNode[]};
export type BlogDraft={title:string;slug:string;excerpt:string;category:string;tags:string[];
  author:string;cover:{url:string;alt:string};content:BlogDocument;seoTitle:string;seoDescription:string;
  featured:boolean;noindex:boolean};
export type BlogRecord={slug:string;revision:number;status:'draft'|'published'|'archived';
  draft:BlogDraft;published?:BlogDraft;createdAt:Date;updatedAt:Date;publishedAt?:Date;modifiedAt?:Date;readMinutes?:number;actorId?:string};
const emptyDocument=():BlogDocument=>({type:'doc',content:[{type:'paragraph',content:[]}]});
export const emptyBlogDraft=():BlogDraft=>({title:'',slug:'',excerpt:'',category:'Guides',tags:[],
  author:'Niqaha Editorial',cover:{url:'',alt:''},content:emptyDocument(),
  seoTitle:'',seoDescription:'',featured:false,noindex:false});

export function slugify(title:string):string{
  return title.normalize('NFKC').toLocaleLowerCase('en').trim()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'')
    .slice(0,120).replace(/-+$/g,'');
}
export function normalizeSlug(value:unknown):string{
  if(typeof value!=='string'||value.length>200)throw new BadRequestException('Invalid slug');
  const slug=slugify(value);
  if(slug.length<2||slug.length>120||!/^[\p{L}\p{M}\p{N}]+(?:-[\p{L}\p{M}\p{N}]+)*$/u.test(slug)||
    ['admin','feed','rss','category','tag'].includes(slug))
    throw new BadRequestException('Choose an article URL slug with at least 2 characters');
  return slug;
}
const str=(value:unknown,label:string,max=200):string=>{
  if(value===undefined||value===null)return '';
  if(typeof value!=='string'||value.length>max)throw new BadRequestException('Invalid '+label);
  return value.trim();
};
const obj=(value:unknown,label:string):Record<string,unknown>=>{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new BadRequestException('Invalid '+label);
  return value as Record<string,unknown>;
};
export function safeBlogUrl(value:unknown,label:string,email=false):string {
  const raw=str(value,label,2048);
  if(!raw)return '';
  if(raw.startsWith('/')&&!raw.startsWith('//')&&!/[\s\\<>"']/.test(raw))return raw;
  try{
    const u=new URL(raw);
    if(u.username||u.password||u.hash)throw Error();
    if(u.protocol==='https:'&&u.hostname)return u.toString();
    if(email&&u.protocol==='mailto:'&&/^[^@\s]+@[^@\s]+$/.test(u.pathname))return raw;
    if(process.env.NODE_ENV!=='production'&&u.protocol==='http:'&&
      ['localhost','127.0.0.1'].includes(u.hostname))return u.toString();
  }catch{/* Invalid protocol/URL is rejected below */}
  throw new BadRequestException('Invalid '+label+' URL: use HTTPS or a relative path');
}
const permitted=new Set(['doc','paragraph','heading','text','bulletList','orderedList',
  'listItem','blockquote','codeBlock','horizontalRule','hardBreak','image']);
const formats=new Set(['bold','italic','underline','strike','code','link']);
function validateNode(value:unknown,depth:number,budget:{nodes:number;chars:number}):BlogNode{
  if(depth>14||++budget.nodes>3500)throw new BadRequestException('Article exceeds editor complexity limit');
  const input=obj(value,'article node'),type=str(input.type,'node type',30);
  if(!permitted.has(type))throw new BadRequestException('Unsupported content block: '+type);
  const node:BlogNode={type};
  if(type==='text'){
    if(typeof input.text!=='string'||input.text.length>12000)
      throw new BadRequestException('Invalid article text');
    // Tiptap text-node whitespace is meaningful around bold/link marks.
    node.text=input.text;
    budget.chars+=node.text.length;
    if(budget.chars>180000)throw new BadRequestException('Article text is too long');
    if(input.marks!==undefined){
      if(!Array.isArray(input.marks)||input.marks.length>10)throw new BadRequestException('Too many text marks');
      node.marks=input.marks.map(mark=>{
        const data=obj(mark,'text mark'),name=str(data.type,'mark type',20);
        if(!formats.has(name))throw new BadRequestException('Unsupported text formatting');
        if(name==='link')return {type:name,attrs:{href:safeBlogUrl(obj(data.attrs,'link').href,'link',true)}};
        return {type:name};
      });
    }
    return node;
  }
  if(type==='heading'){
    const n=Number(obj(input.attrs,'heading').level);
    if(![2,3,4].includes(n))throw new BadRequestException('Use article headings H2–H4');
    node.attrs={level:n};
  }
  if(type==='image'){
    const a=obj(input.attrs,'image'),src=safeBlogUrl(a.src,'image');
    const alt=str(a.alt,'image alt text',250);
    if(!src||!alt)throw new BadRequestException('Images require a URL and descriptive alt text');
    node.attrs={src,alt,title:str(a.title||a.caption,'caption',320)};
    return node;
  }
  if(type==='hardBreak'||type==='horizontalRule')return node;
  if(input.content!==undefined){
    if(!Array.isArray(input.content)||input.content.length>2000)throw new BadRequestException('Invalid nested article content');
    node.content=input.content.map(child=>validateNode(child,depth+1,budget));
  }else node.content=[];
  return node;
}
export function validateBlogDocument(value:unknown):BlogDocument{
  if(!value||typeof value!=='object'||Array.isArray(value))return emptyDocument();
  const root=validateNode(value,0,{nodes:0,chars:0});
  if(root.type!=='doc'||JSON.stringify(root).length>280000)
    throw new BadRequestException('Invalid article document');
  return root as BlogDocument;
}
export function articleText(doc:BlogDocument):string{
  const parts:string[]=[];
  const visit=(node:BlogNode)=>{
    if(node.text)parts.push(node.text);
    node.content?.forEach(visit);
  };
  visit(doc);
  return parts.join(' ');
}
export function readingMinutes(doc:BlogDocument){
  return Math.max(1,Math.ceil(articleText(doc).trim().split(/\s+/).filter(Boolean).length/190));
}
export function validateDraft(value:unknown,previousSlug=''):BlogDraft {
  const input=obj(value,'article draft');
  const rawSlug=str(input.slug,'slug',200);
  const photo=input.cover&&typeof input.cover==='object'?obj(input.cover,'cover'):{};
  const cover={url:safeBlogUrl(photo.url,'cover'),alt:str(photo.alt,'image alt text',250)};
  if(cover.url&&!cover.alt)throw new BadRequestException('Cover image needs descriptive alt text');
  if(input.tags!==undefined&&(!Array.isArray(input.tags)||input.tags.length>15))
    throw new BadRequestException('Use at most 15 tags');
  const tags=[...new Set((input.tags as unknown[]||[]).map(item=>str(item,'tag',60)).filter(Boolean))];
  for(const flag of ['featured','noindex'])
    if(input[flag]!==undefined&&typeof input[flag]!=='boolean')throw new BadRequestException('Invalid '+flag);
  return {
    title:str(input.title,'title',180),slug:rawSlug?normalizeSlug(rawSlug):previousSlug,
    excerpt:str(input.excerpt,'summary',600),category:str(input.category,'category',90)||'Guides',
    tags,author:str(input.author,'author',110)||'Niqaha Editorial',
    cover,content:validateBlogDocument(input.content),
    seoTitle:str(input.seoTitle,'SEO title',180),seoDescription:str(input.seoDescription,'SEO description',350),
    featured:input.featured===true,noindex:input.noindex===true,
  };
}
const summary=(item:any)=>{
  const post=item.published as BlogDraft;
  return {id:String(item._id),slug:item.slug,title:post.title,excerpt:post.excerpt,
    category:post.category,tags:post.tags,author:post.author,cover:post.cover,
    featured:post.featured,noindex:post.noindex,readMinutes:item.readMinutes||
      (post.content?readingMinutes(post.content):1),
    publishedAt:item.publishedAt,modifiedAt:item.modifiedAt||item.publishedAt};
};
const expectedRevision=(value:unknown)=>{
  if(typeof value!=='number'||!Number.isSafeInteger(value)||value<1)
    throw new BadRequestException('Invalid article revision');
  return value;
};
const objectId=(value:unknown):Types.ObjectId=>{
  if(typeof value!=='string'||!Types.ObjectId.isValid(value))
    throw new BadRequestException('Invalid article ID');
  return new Types.ObjectId(value);
};
const escapeRegex=(value:string)=>value.replace(/[\\^$.*+?()[\]{}|]/g,'\\$&');
const DEFAULT_BLOG_CATEGORY='Guides';
const STARTER_BLOG_CATEGORIES=['Guides','Islamic Marriage','Family','Relationships','Advice'];
type BlogCategoryRecord={name:string;key:string;createdAt:Date;updatedAt:Date};
function categoryName(value:unknown):string{
  if(typeof value!=='string')throw new BadRequestException('Enter a category name');
  const name=value.normalize('NFKC').replace(/\s+/g,' ').trim();
  if(name.length<2||name.length>90||/[<>\\\x00-\x1f]/.test(name))
    throw new BadRequestException('Category names must be 2–90 characters, without HTML brackets');
  return name;
}
const categoryKey=(name:string)=>name.toLocaleLowerCase('en');

@Injectable()
export class BlogService implements OnModuleInit{
  constructor(@InjectConnection()private readonly db:Connection){}
  private get posts(){return this.db.collection<BlogRecord>('blog_posts');}
  private get categoryStore(){return this.db.collection<BlogCategoryRecord>('blog_categories');}
  async onModuleInit(){
    await Promise.all([
      this.posts.createIndex({slug:1},{unique:true,name:'blog_slug_unique'}),
      this.posts.createIndex({status:1,'published.featured':-1,publishedAt:-1},{name:'blog_public_feed'}),
      this.posts.createIndex({status:1,'published.category':1,publishedAt:-1},{name:'blog_category'}),
      this.categoryStore.createIndex({key:1},{unique:true,name:'blog_category_key_unique'}),
    ]);
    // Import category names already used in old drafts and published posts, without changing posts.
    const existing=await Promise.all([
      this.posts.distinct('draft.category'),this.posts.distinct('published.category'),
    ]);
    const firstSetup=(await this.categoryStore.countDocuments({}))===0;
    const names=[...(firstSetup?STARTER_BLOG_CATEGORIES:[DEFAULT_BLOG_CATEGORY]),...existing.flat()];
    for(const raw of names){
      if(typeof raw!=='string'||!raw.trim())continue;
      let name:string;
      try{name=categoryName(raw);}catch{continue;}
      const now=new Date();
      await this.categoryStore.updateOne({key:categoryKey(name)},
        {$setOnInsert:{name,key:categoryKey(name),createdAt:now,updatedAt:now}},{upsert:true});
    }
  }
  private async requireCategory(name:string){
    const category=await this.categoryStore.findOne({key:categoryKey(categoryName(name))});
    if(!category)throw new BadRequestException('Category no longer exists. Add it in Blog categories first.');
    return category.name;
  }
  async listPublic(params:{page?:string;limit?:string;category?:string;q?:string}={}){
    const page=Math.max(1,Math.min(10000,Number(params.page)||1));
    const limit=Math.max(1,Math.min(24,Number(params.limit)||9));
    const category=str(params.category,'category',90),q=escapeRegex(str(params.q,'search',90));
    const filter:Record<string,unknown>={status:'published'};
    if(category)filter['published.category']={$regex:'^'+escapeRegex(category)+'$',$options:'i'};
    if(q)filter.$or=[{'published.title':{$regex:q,$options:'i'}},
      {'published.excerpt':{$regex:q,$options:'i'}},
      {'published.tags':{$regex:q,$options:'i'}}];
    const [rows,total]=await Promise.all([
      this.posts.find(filter,{projection:{slug:1,publishedAt:1,modifiedAt:1,readMinutes:1,
        'published.title':1,'published.excerpt':1,'published.category':1,
        'published.tags':1,'published.author':1,'published.cover':1,
        'published.featured':1,'published.noindex':1}})
        .sort({'published.featured':-1,publishedAt:-1,_id:-1})
        .skip((page-1)*limit).limit(limit).toArray(),
      this.posts.countDocuments(filter),
    ]);
    return {items:rows.map(summary),total,page,pages:Math.ceil(total/limit),limit};
  }
  async categories(){
    const [stored,counts]=await Promise.all([
      this.categoryStore.find({}).sort({name:1}).toArray(),
      this.posts.aggregate([{$match:{status:'published'}},
        {$group:{_id:{$toLower:'$published.category'},count:{$sum:1}}}]).toArray(),
    ]);
    const numbers=new Map(counts.map(row=>[String(row._id),Number(row.count)]));
    return stored.map(item=>({id:String(item._id),name:item.name,count:numbers.get(item.key)||0}));
  }
  async adminCategories(){
    const [categories,counts]=await Promise.all([
      this.categories(),
      this.posts.aggregate([{$group:{_id:{$toLower:'$draft.category'},count:{$sum:1}}}]).toArray(),
    ]);
    const drafts=new Map(counts.map(row=>[String(row._id),Number(row.count)]));
    return categories.map(item=>({...item,drafts:drafts.get(categoryKey(item.name))||0,
      protected:item.name===DEFAULT_BLOG_CATEGORY}));
  }
  async addCategory(actorId:string,input:unknown){
    const name=categoryName(obj(input,'category').name);
    const now=new Date();
    try{
      const result=await this.categoryStore.insertOne({name,key:categoryKey(name),
        createdAt:now,updatedAt:now});
      await this.audit(actorId,'category-create',name);
      return {id:String(result.insertedId),name,count:0,drafts:0,protected:false};
    }catch(e:any){
      if(e?.code===11000)throw new ConflictException('A category with this name already exists');
      throw e;
    }
  }
  private async reassignCategory(oldName:string,newName:string){
    const oldKey=categoryKey(oldName);
    const match={$regex:'^'+escapeRegex(oldName)+'$',$options:'i'};
    await this.posts.updateMany({$or:[{'draft.category':match},{'published.category':match}]},[
      {$set:{
        'draft.category':{$cond:[{$eq:[{$toLower:'$draft.category'},oldKey]},newName,'$draft.category']},
        'published.category':{$cond:[{$eq:[{$toLower:{$ifNull:['$published.category','']}},oldKey]},
          newName,'$published.category']},
        revision:{$add:['$revision',1]},updatedAt:'$$NOW',
        modifiedAt:{$cond:[{$eq:['$status','published']},'$$NOW','$modifiedAt']},
      }},
    ]);
  }
  async renameCategory(actorId:string,id:unknown,input:unknown){
    const oid=objectId(id),name=categoryName(obj(input,'category').name);
    const existing=await this.categoryStore.findOne({_id:oid});
    if(!existing)throw new NotFoundException('Category not found');
    if(existing.name===DEFAULT_BLOG_CATEGORY)
      throw new BadRequestException('Guides is the default category and cannot be renamed');
    if(categoryKey(name)===existing.key&&name===existing.name)return {id:String(oid),name};
    try{
      await this.categoryStore.updateOne({_id:oid},{$set:{name,key:categoryKey(name),updatedAt:new Date()}});
    }catch(e:any){
      if(e?.code===11000)throw new ConflictException('A category with this name already exists');
      throw e;
    }
    await this.reassignCategory(existing.name,name);
    await this.audit(actorId,'category-rename',existing.name+' -> '+name);
    return {id:String(oid),name};
  }
  async removeCategory(actorId:string,id:unknown){
    const oid=objectId(id),existing=await this.categoryStore.findOne({_id:oid});
    if(!existing)throw new NotFoundException('Category not found');
    if(existing.name===DEFAULT_BLOG_CATEGORY)
      throw new BadRequestException('Guides is the default category and cannot be deleted');
    await this.reassignCategory(existing.name,DEFAULT_BLOG_CATEGORY);
    await this.categoryStore.deleteOne({_id:oid});
    await this.audit(actorId,'category-delete',existing.name);
    return {deleted:true,reassignedTo:DEFAULT_BLOG_CATEGORY};
  }
  async onePublished(value:unknown){
    const slug=normalizeSlug(value),item=await this.posts.findOne({slug,status:'published'});
    if(!item?.published)throw new NotFoundException('Article not found');
    return {...summary(item),content:item.published.content,
      seoTitle:item.published.seoTitle,seoDescription:item.published.seoDescription};
  }
  async sitemap(){
    const rows=await this.posts.find({status:'published','published.noindex':false},{
      projection:{slug:1,modifiedAt:1,publishedAt:1},
    }).sort({publishedAt:-1}).limit(10000).toArray();
    return rows.map(item=>({slug:item.slug,lastModified:item.modifiedAt||item.publishedAt}));
  }
  async listAdmin(params:{page?:string;q?:string}={}){
    const page=Math.max(1,Math.min(10000,Number(params.page)||1));
    const q=escapeRegex(str(params.q,'search',80));
    const filter=q?{$or:[{'draft.title':{$regex:q,$options:'i'}},{slug:{$regex:q,$options:'i'}}]}:{};
    const [rows,total]=await Promise.all([
      this.posts.find(filter,{projection:{slug:1,revision:1,status:1,
        'draft.title':1,'draft.category':1,'draft.cover':1,publishedAt:1,updatedAt:1}})
        .sort({updatedAt:-1}).skip((page-1)*30).limit(30).toArray(),
      this.posts.countDocuments(filter),
    ]);
    return {items:rows.map(item=>({
      id:String(item._id),slug:item.slug,title:item.draft.title,
      category:item.draft.category,cover:item.draft.cover,
      status:item.status,revision:item.revision,
      publishedAt:item.publishedAt,updatedAt:item.updatedAt,
    })),page,pages:Math.ceil(total/30),total};
  }
  async adminOne(id:unknown){
    const item=await this.posts.findOne({_id:objectId(id)});
    if(!item)throw new NotFoundException('Article not found');
    return {id:String(item._id),slug:item.slug,status:item.status,
      draft:item.draft,revision:item.revision,publishedAt:item.publishedAt,
      modifiedAt:item.modifiedAt,updatedAt:item.updatedAt};
  }
  async create(actorId:string){
    const oid=new Types.ObjectId(),now=new Date(),draft=emptyBlogDraft();
    const slug='draft-'+oid.toString().slice(-12);
    draft.slug=slug;
    await this.posts.insertOne({_id:oid,slug,revision:1,status:'draft',
      draft,actorId,createdAt:now,updatedAt:now} as any);
    await this.audit(actorId,'create',slug);
    return this.adminOne(oid.toString());
  }
  async save(actorId:string,id:unknown,input:unknown){
    const body=obj(input,'article save'),revision=expectedRevision(body.revision),oid=objectId(id);
    const item=await this.posts.findOne({_id:oid});
    if(!item)throw new NotFoundException('Article not found');
    if(item.revision!==revision)throw new ConflictException('Article changed elsewhere; refresh');
    const draft=validateDraft(body.draft,item.slug);
    draft.category=await this.requireCategory(draft.category);
    if(item.publishedAt&&draft.slug!==item.slug)
      throw new BadRequestException('Published blog URLs are permanent; edit the title instead');
    try{
      const result=await this.posts.updateOne({_id:oid,revision},
        {$set:{slug:draft.slug,draft,status:item.status==='archived'?'draft':item.status,
          actorId,updatedAt:new Date()},$inc:{revision:1}});
      if(!result.matchedCount)throw new ConflictException('Article changed elsewhere; refresh');
    }catch(e:any){
      if(e?.code===11000)throw new ConflictException('That blog URL is already used');
      throw e;
    }
    await this.audit(actorId,'save',draft.slug);
    return this.adminOne(id);
  }
  async publish(actorId:string,id:unknown,input:unknown){
    const body=obj(input,'publish'),revision=expectedRevision(body.revision),oid=objectId(id);
    const item=await this.posts.findOne({_id:oid});
    if(!item)throw new NotFoundException('Article not found');
    if(item.revision!==revision)throw new ConflictException('Article changed elsewhere; refresh');
    const draft=validateDraft(item.draft,item.slug);
    if(draft.title.length<3||draft.excerpt.length<20||articleText(draft.content).trim().length<30)
      throw new BadRequestException('Publish requires a title, a 20+ character excerpt and meaningful article content');
    const now=new Date();
    const result=await this.posts.updateOne({_id:oid,revision},{
      $set:{status:'published',published:draft,actorId,
        publishedAt:item.publishedAt||now,modifiedAt:now,updatedAt:now,
        readMinutes:readingMinutes(draft.content)},
      $inc:{revision:1},
    });
    if(!result.matchedCount)throw new ConflictException('Article changed elsewhere; refresh');
    await this.audit(actorId,'publish',draft.slug);
    return this.adminOne(id);
  }
  async unpublish(actorId:string,id:unknown,input:unknown){
    return this.changeStatus(actorId,id,input,'draft','unpublish');
  }
  async archive(actorId:string,id:unknown,input:unknown){
    return this.changeStatus(actorId,id,input,'archived','archive');
  }
  async restore(actorId:string,id:unknown,input:unknown){
    const state=await this.adminOne(id);
    if(state.status!=='archived')throw new BadRequestException('Only archived posts can be restored');
    return this.changeStatus(actorId,id,input,'draft','restore');
  }
  private async changeStatus(actorId:string,id:unknown,input:unknown,
    status:'draft'|'archived',action:string){
    const revision=expectedRevision(obj(input,'status change').revision),oid=objectId(id);
    const item=await this.posts.findOne({_id:oid});
    if(!item)throw new NotFoundException('Article not found');
    const updated=await this.posts.updateOne({_id:oid,revision},{
      $set:{status,updatedAt:new Date(),actorId},$inc:{revision:1},
    });
    if(!updated.matchedCount)throw new ConflictException('Article changed elsewhere; refresh');
    await this.audit(actorId,action,item.slug);
    return this.adminOne(id);
  }
  private async audit(actorId:string,action:string,slug:string){
    await this.db.collection('blog_audit').insertOne({actorId,action,slug,createdAt:new Date()});
  }
}
