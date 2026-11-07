"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import {
  Check, ChevronLeft, ChevronRight, Copy, Filter, Loader2, Mail, Pencil, Phone, RefreshCw, Search, Send, Share2,
  Trash2, Wallet, X, Globe2, Sparkles, MoreHorizontal,
} from "lucide-react";
import { GetRequestNormal,PatchRequestAxios } from "@/api-hooks/api-hooks";
import MemberDynamicColumnManager,{MemberValueButton,type MemberAdminColumn,type MemberAdminColumnsResponse} from "./MemberDynamicColumnManager";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { User as BiodataUser } from "@/@types/user";
import {
  BIODATA_WHATSAPP_GROUPS, BiodataWhatsappGroup, buildBiodataWhatsappShareUrlForNumber,
  copyBiodataWhatsappText, openBiodataWhatsappGroupShare,
} from "@/lib/biodata-whatsapp-share";
import MemberBiodataColumnPicker,{type ProfileTableColumn,type BiodataFieldColumn} from './MemberBiodataColumnPicker';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem,DropdownMenuSeparator} from '@/components/ui/dropdown-menu';
import {marriedStatus} from '@/staticData/all-data';
import {districts} from '@/staticData/districts';
import AdminUserFilters, { ADVANCED_KEYS, ActiveFilterChips, useActiveFilterCount, useAdminFilterNavigation } from "./AdminUserFilters";
import {
  DashboardHeader, DashboardPage, DashButton, Panel, PlainHeader, StatusPill, Toggle, fieldClass, labelClass,
} from "./dashboard-kit";

interface User {
  _id: string; name: string; email: string; phoneNumber: string; whatsapp?: string; maritalStatus: string;
  isSubscriber: boolean; isOtpVerified: boolean; numberOfConnections: number; isPublished?: boolean;
  isPublishFromAdmin?: boolean; userId: string;
  biodataStage?: string; memberJourney?: string; completionPercentage?: number;
  completionRequiredCount?:number; completionAnsweredCount?:number; completionSchemaRevision?:number;
  submittedAt?: string; verificationStatus?: string;
}
interface Paginated<T> {
  data: T[]; page: number; limit: number; totalItems: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean;
}
interface ShareRecipient { _id: string; name: string; phoneNumber?: string; whatsapp?: string; userId?: string }

const darkField = "rounded-md border border-white/20 bg-white/10 px-3 py-2 text-[13px] text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 [&>option]:bg-[#1a1a2e] [&>option]:text-white";
const darkLink = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-white/20 bg-white/10 px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/20";
const countUrl = (extra: string) => `/user/get-all-user-for-admin?page=1&limit=1&query=&gender=all&${extra}`;

function pageList(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [...new Set([1, total, current - 1, current, current + 1])].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  pages.forEach((page, i) => { if (i && page - pages[i - 1] > 1) result.push("gap"); result.push(page); });
  return result;
}

function StatCard({ label, value, hint, active, onClick }: {
  label: string; value?: number; hint: string; active: boolean; onClick: () => void;
}) {
  return <button type="button" onClick={onClick} aria-pressed={active}
    className={cn("rounded-lg bg-white px-4 py-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-rose-600 sm:px-5",
      active && "ring-2 ring-rose-400")}>
    <p className="text-[12px] font-medium uppercase tracking-[0.5px] text-[#6c757d]">{label}</p>
    <p className="mt-1 text-[26px] font-bold leading-tight tabular-nums">{value === undefined ? "—" : value.toLocaleString()}</p>
    <p className="mt-1 text-[12px] text-[#6c757d]">{hint}</p>
  </button>;
}

function MemberIdentity({user,onEdit,compact=false}:{
  user:User;onEdit:()=>void;compact?:boolean;
}){
  return <div className="min-w-0 space-y-1.5">
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={onEdit}
        className="max-w-full break-words text-left text-[15px] font-semibold leading-6 text-slate-900 hover:text-pink-700 hover:underline"
        title="সদস্যের বায়োডাটা খুলুন">{user.name||'নাম নেই'}</button>
    </div>
    <p className="text-[12px] font-medium leading-5 text-slate-500">
      <span className="font-mono">#{user.userId||'—'}</span>
      {user.maritalStatus&&<> · {user.maritalStatus}</>}
    </p>
    <div className={cn('space-y-0.5 text-[12px] leading-5 text-slate-600',compact?'pt-0.5':'')}>
      <p className="flex min-w-0 items-start gap-1.5">
        <Mail size={13} className="mt-0.5 shrink-0 text-slate-400" aria-hidden/>
        {user.email?<a href={'mailto:'+user.email} className="min-w-0 break-all hover:text-pink-700 hover:underline">{user.email}</a>:<span className="text-slate-400">ইমেইল নেই</span>}
      </p>
      <p className="flex min-w-0 items-center gap-1.5">
        <Phone size={13} className="shrink-0 text-slate-400" aria-hidden/>
        {user.phoneNumber?<a href={'tel:'+user.phoneNumber} className="font-medium hover:text-pink-700 hover:underline">{user.phoneNumber}</a>:<span className="text-slate-400">ফোন নেই</span>}
      </p>
    </div>
  </div>;
}

function MemberProgress({ user,onConnections,onSubscriber,subscriberBusy }:{
 user:User;onConnections:()=>void;onSubscriber:()=>void;subscriberBusy:boolean;
}) {
  const n = Math.max(0,Math.min(100,user.completionPercentage ?? 0));
  const journey = user.memberJourney === 'published' ? 'প্রকাশিত' :
    user.memberJourney === 'submitted' ? 'জমা হয়েছে' :
    user.memberJourney === 'in_progress' ? 'খসড়া' : 'শুধু সাইনআপ';
  return <div className="min-w-[205px] max-w-[270px] space-y-2" aria-label={user.name+' এর বায়োডাটার অগ্রগতি ও সেবা'}>
    <div className="flex items-center justify-between gap-2 text-[12px]">
      <span className="font-semibold text-slate-700">{journey}</span>
      <span className="font-bold tabular-nums text-rose-700">{n}%</span>
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar"
      aria-label={user.name+' এর বায়োডাটা সম্পন্ন'} aria-valuemin={0}
      aria-valuemax={100} aria-valuenow={n}>
      <div className="h-full rounded-full bg-rose-500 transition-[width]" style={{width:n+'%'}}/>
    </div>
    <div className="text-[11px] leading-4 text-slate-500">
      {typeof user.completionRequiredCount==='number' && user.completionRequiredCount>0
        ? 'আবশ্যক উত্তর: '+(user.completionAnsweredCount??0)+' / '+user.completionRequiredCount
        : 'আবশ্যক প্রশ্ন অনুযায়ী হিসাব'}
      <span className="block truncate" title={user.submittedAt||undefined}>
        প্রথম জমা: {user.submittedAt
          ?new Date(user.submittedAt).toLocaleString('bn-BD',{dateStyle:'medium',timeStyle:'short'})
          :'এখনো জমা দেয়নি'}
      </span>
    </div>
    <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-2">
      <button type="button" onClick={onConnections} title="কানেকশন ব্যালেন্স পরিবর্তন"
        aria-label={user.name+' এর কানেকশন পরিবর্তন'}
        className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 px-2 text-[11px] font-semibold text-slate-700 transition hover:border-rose-300 hover:bg-rose-50">
        <Wallet size={13} className="text-rose-600"/> {user.numberOfConnections??0} <Pencil size={11} className="text-slate-400"/>
      </button>
      <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
        {subscriberBusy?<Loader2 size={16} className="animate-spin text-slate-400"/>:
          <Toggle checked={!!user.isSubscriber} disabled={subscriberBusy} onChange={onSubscriber}/>}
        সাবস্ক্রাইবার
      </label>
    </div>
  </div>;
}

