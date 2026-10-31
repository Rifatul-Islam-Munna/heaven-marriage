'use client';
import type { User } from '@/@types/user';
import type { ProfileQuestion,ProfileQuestionSchema } from '@/lib/profile-questions';
import { defaultQuestions,questionDisplayValue,questionUsesSeparateStorage } from '@/lib/profile-questions';
import { Card,CardContent } from '@/components/ui/card';

function entries(user:User,schema:ProfileQuestionSchema,section:number){
 return schema.questions.filter(q=>
  q.section===section&&q.enabled&&q.showPublic&&
  (!q.path||questionUsesSeparateStorage(q)||
    q.path.startsWith('pledge.')||q.path==='howYouWannaGetMarried'||
    defaultQuestions.questions.find(original=>original.id===q.id)?.section!==q.section)&&
  // Eligibility was checked against the user's actual gender by the backend.
  // user.gender itself may be hidden on the public response.
  user.publicAnswers?.[q.id]!==undefined&&user.publicAnswers?.[q.id]!==null&&
  user.publicAnswers?.[q.id]!==''&&
  !(Array.isArray(user.publicAnswers?.[q.id])&&(user.publicAnswers?.[q.id] as string[]).length===0)
 ).sort((a,b)=>a.order-b.order);
}
function ExtraRow({user,q,index}:{user:User;q:ProfileQuestion;index:number}){
 return <tr className={index%2?'':'bg-white'} data-public-question={q.id}>
  <td className="w-1/2 border border-gray-300 px-4 py-3 text-sm text-gray-700" dir="auto">
   {q.publicLabel||q.question}
  </td>
  <td className="border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900" dir="auto">
   {questionDisplayValue(user.publicAnswers?.[q.id],q)}
  </td>
 </tr>;
}
// Inserted directly in the preexisting section table, without changing its design.
export function PublicExtraRows({user,schema,section}:{user:User;schema:ProfileQuestionSchema;section:number}){
 return <>{entries(user,schema,section).map((q,index)=><ExtraRow key={q.id} user={user} q={q} index={index}/>)}</>;
}
// Extra and pledge sections have no permanent public profile table of their own.
export default function PublicAdditionalAnswers({user,schema,sections=[8,9]}:{
 user:User;schema:ProfileQuestionSchema;sections?:number[];
}){
 const groups=sections.map(section=>({
  section:schema.sections[section],
  questions:entries(user,schema,section),
 })).filter(group=>group.section&&group.questions.length>0);
 if(!groups.length)return null;
 return <div className="space-y-5" data-public-dynamic-questions>
  {groups.map(({section,questions})=><Card key={section.id} className="shadow-none">
   <CardContent className="p-6">
    <h2 className="mb-4 border-b-2 border-pink-200 pb-3 text-xl font-bold text-pink-700">
     {section.title}
    </h2>
    <table className="w-full border-collapse"><tbody>
     {questions.map((q,index)=><ExtraRow key={q.id} user={user} q={q} index={index}/>)}
    </tbody></table>
   </CardContent>
  </Card>)}
 </div>;
}
