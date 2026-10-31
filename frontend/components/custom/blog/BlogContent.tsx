import Link from 'next/link';
import Image from 'next/image';
import type {ReactNode} from 'react';
import type {BlogNode,BlogDocument} from '@/lib/blog-types';

export function headingText(node:BlogNode){
  const collect=(n:BlogNode):string=>(n.text||'')+(n.content||[]).map(collect).join('');
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
      case 'bold':return <strong key={index}>{child}</strong>;
      case 'italic':return <em key={index}>{child}</em>;
      case 'underline':return <u key={index}>{child}</u>;
      case 'strike':return <s key={index}>{child}</s>;
      case 'code':return <code key={index} className="rounded bg-rose-50 px-1 font-mono text-sm text-rose-800">{child}</code>;
      case 'link':{
        const href=mark.attrs?.href||'';
        if(!href.startsWith('/')&&!/^https:\/\//.test(href)&&!/^mailto:/.test(href))return child;
        return <a key={index} href={href} rel="noopener noreferrer"
          className="font-semibold text-rose-700 underline decoration-rose-300 underline-offset-4 hover:text-rose-900">{child}</a>;
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
    case 'paragraph':return <p className="my-5 text-[1.075rem] leading-[2.05] text-[#493d45]">{children}</p>;
    case 'heading':{
      const level=Number(node.attrs?.level)||2;
      const Tag=(level===3?'h3':level===4?'h4':'h2') as 'h2'|'h3'|'h4';
      return <Tag id={'section-'+nodeIndex} className={
        level===2?'mb-4 mt-12 scroll-mt-28 border-b border-rose-100 pb-3 font-serif text-3xl font-semibold text-[#30212b]':
        level===3?'mb-3 mt-9 scroll-mt-28 font-serif text-2xl font-semibold text-[#392932]':
        'mb-3 mt-7 scroll-mt-28 text-xl font-semibold text-[#49313e]'
      }>{children}</Tag>;
    }
    case 'bulletList':return <ul className="my-6 list-disc space-y-2 pl-7 marker:text-rose-500">{children}</ul>;
    case 'orderedList':return <ol className="my-6 list-decimal space-y-2 pl-7 marker:text-rose-500">{children}</ol>;
    case 'listItem':return <li className="text-[1.065rem] leading-8 text-[#493d45] [&>p]:my-0">{children}</li>;
    case 'blockquote':return <blockquote className="my-8 rounded-r-xl border-l-[3px] border-rose-500 bg-[#fff3f5] px-6 py-3 italic text-[#6e485b]">{children}</blockquote>;
    case 'codeBlock':return <pre className="my-7 overflow-x-auto rounded-xl bg-[#261c25] p-5 font-mono text-sm leading-7 text-white"><code>{children}</code></pre>;
    case 'horizontalRule':return <hr className="my-10 border-rose-100"/>;
    case 'image':{
      const src=String(node.attrs?.src||''),alt=String(node.attrs?.alt||'');
      const caption=String(node.attrs?.title||'');
      if(!src||!alt)return null;
      return <figure className="my-10 overflow-hidden rounded-2xl border border-rose-100 bg-[#fbf5f7]">
        <Image unoptimized src={src} alt={alt} width={1200} height={720}
          sizes="(max-width: 768px) 100vw, 850px" className="mx-auto h-auto max-h-[650px] w-full object-contain" loading="lazy"/>
        {caption&&<figcaption className="px-5 py-3 text-center text-sm text-[#857280]">{caption}</figcaption>}
      </figure>;
    }
    default:return null;
  }
}
export default function BlogContent({document}:{document:BlogDocument}){
  return <div className="blog-article-content" lang="bn">
    {(document?.content||[]).map((node,index)=><RenderNode key={index} node={node} nodeIndex={index}/>)}
  </div>;
}