function StatusPills({ user }: { user: User }) {
  return <div className="flex max-w-[112px] flex-col items-start gap-1">
    <StatusPill tone={user.isOtpVerified ? "positive" : "negative"}>{user.isOtpVerified ? "OTP যাচাইকৃত" : "OTP বাকি"}</StatusPill>
    <StatusPill tone={user.isPublishFromAdmin ? "positive" : "neutral"}>{user.isPublishFromAdmin ? "প্রকাশিত" : "লুকানো"}</StatusPill>
  </div>;
}

function ProfileBadges({column,values,fields}:{
 column:ProfileTableColumn;values?:Record<string,string>;fields:BiodataFieldColumn[];
}){
 const labels=new Map(fields.map(field=>[field.id,field.label]));
 return <div className="flex max-w-[240px] flex-wrap gap-1.5" aria-label={column.label}>
   {column.questionIds.map(id=>{
     const value=values?.[id]||'';
     if(!value)return null;
     return <span key={id} title={(labels.get(id)||'ফিল্ড')+': '+value}
       className="inline-flex max-w-full items-center gap-1 rounded-md border border-rose-100 bg-rose-50/70 px-2 py-1 text-[11px] leading-4 text-rose-900">
       <span className="max-w-[100px] shrink-0 truncate font-medium text-rose-700">{labels.get(id)||'ফিল্ড'}:</span>
       <span className="min-w-0 max-w-[180px] truncate font-semibold">{value}</span>
     </span>;
   })}
   {!column.questionIds.some(id=>values?.[id])&&
     <span className="text-[11px] text-slate-400">উত্তর দেওয়া হয়নি</span>}
 </div>;
}

