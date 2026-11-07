import {Node,mergeAttributes} from '@tiptap/core';

/** Atomic HTML5 video block; no iframe, embed script or third-party player. */
const BlogVideoExtension=Node.create({
 name:'video',
 group:'block',
 atom:true,
 draggable:true,
 addAttributes(){
   return {
     src:{default:null,parseHTML:element=>element.getAttribute('src')},
     title:{default:'',parseHTML:element=>element.getAttribute('aria-label')||element.getAttribute('title')||''},
     poster:{default:'',parseHTML:element=>element.getAttribute('poster')||''},
   };
 },
 parseHTML(){return [{tag:'video[data-blog-video]'}];},
 renderHTML({HTMLAttributes}){
   const attrs=mergeAttributes({
     'data-blog-video':'true',controls:'controls',preload:'metadata',
     playsinline:'',style:'display:block;width:100%;max-height:520px;border-radius:14px;background:#201822;',
     'aria-label':HTMLAttributes.title||'Article video',
   },HTMLAttributes);
   return ['video',attrs];
 },
});
export default BlogVideoExtension;
