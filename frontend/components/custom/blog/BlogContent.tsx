import Image from 'next/image';
import type {ReactNode} from 'react';
import type {BlogNode,BlogDocument} from '@/lib/blog-types';

export function headingText(node:BlogNode){
  const collect=(item:BlogNode):string=>(item.text||'')+(item.content||[]).map(collect).join('');
  return collect(node).trim();
}
export function articleHeadings(document:BlogDocument){
  return (document?.content||[]).map((node,index)=>({
    id:'section-'+index,level:Number(node.attrs?.level)||2,
    text:headingText(node),node,
  })).filter(item=>item.node.type==='heading'&&item.text);
}
function marked(value:ReactNode,marks?:BlogNode['marks']){
  return (marks||[]).reduce<ReactNode>((child,mark,index)=>{
    switch(mark.type){
      case 'bold':return <strong key={index} className="font-bold text-foreground">{child}</strong>;
      case 'italic':return <em key={index}>{child}</em>;
      case 'underline':return <u key={index}>{child}</u>;
      case 'strike':return <s key={index}>{child}</s>;
      case 'code':return <code key={index} className="rounded-md bg-pink-50 px-1.5 py-0.5 font-mono text-sm text-pink-700">{child}</code>;
      case 'link':{
        const href=mark.attrs?.href||'';
        if(!((href.startsWith('/')&&!href.startsWith('//'))||/^https:\/\//.test(href)||/^mailto:/.test(href)))return child;
        return <a key={index} href={href} rel="noopener noreferrer"
          className="font-semibold text-primary underline decoration-pink-300 underline-offset-4 transition-colors hover:text-pink-700">{child}</a>;
      }
      default:return child;
    }
  },value);
}
function RenderNode({node,nodeIndex}:{node:BlogNode;nodeIndex:number|string}):ReactNode{
  const children=(node.content||[]).map((part,index)=>
    <RenderNode key={index} node={part} nodeIndex={String(nodeIndex)+'-'+index}/>);
  switch(node.type){
    case 'doc':return <>{children}</>;
    case 'text':return marked(node.text||'',node.marks);
    case 'hardBreak':return <br/>;
    case 'paragraph':return <p className="my-5 break-words text-[16px] leading-[1.95] text-foreground/85 sm:text-[17px]">{children}</p>;
    case 'heading':{
      const level=Number(node.attrs?.level)||2;
      const Tag=(level===3?'h3':level===4?'h4':'h2') as 'h2'|'h3'|'h4';
      return <Tag id={'section-'+nodeIndex} className={
        level===2?'mb-4 mt-11 scroll-mt-28 border-b border-pink-100 pb-3 font-heading text-[1.8rem] font-bold leading-[1.35] text-foreground sm:text-3xl':
        level===3?'mb-3 mt-9 scroll-mt-28 font-heading text-2xl font-bold leading-[1.4] text-foreground':
        'mb-3 mt-7 scroll-mt-28 font-heading text-xl font-bold leading-[1.4] text-foreground'
      }>{children}</Tag>;
    }
    case 'bulletList':return <ul className="my-6 list-disc space-y-2 pl-6 marker:text-pink-500 sm:pl-7">{children}</ul>;
    case 'orderedList':return <ol className="my-6 list-decimal space-y-2 pl-6 marker:text-pink-500 sm:pl-7">{children}</ol>;
    case 'listItem':return <li className="break-words text-[16px] leading-[1.9] text-foreground/85 sm:text-[17px] [&>p]:my-0">{children}</li>;
    case 'blockquote':return <blockquote className="my-8 rounded-r-2xl border-l-4 border-primary bg-pink-50/80 px-5 py-4 text-[16px] italic leading-8 text-foreground/80 sm:px-7">{children}</blockquote>;
    case 'codeBlock':return <pre className="my-7 max-w-full overflow-x-auto rounded-2xl bg-slate-900 p-5 font-mono text-sm leading-7 text-white"><code>{children}</code></pre>;
    case 'horizontalRule':return <hr className="my-10 border-pink-100"/>;
    case 'image':{
      const src=String(node.attrs?.src||''),alt=String(node.attrs?.alt||'');
      const caption=String(node.attrs?.title||'');
      if(!src||!alt)return null;
      return <figure className="my-9 overflow-hidden rounded-2xl border border-pink-100 bg-pink-50/40">
        <Image unoptimized src={src} alt={alt} width={1200} height={720}
          sizes="(max-width: 768px) 100vw, 850px" className="mx-auto h-auto max-h-[650px] w-full object-contain" loading="lazy"/>
        {caption&&<figcaption className="border-t border-pink-100 px-5 py-3 text-center text-sm leading-6 text-muted-foreground">{caption}</figcaption>}
      </figure>;
    }
    default:return null;
  }
}
export default function BlogContent({document}:{document:BlogDocument}){
  return <div className="blog-article-content min-w-0" lang="bn">
    {(document?.content||[]).map((node,index)=><RenderNode key={index} node={node} nodeIndex={index}/>)}
  </div>;
}
