export type BlogMark={type:string;attrs?:{href:string}};
export type BlogNode={type:string;text?:string;attrs?:Record<string,unknown>;marks?:BlogMark[];content?:BlogNode[]};
export type BlogDocument={type:'doc';content:BlogNode[]};
export type BlogDraft={title:string;slug:string;excerpt:string;category:string;tags:string[];
  author:string;cover:{url:string;alt:string};content:BlogDocument;
  seoTitle:string;seoDescription:string;featured:boolean;noindex:boolean};
export type BlogCard={id:string;slug:string;title:string;excerpt:string;category:string;
  tags:string[];author:string;cover:{url:string;alt:string};
  featured:boolean;noindex:boolean;readMinutes:number;publishedAt:string;modifiedAt:string};
export type BlogPost=BlogCard&{content:BlogDocument;seoTitle:string;seoDescription:string};
export type BlogList={items:BlogCard[];total:number;page:number;pages:number;limit:number};
export type BlogCategory={name:string;count:number};
export type BlogAdminRow={id:string;slug:string;title:string;category:string;cover:{url:string;alt:string};
  status:'draft'|'published'|'archived';revision:number;publishedAt?:string;updatedAt:string};
export type BlogAdminDoc={id:string;slug:string;status:'draft'|'published'|'archived';
  draft:BlogDraft;revision:number;publishedAt?:string;modifiedAt?:string;updatedAt:string};
export const defaultBlogDraft=():BlogDraft=>({
 title:'',slug:'',excerpt:'',category:'Guides',tags:[],author:'Niqaha Editorial',
 cover:{url:'',alt:''},content:{type:'doc',content:[{type:'paragraph',content:[]}]},
 seoTitle:'',seoDescription:'',featured:false,noindex:false,
});
export const publicBlogPath=(slug:string)=>'/blog/'+encodeURIComponent(slug);
export const blogDate=(iso?:string)=>iso?new Intl.DateTimeFormat('bn-BD',{
  year:'numeric',month:'long',day:'numeric',timeZone:'Asia/Dhaka',
}).format(new Date(iso)):'';