export default function AdminUsersTable({ quickLinks = [],isAdmin=false }: { quickLinks?: { href: string; label: string }[];isAdmin?:boolean }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { params, push } = useAdminFilterNavigation();
  const activeAdvanced = useActiveFilterCount();
  const [tableFilters, setTableFilters] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    query: parseAsString.withDefault(""),
    gender: parseAsString.withDefault("all"),
    publish: parseAsString.withDefault("all"),
  });
  const [search, setSearch] = useState(tableFilters.query);
  const [debouncedSearch] = useDebounce(search, 450);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quickOpen,setQuickOpen]=useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [publishTarget, setPublishTarget] = useState<User | null>(null);
  const [connectionTarget, setConnectionTarget] = useState<User | null>(null);
  const [connectionValue, setConnectionValue] = useState("");
  const [connectionReason, setConnectionReason] = useState("");
  const [subscriberPending, setSubscriberPending] = useState<string | null>(null);
  const [selectedCell,setSelectedCell]=useState<{memberId:string;name:string;column:MemberAdminColumn}|null>(null);
  const [cellText,setCellText]=useState('');
  const [cellFlag,setCellFlag]=useState('');
  const [savingCell,setSavingCell]=useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedShareUser, setSelectedShareUser] = useState<User | null>(null);
  const [copyingUserId, setCopyingUserId] = useState<string | null>(null);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientPage, setRecipientPage] = useState(1);
  const [recipientText] = useDebounce(recipientSearch, 400);

  // Typing updates the URL after a short pause; outside changes (chips, clear) flow back in.
  useEffect(() => { if (debouncedSearch !== tableFilters.query) void setTableFilters({ query: debouncedSearch, page: 1 }); },
    [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (tableFilters.query !== debouncedSearch) setSearch(tableFilters.query); }, [tableFilters.query]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = new URLSearchParams(params.toString());
  query.set("page", tableFilters.page.toString());
  query.set("query", tableFilters.query);
  query.set("gender", tableFilters.gender);
  query.set("isPublished", tableFilters.publish || "all");
  query.delete("publish");

  const { data, isLoading, isFetching, error, refetch } = useQueryWrapper<Paginated<User>>(
    ["admin-users", tableFilters.page, tableFilters.query, tableFilters.gender, tableFilters.publish, params.toString()],
    `/user/get-all-user-for-admin?${query.toString()}`,
  );
  const memberIds=(data?.data||[]).map(member=>member._id).join(',');
  const {data:customData,isLoading:customLoading,error:customError}=useQueryWrapper<MemberAdminColumnsResponse>(
    ['admin-member-columns',memberIds],
    '/admin/member-columns'+(memberIds?'?memberIds='+encodeURIComponent(memberIds):''),
    {enabled:isAdmin,staleTime:10000},
  );
  const refreshCustom=()=>{
    void queryClient.invalidateQueries({queryKey:['admin-member-columns'],exact:false});
  };
  const totalCount = useQueryWrapper<Paginated<User>>(["admin-user-count", "all"], countUrl("isPublished=all"));
  const publishedCount = useQueryWrapper<Paginated<User>>(["admin-user-count", "published"], countUrl("isPublished=true"));
  const premiumCount = useQueryWrapper<Paginated<User>>(["admin-user-count", "premium"], countUrl("isPublished=all&accountType=premium"));
  const pendingCount = useQueryWrapper<Paginated<User>>(["admin-user-count", "pending"], countUrl("isPublished=all&verificationStatus=pending"));

  const { data: shareProfile, isLoading: isShareProfileLoading } = useQueryWrapper<BiodataUser>(
    ["admin-share-profile", selectedShareUser?._id],
    `/user/get-user-profile-admin?id=${selectedShareUser?._id ?? ""}`,
    { enabled: shareDialogOpen && !!selectedShareUser?._id },
  );
  const recipientsQuery = new URLSearchParams({ page: String(recipientPage), limit: "100", query: recipientText });
  const { data: recipientsData, isLoading: isRecipientsLoading, isFetching: isRecipientsFetching } = useQueryWrapper<Paginated<ShareRecipient>>(
    ["admin-share-recipients", recipientPage, recipientText],
    `/user/get-all-user-for-admin?${recipientsQuery.toString()}`,
    { enabled: shareDialogOpen },
  );

  const refreshAll = () => {
    // Invalidate all cached pages and stat cards; they refetch on the next view.
    void queryClient.invalidateQueries({ queryKey: ["admin-users"], exact: false });
    void queryClient.invalidateQueries({ queryKey: ["admin-user-count"], exact: false });
    void queryClient.invalidateQueries({ queryKey: ["admin-share-recipients"], exact: false });
  };
  const deleteMutation = useCommonMutationApi({
    method: "DELETE", url: "/user/delete-user-admin", successMessage: "ব্যবহারকারী মুছে ফেলা হয়েছে", onSuccess: refreshAll,
  });
  const publishMutation = useCommonMutationApi({
    method: "PATCH", url: "/user/publish-user-admin", successMessage: "বায়োডাটা প্রকাশিত হয়েছে", onSuccess: refreshAll,
  });
  const toggleSubscriberMutation = useCommonMutationApi({
    method: "PATCH", url: "/user/update-user-subscriber", successMessage: "সাবস্ক্রাইবার স্ট্যাটাস আপডেট করা হয়েছে", onSuccess: refreshAll,
  });
  const updateConnectionsMutation = useCommonMutationApi({
    method: "PATCH", url: "/user/update-user-admin", successMessage: "কানেকশন সংখ্যা আপডেট করা হয়েছে",
    onSuccess: () => { refreshAll(); setConnectionTarget(null); },
  });

  const users = data?.data ?? [];
  const visibleColumns=isAdmin?(customData?.columns.filter(col=>col.enabled&&col.id!=='hot-data')||[]):[];
  const profileColumns=isAdmin?(customData?.profileColumns||[]):[];
  const openMemberCell=(user:User,column:MemberAdminColumn)=>{
    const value=customData?.values?.[user._id]?.[column.id];
    setSelectedCell({memberId:user._id,name:user.name||user.userId,column});
    setCellText(typeof value==='string'?value:'');
    setCellFlag(value===true?'true':value===false?'false':'');
  };
  const saveMemberCell=async()=>{
    if(!selectedCell)return;
    const value=selectedCell.column.type==='flag'
      ?(cellFlag===''?null:cellFlag==='true')
      :(cellText.trim()||null);
    setSavingCell(true);
    try{
      const [result,error]=await PatchRequestAxios(
        '/admin/member-columns/member/'+selectedCell.memberId+'/'+selectedCell.column.id,{value});
      if(error||!result)throw new Error(error?.message||'Unable to update');
      toast.success('Internal member data saved');
      setSelectedCell(null);
      refreshCustom();
    }catch(error){toast.error(error instanceof Error?error.message:'Save failed');}
    finally{setSavingCell(false);}
  };
  const recipients = recipientsData?.data ?? [];
  const totalPages = Math.max(1, data?.totalPages ?? 1);
  const page = Math.min(tableFilters.page, totalPages);
  const limit = data?.limit ?? (Number(params.get("limit")) || 10);
  const firstRow = data?.totalItems ? (page - 1) * limit + 1 : 0;
  const lastRow = data ? Math.min(page * limit, data.totalItems) : 0;
  const noFilters = !tableFilters.query && tableFilters.gender === 'all' && tableFilters.publish === 'all' && !params.get('memberJourney') && !ADVANCED_KEYS.some(key=>key!=='limit'&&key!=='sort'&&params.get(key));
  const connectionNumber = Number(connectionValue);
  const connectionOk = connectionValue !== "" && Number.isInteger(connectionNumber) && connectionNumber >= 0;

  const openConnections = (user: User) => {
    setConnectionTarget(user);
    setConnectionValue(String(user.numberOfConnections ?? 0));
    setConnectionReason("");
  };
  const saveConnections = () => {
    if (!connectionTarget || !connectionOk || !connectionReason.trim()) return;
    updateConnectionsMutation.mutate({
      adjustmentReason: connectionReason.trim(), requestId: crypto.randomUUID(),
      id: connectionTarget._id, numberOfConnections: connectionNumber,
    });
  };
  const toggleSubscriber = (user: User) => {
    setSubscriberPending(user._id);
    toggleSubscriberMutation.mutate({ id: user._id }, { onSettled: () => setSubscriberPending(null) });
  };
  const editProfile = (user: User) => router.push(`/dashboard/edit-profile/${user._id}`);
  const openShare = (user: User) => {
    setSelectedShareUser(user);
    setRecipientSearch("");
    setRecipientPage(1);
    setShareDialogOpen(true);
  };
  const directShare = (recipient: ShareRecipient) => {
    if (!shareProfile) { toast.error("প্রোফাইল এখনো লোড হচ্ছে"); return; }
    const number = recipient.whatsapp || recipient.phoneNumber;
    if (!number) { toast.error("এই ব্যবহারকারীর WhatsApp নাম্বার নেই"); return; }
    window.open(buildBiodataWhatsappShareUrlForNumber(shareProfile, window.location.origin, number, { includeContactNumber: false }), "_blank", "noopener,noreferrer");
    setShareDialogOpen(false);
  };
  const groupShare = async (group: BiodataWhatsappGroup) => {
    if (!shareProfile) { toast.error("প্রোফাইল এখনো লোড হচ্ছে"); return; }
    const { copied } = await openBiodataWhatsappGroupShare(shareProfile, window.location.origin, group.inviteUrl);
    toast.success(copied ? `${group.label} এর জন্য CV টেক্সট কপি করা হয়েছে। এখন গ্রুপে পেস্ট করে পাঠান।`
      : `${group.label} খুলে দেওয়া হয়েছে। প্রয়োজনে CV টেক্সট ম্যানুয়ালি কপি করে পাঠান।`);
    setShareDialogOpen(false);
  };
  const copyShareMessage = async () => {
    if (!shareProfile) { toast.error("প্রোফাইল এখনো লোড হচ্ছে"); return; }
    const { copied } = await copyBiodataWhatsappText(shareProfile, window.location.origin, { includeContactNumber: false });
    if (copied) toast.success("WhatsApp মেসেজ কপি করা হয়েছে। এতে ফোন নাম্বার রাখা হয়নি।");
    else toast.error("মেসেজ কপি করা যায়নি। আবার চেষ্টা করুন।");
  };
  const copyProfile = async (user: User) => {
    setCopyingUserId(user._id);
    try {
      const profile = await queryClient.fetchQuery({
        queryKey: ["admin-share-profile", user._id],
        queryFn: () => GetRequestNormal<BiodataUser>(`/user/get-user-profile-admin?id=${user._id}`),
        staleTime: 5 * 60 * 1000,
      });
      const { copied } = await copyBiodataWhatsappText(profile, window.location.origin, { includeContactNumber: false });
      if (copied) toast.success(`"${user.name}" এর WhatsApp মেসেজ কপি করা হয়েছে। এতে ফোন নাম্বার রাখা হয়নি।`);
      else toast.error("মেসেজ কপি করা যায়নি। আবার চেষ্টা করুন।");
    } catch {
      toast.error("কপি করার জন্য প্রোফাইল লোড করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setCopyingUserId((current) => current === user._id ? null : current);
    }
  };

  const copyWithContact=async(user:User)=>{
    setCopyingUserId(user._id);
    try{
      const profile=await queryClient.fetchQuery({
        queryKey:['admin-share-profile',user._id],
        queryFn:()=>GetRequestNormal<BiodataUser>('/user/get-user-profile-admin?id='+user._id),
        staleTime:300000,
      });
      const {copied}=await copyBiodataWhatsappText(profile,window.location.origin,{includeContactNumber:true});
      if(copied)toast.success('যোগাযোগ নম্বরসহ বায়োডাটা কপি হয়েছে');
      else toast.error('কপি করার অনুমতি পাওয়া যায়নি');
    }catch{toast.error('বায়োডাটা লোড করা যায়নি');}
    finally{setCopyingUserId(current=>current===user._id?null:current);}
  };
  const quickFilters=[
    {key:'accountType',label:'মেম্বারশিপ',options:[
      {value:'premium',label:'প্রিমিয়াম'},{value:'general',label:'সাধারণ'}]},
    {key:'verificationStatus',label:'যাচাই অবস্থা',options:[
      {value:'pending',label:'যাচাই বাকি'},{value:'approved',label:'যাচাইকৃত'},
      {value:'rejected',label:'বাতিল'},{value:'suspended',label:'স্থগিত'}]},
    {key:'maritalStatus',label:'বৈবাহিক অবস্থা',options:marriedStatus.filter(x=>x.en!=='all')
      .map(x=>({value:x.en,label:x.bn}))},
    {key:'districtId',label:'জেলা',options:districts.map(x=>({value:x.name,label:x.bn_name}))},
    {key:'sort',label:'সাজানোর ক্রম',options:[
      {value:'newest',label:'নতুন আগে'},{value:'oldest',label:'পুরোনো আগে'},
      {value:'ageAsc',label:'বয়স: কম আগে'},{value:'ageDesc',label:'বয়স: বেশি আগে'},
      {value:'connectionsAsc',label:'কানেকশন: কম আগে'},{value:'connectionsDesc',label:'কানেকশন: বেশি আগে'}]},
  ];
  const clearFilters=()=>{
    setSearch('');
    push(q=>{[...ADVANCED_KEYS,'query','gender','publish','memberJourney'].forEach(k=>q.delete(k));});
  };

  const actions = (user:User,compact=false):ReactNode => <div className={cn(
    'grid w-max grid-cols-[auto_auto] gap-1',compact?'justify-start':'ml-auto justify-end',
  )}>
    <button type="button" onClick={()=>editProfile(user)}
      aria-label={user.name+' এর প্রোফাইল এডিট করুন'}
      className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-[12px] font-semibold text-rose-800 transition hover:bg-rose-100">
      <Pencil size={14}/> এডিট
    </button>
    <button type="button" disabled={user.biodataStage==='published'}
      onClick={()=>setPublishTarget(user)}
      aria-label={user.name+' এর বায়োডাটা প্রকাশ করুন'}
      title={user.biodataStage==='published'?'বায়োডাটা ইতিমধ্যে প্রকাশিত':'বায়োডাটা প্রকাশ করুন'}
      className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[12px] font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-default disabled:opacity-70">
      <Globe2 size={14}/> {user.biodataStage==='published'?'প্রকাশিত':'প্রকাশ'}
    </button>
    <button type="button" aria-label={user.name+' এর স্মার্ট ম্যাচিং খুলুন'}
      title="এই সদস্যের স্মার্ট ম্যাচিং"
      onClick={()=>router.push((`/dashboard/matching?member=${encodeURIComponent(user._id)}`) as Parameters<typeof router.push>[0])}
      className="inline-flex min-h-8 items-center justify-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 text-[11px] font-semibold text-violet-800 transition hover:bg-violet-100">
      <Sparkles size={14}/> ম্যাচিং
    </button>
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={user.name+' এর অন্যান্য অ্যাকশন'}
          title="আরও অ্যাকশন"
          className="inline-flex min-h-8 w-full shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-600">
          <MoreHorizontal size={18}/> আরও
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6}
        className="z-[80] w-[230px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
        <DropdownMenuItem onSelect={()=>openShare(user)} className="min-h-10 gap-2.5 text-[13px]">
          <Share2 size={15} className="text-sky-600"/> WhatsApp-এ পাঠান
        </DropdownMenuItem>
        <DropdownMenuItem disabled={copyingUserId===user._id} onSelect={()=>void copyProfile(user)}
          className="min-h-10 gap-2.5 text-[13px]">
          <Copy size={15} className="text-amber-600"/> ফোন ছাড়া বায়োডাটা কপি
        </DropdownMenuItem>
        <DropdownMenuItem disabled={copyingUserId===user._id} onSelect={()=>void copyWithContact(user)}
          className="min-h-10 gap-2.5 text-[13px]">
          <Phone size={15} className="text-slate-600"/> যোগাযোগসহ কপি
        </DropdownMenuItem>
        <DropdownMenuSeparator/>
        <DropdownMenuItem variant="destructive" onSelect={()=>setDeleteTarget(user)}
          className="min-h-10 gap-2.5 text-[13px] font-semibold">
          <Trash2 size={15}/> সদস্য মুছুন
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>;

  const skeletonRows = Array.from({ length: 6 }, (_, i) => <tr key={i} className="border-b border-[#f0f0f0]">
    {Array.from({ length: 4+visibleColumns.length+profileColumns.length }, (_, j) => <td key={j} className="px-3 py-3.5"><div className="h-4 animate-pulse rounded bg-[#f1f3f5]" /></td>)}
  </tr>);

  return <DashboardPage>
    <DashboardHeader
      title="ব্যবহারকারী"
      description="সব সদস্য খুঁজুন, ফিল্টার করুন এবং পরিচালনা করুন।"
      meta={data ? <StatusPill tone="neutral">{data.totalItems.toLocaleString()} জন পাওয়া গেছে</StatusPill> : null}
      actions={<>
        {quickLinks.map((link) => <a key={link.href} href={link.href} className={darkLink}>{link.label}</a>)}
        <DashButton tone="ghost-dark" disabled={isFetching} onClick={refreshAll} aria-label="রিফ্রেশ">
          <RefreshCw size={14} className={isFetching ? "animate-spin" : undefined} />
        </DashButton>
      </>}>
      <label className="relative w-full sm:min-w-[240px] sm:flex-1 lg:max-w-md">
        <span className="sr-only">খুঁজুন</span>
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/50" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="নাম, ইমেইল, ফোন বা বায়োডাটা নাম্বার"
          className={cn(darkField, "w-full pl-8")} />
        {search && <button type="button" aria-label="খোঁজ মুছুন" onClick={() => setSearch("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-white/60 hover:text-white"><X size={14} /></button>}
      </label>
      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
        <select aria-label="লিঙ্গ" value={tableFilters.gender} onChange={(e) => void setTableFilters({ gender: e.target.value, page: 1 })} className={darkField}>
          <option value="all">সকল লিঙ্গ</option><option value="male">পুরুষ</option><option value="female">মহিলা</option>
        </select>
        <select aria-label="প্রকাশ" value={tableFilters.publish} onChange={(e) => void setTableFilters({ publish: e.target.value, page: 1 })} className={darkField}>
          <option value="all">প্রকাশিত ও লুকানো</option><option value="true">প্রকাশিত</option><option value="false">অপ্রকাশিত</option>
        </select>
      </div>
      <select aria-label="বায়োডাটা অগ্রগতি" value={params.get("memberJourney")||""}
        onChange={e=>push(q=>{if(e.target.value)q.set("memberJourney",e.target.value);else q.delete("memberJourney");q.set("page","1");})}
        className={darkField}>
        <option value="">সব পর্যায়</option>
        <option value="signed_up">শুধু সাইনআপ</option>
        <option value="in_progress">খসড়া পূরণ করছে</option>
        <option value="submitted">জমা হয়েছে, প্রকাশ বাকি</option>
        <option value="published">প্রকাশিত</option>
      </select>
      <DashButton tone={filtersOpen ? "primary" : "ghost-dark"} className="w-full sm:w-auto" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((v) => !v)}>
        <Filter size={14} /> আরও ফিল্টার
        {activeAdvanced > 0 && <span className="rounded-full bg-white px-1.5 text-[11px] font-semibold text-rose-700">{activeAdvanced}</span>}
      </DashButton>
    </DashboardHeader>

    <div className="flex flex-wrap items-center gap-2">
      {isAdmin&&<MemberBiodataColumnPicker
        availableFields={customData?.availableFields||[]}
        selected={customData?.profileColumns||[]}
        onSaved={refreshCustom} disabled={customLoading||!!customError}/>}
      {isAdmin&&<details className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700">
        <summary className="cursor-pointer font-semibold">পুরোনো নোট কলাম</summary>
        <div className="pt-2"><MemberDynamicColumnManager columns={customData?.columns||[]} onSaved={refreshCustom}/></div>
      </details>}
      <button type="button" onClick={()=>setQuickOpen(value=>!value)} aria-expanded={quickOpen}
        aria-controls="member-quick-filters"
        className={cn('inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-[12px] font-semibold transition',
          quickOpen?'border-rose-300 bg-rose-50 text-rose-800':'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')}>
        <Filter size={14}/> {quickOpen?'ফিল্টার লুকান':'দ্রুত ফিল্টার'}
        {[...ADVANCED_KEYS,'memberJourney'].filter(key=>params.get(key)).length>0&&
          <span className="rounded-full bg-rose-100 px-1.5 text-[11px] text-rose-800">
            {[...ADVANCED_KEYS,'memberJourney'].filter(key=>params.get(key)).length}
          </span>}
      </button>
      <a href="/dashboard/matching" className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-pink-700"><Sparkles size={16}/> Admin Smart Matching</a>
      <details className="max-w-3xl rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700">
        <summary className="cursor-pointer font-semibold">স্ট্যাটাসগুলোর মানে কী?</summary>
        <p className="mt-2 leading-6"><strong>মূল সদস্য:</strong> সাধারণ ইউজার অ্যাকাউন্ট, স্টাফ নয়। <strong>সাবস্ক্রাইবার ও প্রিমিয়াম:</strong> বর্তমানে একই isSubscriber flag; আলাদা পেমেন্ট-ভেরিফিকেশন স্ট্যাটাস নয়। <strong>প্রকাশিত:</strong> উভয় প্রকাশ অনুমতি এবং নিষিদ্ধ নয়। <strong>যাচাই বাকি:</strong> verification pending। <strong>খসড়া:</strong> বায়োডাটা লেখা শুরু হয়েছে কিন্তু জমা হয়নি। <strong>জমা হয়েছে:</strong> রিভিউ/প্রকাশের জন্য দেওয়া হয়েছে।</p>
      </details>
    </div>
    {quickOpen&&<section id="member-quick-filters" aria-label="দ্রুত মেম্বার ফিল্টার"
      className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-bold text-slate-900">দ্রুত ফিল্টার</h2>
          <p className="text-[12px] leading-5 text-slate-500">
            মেম্বারশিপ, যাচাই, বৈবাহিক অবস্থা বা জেলা বেছে নিলেই ফলাফল বদলে যাবে।
          </p>
        </div>
        <button type="button" onClick={clearFilters}
          className="rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-700 hover:border-rose-200 hover:bg-rose-50">
          সব ফিল্টার মুছুন
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5">
        {quickFilters.map(filter=><label key={filter.key} className="min-w-0 space-y-1">
          <span className="block text-[12px] font-semibold text-slate-600">{filter.label}</span>
          <select aria-label={filter.label}
            value={filter.key==='maritalStatus'&&params.get(filter.key)?.includes(',')?'__multiple':params.get(filter.key)||''}
            onChange={event=>push(q=>{
              if(event.target.value)q.set(filter.key,event.target.value);
              else q.delete(filter.key);
            })}
            className={cn(fieldClass,'w-full min-w-0 text-[13px]',
              params.get(filter.key)&&'border-rose-300 bg-rose-50/50')}>
            <option value="">সকল</option>
            {filter.key==='maritalStatus'&&params.get(filter.key)?.includes(',')&&
              <option value="__multiple" disabled>একাধিক নির্বাচিত</option>}
            {filter.options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>)}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <span className="mr-1 text-[12px] font-semibold text-slate-600">বায়োডাটা পর্যায়</span>
        {[
          {value:'',label:'সব সদস্য'},
          {value:'signed_up',label:'শুধু সাইনআপ'},
          {value:'in_progress',label:'খসড়া'},
          {value:'submitted',label:'জমা হয়েছে'},
          {value:'published',label:'প্রকাশিত'},
        ].map(step=>{
          const active=(params.get('memberJourney')||'')===step.value;
          return <button type="button" key={step.value} aria-pressed={active}
            onClick={()=>push(q=>{if(step.value)q.set('memberJourney',step.value);else q.delete('memberJourney');})}
            className={cn('rounded-full border px-3 py-1.5 text-[12px] font-semibold transition',
              active?'border-rose-600 bg-rose-600 text-white':'border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50')}>
            {step.label}
          </button>;
        })}
      </div>
    </section>}
    <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <StatCard label="মূল সদস্য" value={totalCount.data?.totalItems} hint="সক্রিয় সদস্য অ্যাকাউন্ট (মুছে ফেলা বাদ)" active={noFilters}
        onClick={() => push((q) => { [...ADVANCED_KEYS, "query", "gender", "publish", "memberJourney"].forEach((k) => { if (k !== "limit" && k !== "sort") q.delete(k); }); })} />
      <StatCard label="প্রকাশিত" value={publishedCount.data?.totalItems} hint="বায়োডাটা সবাই দেখতে পায়" active={tableFilters.publish === "true"}
        onClick={() => void setTableFilters({ publish: tableFilters.publish === "true" ? "all" : "true", page: 1 })} />
      <StatCard label="প্রিমিয়াম" value={premiumCount.data?.totalItems} hint="বর্তমান Premium/Subscriber flag" active={params.get("accountType") === "premium"}
        onClick={() => push((q) => { if (q.get("accountType") === "premium") q.delete("accountType"); else q.set("accountType", "premium"); })} />
      <StatCard label="যাচাই অপেক্ষমাণ" value={pendingCount.data?.totalItems} hint="যাদের যাচাই অবস্থা pending" active={params.get("verificationStatus") === "pending"}
        onClick={() => push((q) => { if (q.get("verificationStatus") === "pending") q.delete("verificationStatus"); else q.set("verificationStatus", "pending"); })} />
    </section>

    {isAdmin&&customError&&<p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Internal member columns could not load. Refresh to retry.</p>}
    {filtersOpen && <AdminUserFilters onClose={() => setFiltersOpen(false)} />}
    <ActiveFilterChips onEdit={() => setFiltersOpen(true)} />

    <Panel bodyClassName="p-0" title="সদস্য তালিকা"
      description={data ? `দেখানো হচ্ছে ${firstRow.toLocaleString()}–${lastRow.toLocaleString()}, মোট ${data.totalItems.toLocaleString()} জন` : "লোড হচ্ছে…"}
      actions={isFetching && !isLoading ? <span className="inline-flex items-center gap-1.5 text-[12px] text-[#6c757d]"><Loader2 size={13} className="animate-spin" /> আপডেট হচ্ছে</span> : undefined}>
      {error ? <div className="px-4 py-14 text-center">
        <p className="text-[14px] font-medium text-red-700">ডেটা লোড করতে সমস্যা হয়েছে</p>
        <DashButton className="mt-3" onClick={() => void refetch()}><RefreshCw size={14} /> আবার চেষ্টা করুন</DashButton>
      </div> : <>
        <div className="hidden overflow-x-auto md:block">
          <table className={cn("w-full min-w-[850px] border-collapse text-[13px] transition-opacity", isFetching && !isLoading && "opacity-60")}>
            <thead className="bg-white">
              <tr>
                <PlainHeader label="সদস্যের তথ্য" />
                <PlainHeader label="অগ্রগতি · কানেকশন · সাবস্ক্রাইবার" />
                {profileColumns.map(column=><PlainHeader key={column.id} label={column.label}/>)}
                {visibleColumns.map(column=><PlainHeader key={column.id} label={column.label} />)}
                <PlainHeader label="অবস্থা" />
                <PlainHeader label="অ্যাকশন" className="sticky right-0 z-20 bg-white text-right shadow-[-8px_0_16px_-12px_rgba(15,23,42,.2)]" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? skeletonRows : users.map((user) => <tr key={user._id} className="border-b border-[#f0f0f0] last:border-0 hover:bg-[#f8f9fa]">
                <td className="min-w-[270px] max-w-[350px] px-4 py-3">
                  <MemberIdentity user={user} onEdit={()=>editProfile(user)}/>
                </td>
                <td className="px-3 py-2.5"><MemberProgress user={user}
                  onConnections={()=>openConnections(user)} onSubscriber={()=>toggleSubscriber(user)}
                  subscriberBusy={subscriberPending===user._id}/></td>
                {profileColumns.map(column=><td key={column.id} className="min-w-[120px] max-w-[230px] px-2.5 py-2.5 align-top">
                  <ProfileBadges column={column}
                    values={customData?.profileValues?.[user._id]}
                    fields={customData?.availableFields||[]}/>
                </td>)}
                {visibleColumns.map(column=><td key={column.id} className="px-3 py-2.5">
                  <MemberValueButton column={column} value={customData?.values?.[user._id]?.[column.id]}
                    onClick={()=>openMemberCell(user,column)}/>
                </td>)}
                <td className="px-3 py-2.5"><StatusPills user={user} /></td>
                <td className="sticky right-0 z-10 min-w-[178px] bg-white px-2 py-2 align-top shadow-[-8px_0_16px_-12px_rgba(15,23,42,.2)]">{actions(user)}</td>
              </tr>)}
              {!isLoading && !users.length && <tr><td colSpan={4+visibleColumns.length+profileColumns.length} className="px-3 py-14 text-center text-[13px] text-[#6c757d]">
                কোনো ব্যবহারকারী পাওয়া যায়নি।
                {!noFilters && <button type="button" className="ml-1 font-medium text-rose-700 underline"
                  onClick={() => push((q) => { q.delete("query"); q.delete("gender"); q.delete("publish"); })}>খোঁজ ও প্রধান ফিল্টার মুছুন</button>}
              </td></tr>}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-[#f0f0f0] md:hidden">
          {isLoading ? Array.from({ length: 4 }, (_, i) => <li key={i} className="space-y-2 p-4">
            <div className="h-4 w-1/2 animate-pulse rounded bg-[#f1f3f5]" /><div className="h-3 w-3/4 animate-pulse rounded bg-[#f1f3f5]" />
          </li>) : users.map((user) => <li key={user._id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <MemberIdentity user={user} onEdit={()=>editProfile(user)} compact/>
              </div>
              <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1.5 text-[11px] font-semibold text-slate-600">#{user.userId||'—'}</span>
            </div>
            <MemberProgress user={user}
              onConnections={()=>openConnections(user)} onSubscriber={()=>toggleSubscriber(user)}
              subscriberBusy={subscriberPending===user._id}/>
            {!!(visibleColumns.length||profileColumns.length)&&<div className="flex flex-wrap gap-2">
              {profileColumns.map(column=><div key={column.id} className="min-w-0 max-w-full space-y-1 rounded-lg bg-slate-50 px-2.5 py-2">
                <p className="text-[11px] font-semibold text-slate-500">{column.label}</p>
                <ProfileBadges column={column}
                  values={customData?.profileValues?.[user._id]}
                  fields={customData?.availableFields||[]}/>
              </div>)}
              {visibleColumns.map(column=><div key={column.id} className="max-w-full space-y-1">
                <p className="text-[11px] font-semibold text-slate-500">{column.label}</p>
                <MemberValueButton column={column} value={customData?.values?.[user._id]?.[column.id]}
                  onClick={()=>openMemberCell(user,column)}/>
              </div>)}
            </div>}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusPills user={user} />
            </div>
            <div className="border-t border-[#f0f0f0] pt-2">{actions(user, true)}</div>
          </li>)}
          {!isLoading && !users.length && <li className="px-4 py-12 text-center text-[13px] text-[#6c757d]">কোনো ব্যবহারকারী পাওয়া যায়নি।</li>}
        </ul>

        {data && data.totalItems > 0 && <div className="flex flex-col gap-3 border-t border-[#f0f0f0] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-[12px] text-[#6c757d]">প্রতি পেজে
            <select value={String(limit)} onChange={(e) => push((q) => q.set("limit", e.target.value))} className={cn(fieldClass, "w-auto py-1 text-[13px]")}>
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <nav aria-label="পেজ" className="flex items-center gap-1 self-center sm:self-auto">
            <DashButton className="px-2" aria-label="আগের পেজ" disabled={page <= 1 || isFetching} onClick={() => void setTableFilters({ page: page - 1 })}><ChevronLeft size={15} /></DashButton>
            {pageList(page, totalPages).map((item, i) => item === "gap"
              ? <span key={"gap" + i} className="px-1 text-[#adb5bd]">…</span>
              : <button key={item} type="button" aria-current={item === page ? "page" : undefined} onClick={() => void setTableFilters({ page: item })}
                className={cn("hidden h-8 min-w-8 rounded-md px-2 text-[13px] tabular-nums sm:inline-block", item === page ? "bg-[#1a1a2e] text-white" : "hover:bg-[#f1f3f5]")}>{item}</button>)}
            <span className="px-2 text-[13px] tabular-nums text-[#495057] sm:hidden">{page} / {totalPages}</span>
            <DashButton className="px-2" aria-label="পরের পেজ" disabled={page >= totalPages || isFetching} onClick={() => void setTableFilters({ page: page + 1 })}><ChevronRight size={15} /></DashButton>
          </nav>
        </div>}
      </>}
    </Panel>

    <Dialog open={!!selectedCell} onOpenChange={open=>{if(!open&&!savingCell)setSelectedCell(null)}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Internal member data · {selectedCell?.column.label}</DialogTitle>
          <DialogDescription>
            {selectedCell?.name} · এই তথ্য শুধু Admin Management-এ থাকবে, Public Biodata-তে নয়।
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={event=>{event.preventDefault();void saveMemberCell()}}>
          <label className="block text-[13px] font-semibold text-slate-700">
            {selectedCell?.column.label} value
            {selectedCell?.column.type==='choice'?
              <select value={cellText} onChange={event=>setCellText(event.target.value)}
                className={cn(fieldClass,'mt-1 w-full')}>
                <option value="">No value</option>
                {selectedCell.column.options.map(option=><option key={option} value={option}>{option}</option>)}
              </select>:
            selectedCell?.column.type==='flag'?
              <select value={cellFlag} onChange={event=>setCellFlag(event.target.value)}
                className={cn(fieldClass,'mt-1 w-full')}>
                <option value="">Not set</option><option value="true">Yes</option><option value="false">No</option>
              </select>:
              <textarea rows={3} maxLength={250} value={cellText} onChange={event=>setCellText(event.target.value)}
                placeholder="Write a short internal note..." className={cn(fieldClass,'mt-1 w-full resize-y')}/>}
          </label>
          <p className="text-xs leading-5 text-slate-500">
            এই কলামে শুধু অ্যাডমিনের Internal Notes বা Follow-up তথ্য সংরক্ষিত হয়।
            আসল বায়োডাটা উত্তর টেবিলে দেখাতে “বায়োডাটা কলাম বাছুন” ব্যবহার করুন।
            এই নোট সদস্যের পাবলিক প্রোফাইল বা ম্যাচিং র‍্যাঙ্কিং বদলায় না।
          </p>
          <div className="flex justify-end gap-2">
            <DashButton type="button" onClick={()=>setSelectedCell(null)} disabled={savingCell}>Cancel</DashButton>
            <DashButton type="submit" tone="primary" disabled={savingCell}>
              {savingCell?<Loader2 size={14} className="animate-spin"/>:<Check size={14}/>} Save member data
            </DashButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={!!connectionTarget} onOpenChange={(open) => { if (!open) setConnectionTarget(null); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>কানেকশন ব্যালেন্স পরিবর্তন</DialogTitle>
          <DialogDescription>{connectionTarget?.name}: বর্তমানে {connectionTarget?.numberOfConnections ?? 0}টি কানেকশন। পরিবর্তনটি অডিট হিস্ট্রিতে সংরক্ষিত হবে।</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveConnections(); }}>
          <div>
            <label htmlFor="connection-value" className={labelClass}>নতুন ব্যালেন্স</label>
            <input id="connection-value" type="number" min={0} step={1} inputMode="numeric" autoFocus value={connectionValue}
              onChange={(e) => setConnectionValue(e.target.value)} className={cn(fieldClass, "w-40")} aria-invalid={!!connectionValue && !connectionOk} />
            {!!connectionValue && !connectionOk && <p className="mt-1 text-[11px] text-red-600">০ বা তার বেশি পূর্ণ সংখ্যা দিন।</p>}
          </div>
          <div>
            <label htmlFor="connection-reason" className={labelClass}>কারণ <span className="text-red-600">*</span></label>
            <input id="connection-reason" dir="auto" value={connectionReason} onChange={(e) => setConnectionReason(e.target.value)}
              placeholder="যেমন: পেমেন্ট যাচাই করা হয়েছে" className={fieldClass} />
          </div>
          <div className="flex justify-end gap-2">
            <DashButton onClick={() => setConnectionTarget(null)}>বাতিল</DashButton>
            <DashButton type="submit" tone="primary" disabled={!connectionOk || !connectionReason.trim() || updateConnectionsMutation.isPending}>
              {updateConnectionsMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} সংরক্ষণ করুন
            </DashButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={!!publishTarget} onOpenChange={(open) => { if (!open) setPublishTarget(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>“{publishTarget?.name}” এর বায়োডাটা প্রকাশ করবেন?</AlertDialogTitle>
          <AlertDialogDescription>সম্পূর্ণতা {publishTarget?.completionPercentage ?? 0}%। আগে সদস্যকে বায়োডাটা জমা দিতে হবে। প্রকাশের পর অন্যরা বায়োডাটা দেখতে পারবেন।</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>বাতিল</AlertDialogCancel>
          <AlertDialogAction disabled={publishMutation.isPending || !publishTarget || publishTarget.completionPercentage !== 100 ||
            !["submitted","under_review","rejected"].includes(publishTarget.memberJourney === "submitted" ? "submitted" : publishTarget.biodataStage ?? "")}
            className="bg-pink-600 hover:bg-pink-700"
            onClick={() => {if(publishTarget) publishMutation.mutate({id:publishTarget._id});setPublishTarget(null);}}>
            নিশ্চিত করে প্রকাশ করুন
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>“{deleteTarget?.name || "এই ব্যবহারকারী"}” কে মুছে ফেলবেন?</AlertDialogTitle>
          <AlertDialogDescription>এই কাজটি ফেরানো যাবে না। অ্যাকাউন্ট ও তার সমস্ত ডেটা স্থায়ীভাবে মুছে যাবে।</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>বাতিল</AlertDialogCancel>
          <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget._id); setDeleteTarget(null); }}>
            মুছে ফেলুন
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog open={shareDialogOpen} onOpenChange={(open) => { setShareDialogOpen(open); if (!open) { setRecipientSearch(""); setRecipientPage(1); } }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{selectedShareUser?.name ? `“${selectedShareUser.name}” এর CV WhatsApp এ পাঠান` : "WhatsApp এ CV পাঠান"}</DialogTitle>
          <DialogDescription>একজন সদস্যকে সরাসরি, অথবা WhatsApp গ্রুপে পাঠান। মেসেজে ফোন নাম্বার থাকবে না।</DialogDescription>
        </DialogHeader>
        {isShareProfileLoading && <p className="flex items-center gap-2 rounded-md bg-[#f8f9fa] px-3 py-2 text-[13px] text-[#6c757d]"><Loader2 size={14} className="animate-spin" /> CV তৈরি হচ্ছে…</p>}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start">
          <section className="space-y-3 rounded-lg border border-[#e9ecef] p-4">
            <div>
              <h3 className="text-[14px] font-semibold">ব্যক্তিগত WhatsApp</h3>
              <p className="text-[12px] text-[#6c757d]">একজন নির্দিষ্ট সদস্যকে সরাসরি পাঠান।</p>
            </div>
            <label className="relative block">
              <span className="sr-only">সদস্য খুঁজুন</span>
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#adb5bd]" />
              <input value={recipientSearch} onChange={(e) => { setRecipientSearch(e.target.value); setRecipientPage(1); }}
                placeholder="নাম, ফোন বা বায়োডাটা নাম্বার" className={cn(fieldClass, "pl-8")} />
            </label>
            <div className="rounded-md border border-[#e9ecef]">
              {isRecipientsLoading ? <p className="flex h-40 items-center justify-center gap-2 text-[13px] text-[#6c757d]"><Loader2 size={14} className="animate-spin" /> তালিকা লোড হচ্ছে…</p>
                : !recipients.length ? <p className="flex h-40 items-center justify-center text-[13px] text-[#6c757d]">কোনো সদস্য পাওয়া যায়নি।</p>
                  : <ScrollArea className="h-[280px]">
                    <ul className="divide-y divide-[#f0f0f0]">{recipients.map((recipient) => {
                      const number = recipient.whatsapp || recipient.phoneNumber;
                      return <li key={recipient._id} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium">{recipient.name || "নাম নেই"}</p>
                          <p className="text-[12px] text-[#6c757d]">#{recipient.userId || "—"} · {number || "WhatsApp নাম্বার নেই"}</p>
                        </div>
                        <DashButton tone="primary" className="bg-green-600 hover:bg-green-700" disabled={!number || !shareProfile || isShareProfileLoading}
                          onClick={() => directShare(recipient)}><Send size={13} /> পাঠান</DashButton>
                      </li>;
                    })}</ul>
                  </ScrollArea>}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#6c757d]">
              <span>মোট {recipientsData?.totalItems ?? 0} জন{isRecipientsFetching && !isRecipientsLoading ? " · আপডেট হচ্ছে…" : ""}</span>
              {!!recipientsData && recipientsData.totalPages > 1 && <div className="flex items-center gap-1.5">
                <DashButton className="px-2 py-1" aria-label="আগের" disabled={!recipientsData.hasPreviousPage || isRecipientsFetching} onClick={() => setRecipientPage((p) => Math.max(1, p - 1))}><ChevronLeft size={14} /></DashButton>
                <span className="tabular-nums">{recipientPage} / {recipientsData.totalPages}</span>
                <DashButton className="px-2 py-1" aria-label="পরের" disabled={!recipientsData.hasNextPage || isRecipientsFetching} onClick={() => setRecipientPage((p) => p + 1)}><ChevronRight size={14} /></DashButton>
              </div>}
            </div>
          </section>
          <section className="space-y-3 rounded-lg border border-[#e9ecef] p-4">
            <div>
              <h3 className="text-[14px] font-semibold">WhatsApp গ্রুপ</h3>
              <p className="text-[12px] text-[#6c757d]">গ্রুপ খুলবে এবং CV টেক্সট কপি হয়ে যাবে।</p>
            </div>
            {BIODATA_WHATSAPP_GROUPS.map((group) => <div key={group.id} className="space-y-2 rounded-md border border-dashed border-[#ced4da] p-3">
              <p className="text-[13px] font-medium">{group.label}</p>
              <p className="text-[12px] text-[#6c757d]">{group.description}</p>
              <DashButton tone="primary" className="w-full bg-green-600 hover:bg-green-700" disabled={!shareProfile || isShareProfileLoading}
                onClick={() => void groupShare(group)}><Send size={13} /> এই গ্রুপে পাঠান</DashButton>
            </div>)}
            <DashButton className="w-full" disabled={!shareProfile || isShareProfileLoading} onClick={() => void copyShareMessage()}>
              <Copy size={13} /> শুধু মেসেজ কপি করুন
            </DashButton>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  </DashboardPage>;
}
