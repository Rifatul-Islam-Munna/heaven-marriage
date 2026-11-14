"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Eye,
  EyeOff,
  MessageCircle,
  Send,
  Trash2,
  Mail,
  ShieldCheck,
  ClipboardList,
  Save,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useProfileStore } from "@/zustan/useProfileStore";
import { DynamicQuestionStep } from "../custom/updateProfile/DynamicQuestionStep";
import { defaultQuestions, questionRuleErrors, type ProfileQuestionSchema } from "@/lib/profile-questions";
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BasicInfoStep } from "../custom/updateProfile/BasicInfoStep";
import { AddressStep } from "../custom/updateProfile/AddressStep";
import { EducationStep } from "../custom/updateProfile/EducationStep";
import { PersonalInfoStep } from "../custom/updateProfile/PersonalInfoStep";
import { FamilyInfoStep } from "../custom/updateProfile/FamilyInfoStep";
import { OccupationalStep } from "../custom/updateProfile/OccupationalStep";
import { MarriageInfoStep } from "../custom/updateProfile/MarriageInfoStep";
import { ExpectedPartnerStep } from "../custom/updateProfile/ExpectedPartnerStep";
import { CustomQuestionsStep } from "../custom/updateProfile/CustomQuestionsStep";
import { PledgeStep } from "../custom/updateProfile/PledgeStep";
import { User } from "@/@types/user";
import {getAdminBiodataProgress} from "@/lib/admin-biodata-progress";
import AdminBiodataSectionOverview from './AdminBiodataSectionOverview';
import {diffBiodataDraft,hasBiodataChanges} from "@/lib/biodata-draft";
import AdminPasswordCard from "./AdminPasswordCard";
import {
  BIODATA_WHATSAPP_GROUPS,
  BiodataWhatsappGroup,
  openBiodataWhatsappGroupShare,
} from "@/lib/biodata-whatsapp-share";

const steps = [
  "মৌলিক তথ্য",
  "ঠিকানা",
  "শিক্ষাগত যোগ্যতা",
  "ব্যক্তিগত তথ্য",
  "পারিবারিক তথ্য",
  "পেশাগত তথ্য",
  "বিবাহ সম্পর্কিত তথ্য",
  "প্রত্যাশিত জীবনসঙ্গী",
  "অতিরিক্ত তথ্য",
  "অঙ্গীকার",
];

export default function ProfileUpdateForm({ id }: { id: string }) {
  const currentStep = useProfileStore((state) => state.currentStep);
  const setCurrentStep = useProfileStore((state) => state.setCurrentStep);
  const getFormData = useProfileStore((state) => state.getFormData);
  const initializeForm = useProfileStore((state) => state.initializeForm);
  const [questionSchema,setQuestionSchema] = useState<ProfileQuestionSchema>(defaultQuestions);
  const [editMode,setEditMode] = useState<'biodata'|'account'>('biodata');
  const [contactEmail,setContactEmail]=useState('');
  const [contactPhone,setContactPhone]=useState('');
  const formRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLElement>(null);
  const initialBiodataRef = useRef<Record<string,unknown> | null>(null);
  const loadedMemberRef=useRef<string>('');
  const goToFormRef=useRef(false);
  const goToAccountRef=useRef(false);
  useEffect(()=>{
    const controller=new AbortController();
    void fetch("/api/profile-questions",{signal:controller.signal})
      .then(r=>r.ok?r.json():Promise.reject(Error()))
      .then((v:ProfileQuestionSchema)=>{if(Array.isArray(v.questions))setQuestionSchema(v);})
      .catch(()=>{});
    return ()=>controller.abort();
  },[]);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Alert dialog states
  const [showHideAlert, setShowHideAlert] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const contacts = useProfileStore(state => state.formData);
  const sectionProgress=useMemo(()=>getAdminBiodataProgress(questionSchema,contacts),[questionSchema,contacts]);
  const activeSteps=useMemo(()=>sectionProgress.map(section=>section.id),[sectionProgress]);
  const stepPosition=Math.max(0,activeSteps.indexOf(currentStep));
  const activeProgress=sectionProgress.find(section=>section.id===currentStep);
  const biodataDirty=!!initialBiodataRef.current && hasBiodataChanges(
    diffBiodataDraft(initialBiodataRef.current,contacts as Record<string,unknown>));
  const scrollToSection = () => {
    if(typeof window==='undefined')return;
    const smooth=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.requestAnimationFrame(()=>formRef.current?.scrollIntoView({behavior:smooth?'smooth':'instant',block:'start'}));
  };
  const openSection=(index:number)=>{
    setEditMode('biodata');
    goToFormRef.current=true;
    setCurrentStep(index);
    scrollToSection();
  };
  useEffect(()=>{
    if(editMode==='biodata'&&goToFormRef.current) {
      goToFormRef.current=false;
      scrollToSection();
    }
  },[currentStep,editMode]);
  const openAccount=()=>{
    goToAccountRef.current=true;
    setEditMode('account');
  };
  useEffect(()=>{
    if(editMode==='account' && goToAccountRef.current){
      goToAccountRef.current=false;
      const smooth=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.requestAnimationFrame(()=>accountRef.current?.scrollIntoView({behavior:smooth?'smooth':'instant',block:'start'}));
    }
  },[editMode]);
  useEffect(()=>{
    if(activeSteps.length && !activeSteps.includes(currentStep))
      setCurrentStep(activeSteps.find(index=>index>currentStep)??activeSteps[activeSteps.length-1]);
  },[activeSteps,currentStep,setCurrentStep]);
  const { mutate: saveContacts, isPending: isSavingContacts } = useCommonMutationApi({
    method: "PATCH", url: "/user/update-user-admin", mutationKey: ["admin-user-contacts", id],
    successMessage: "ফোন ও ইমেইল সংরক্ষিত হয়েছে",
    onSuccess: () => { refetch(); },
  });

  const handleNext = () => {
    if (activeSteps[stepPosition+1]!==undefined) openSection(activeSteps[stepPosition+1]);
  };

  const { data, isLoading, refetch } = useQueryWrapper<User>(
    ["get-my-profile", id],
    `/user/get-user-profile-admin?id=${id}`,
    {
      enabled: !!id,
    },
  );

  // Update mutation
  const { mutate, isPending } = useCommonMutationApi({
    method: "PATCH",
    url: "/user/update-user-admin",
    mutationKey: ["update-user"],
    successMessage: "বায়োডাটার পরিবর্তন সংরক্ষিত হয়েছে",
    onSuccess: () => {
      initialBiodataRef.current=useProfileStore.getState().getFormData() as Record<string,unknown>;
      void queryClient.invalidateQueries({ queryKey: ["admin-share-profile", id] });
      void refetch();
    },
  });

  // Hide/Unhide mutation
  const { mutate: toggleVisibility, isPending: isTogglingVisibility } =
    useCommonMutationApi({
      method: "PATCH",
      url: "/user/update-user-admin", // Adjust to your actual endpoint
      mutationKey: ["toggle-visibility"],
      successMessage: data?.isPublishFromAdmin
        ? "প্রোফাইল লুকানো হয়েছে"
        : "প্রোফাইল প্রকাশিত হয়েছে",
      onSuccess: () => {
        refetch();
      },
    });

  // Delete mutation
  const { mutate: deleteUser, isPending: isDeleting } = useCommonMutationApi({
    method: "DELETE",
    url: "/user/delete-user-admin", // Adjust to your actual endpoint
    mutationKey: ["delete-user"],
    successMessage: "ব্যবহারকারী মুছে ফেলা হয়েছে",
    onSuccess: () => {
      router.push("/dashboard");
    },
  });

  useEffect(() => {
    if (!data) return;
    const memberId=String(data._id||id);
    const current=useProfileStore.getState().getFormData() as Record<string,unknown>;
    const pending=initialBiodataRef.current && hasBiodataChanges(
      diffBiodataDraft(initialBiodataRef.current,current));
    // Contact, visibility and other server refreshes must never erase an unsaved biodata draft.
    // Loading a different member always replaces the old draft.
    if(!pending || loadedMemberRef.current!==memberId) {
      // Refresh saved answers without sending Next/Previous back to the first section.
      initializeForm(data, { preserveStep: loadedMemberRef.current===memberId });
      initialBiodataRef.current=useProfileStore.getState().getFormData() as Record<string,unknown>;
      loadedMemberRef.current=memberId;
    }
    setContactEmail(data.email || '');
    setContactPhone(data.phoneNumber || '');
  }, [data, id, initializeForm]);

  const handlePrevious = () => {
    if (activeSteps[stepPosition-1]!==undefined) openSection(activeSteps[stepPosition-1]);
  };

  const handleSubmit = () => {
    if(!data || !initialBiodataRef.current)return;
    const errors=questionRuleErrors(getFormData(),questionSchema.questions);
    if(errors.length){toast.error(errors[0].message);return;}
    // Account credentials are edited only in the separate Account & Security section.
    // Patch changed biodata fields instead of sending stale account / payment fields.
    const changes=diffBiodataDraft(initialBiodataRef.current,
      getFormData() as Record<string,unknown>);
    if(!hasBiodataChanges(changes)) {
      toast.info('কোনো নতুন Biodata পরিবর্তন নেই');
      return;
    }
    mutate({id,...changes});
  };

  // Handle hide/unhide confirmation
  const handleToggleVisibility = () => {
    toggleVisibility({
      id,
      isPublishFromAdmin: !data?.isPublishFromAdmin,
    });
    setShowHideAlert(false);
  };

  // Handle delete confirmation
  const handleDelete = () => {
    deleteUser({ id });
    setShowDeleteAlert(false);
  };

  const getShareProfile = (): User | undefined => {
    if (!data) return undefined;

    const formData = getFormData() as Partial<User>;

    return {
      ...data,
      ...formData,
      address: {
        ...data.address,
        ...formData.address,
      },
      educationInfo: {
        ...data.educationInfo,
        ...formData.educationInfo,
      },
      familyInfo: {
        ...data.familyInfo,
        ...formData.familyInfo,
      },
      personalInformation: {
        ...data.personalInformation,
        ...formData.personalInformation,
      },
      occupational: {
        ...data.occupational,
        ...formData.occupational,
      },
      marriageInformationWomen: {
        ...data.marriageInformationWomen,
        ...formData.marriageInformationWomen,
      },
      marriageInformationMan: {
        ...data.marriageInformationMan,
        ...formData.marriageInformationMan,
      },
      expectedLifePartner: {
        ...data.expectedLifePartner,
        ...formData.expectedLifePartner,
      },
      pledge: {
        ...data.pledge,
        ...formData.pledge,
      },
      customFields: {
        ...data.customFields,
        ...formData.customFields,
      },
    } as User;
  };

  const handleOpenShareDialog = () => {
    setShareDialogOpen(true);
  };

  const handleWhatsAppGroupShare = async (group: BiodataWhatsappGroup) => {
    if (typeof window === "undefined") return;

    const profile = getShareProfile();
    if (!profile) {
      toast.error("প্রোফাইল তথ্য এখনো লোড হয়নি");
      return;
    }

    const { copied } = await openBiodataWhatsappGroupShare(
      profile,
      window.location.origin,
      group.inviteUrl,
    );

    toast.success(
      copied
        ? `${group.label} এর জন্য CV টেক্সট কপি করা হয়েছে। এখন গ্রুপে পেস্ট করে পাঠান।`
        : `${group.label} খুলে দেওয়া হয়েছে। প্রয়োজনে CV টেক্সট ম্যানুয়ালি কপি করে পাঠান।`,
    );
    setShareDialogOpen(false);
  };

  const renderStep = () => <DynamicQuestionStep step={currentStep} schema={questionSchema} />;

  return (
    <div className="min-h-screen w-full bg-gray-50 py-4 sm:py-6 lg:py-8">
      <div className="w-full container mx-auto space-y-4 px-3 sm:px-4 lg:px-6">
        <div className="rounded-xl border border-pink-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-pink-700">Member management / Edit profile</p>
              <h1 className="mt-1 break-words text-xl font-bold text-slate-900 sm:text-2xl">{data?.name || (isLoading?'Loading member…':'Member biodata')}</h1>
              <p className="mt-1 text-xs text-slate-600">Biodata ID: <span className="font-mono">{data?.userId || '—'}</span> · {data?.isPublishFromAdmin ? 'Published' : 'Not published'}</p>
              <p className="mt-2 text-xs leading-5 text-slate-600">বায়োডাটা ও Account security আলাদা রাখা হয়েছে। সেকশন নির্বাচন করলে আর পেজের একদম উপরে যাবে না।</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant={editMode==='biodata'?'default':'outline'}
                onClick={()=>setEditMode('biodata')}
                className={editMode==='biodata'?'bg-pink-600 hover:bg-pink-700':''}>
                <ClipboardList className="mr-1 size-4"/> Biodata sections
              </Button>
              <Button type="button" variant={editMode==='account'?'default':'outline'}
                onClick={openAccount}
                className={editMode==='account'?'bg-slate-800 hover:bg-slate-900':''}>
                <ShieldCheck className="mr-1 size-4"/> Account & security
              </Button>
            </div>
          </div>
        </div>
        {isLoading && <div role="status" className="rounded-lg border bg-white p-8 text-center text-sm text-slate-600">Member profile loading…</div>}
        {!isLoading && !data && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800">Member profile could not be loaded. <Button type="button" variant="outline" onClick={()=>void refetch()}>Retry</Button></div>}
        {editMode==='account' && !!data && <section ref={accountRef} id="admin-account-security" aria-label="Account & security" className="scroll-mt-24 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><ShieldCheck className="size-5 text-pink-600"/> Account & security</h2>
            <p className="mt-1 text-sm text-gray-600">Login phone, login email, password এবং account actions এখানে আলাদাভাবে পরিচালনা করুন। এগুলো Biodata questions থেকে আলাদা।</p>
          </div>
        <Card className="mb-4 border-pink-200">
          <CardHeader><CardTitle className="text-lg text-pink-700">অ্যাকাউন্টের ফোন ও ইমেইল</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={e => {
              e.preventDefault();
              if (!contactEmail.trim() && !contactPhone.trim()) { toast.error("অন্তত একটি ফোন নম্বর বা ইমেইল রাখুন"); return; }
              saveContacts({ id, email: contactEmail.trim() || null, phoneNumber: contactPhone.trim() || null });
            }}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="admin-contact-phone">মোবাইল নম্বর</Label><Input id="admin-contact-phone" type="tel" autoComplete="off" value={contactPhone} disabled={isLoading || isSavingContacts} onChange={e => setContactPhone(e.target.value)} placeholder="+8801712345678" /></div>
                <div className="space-y-2"><Label htmlFor="admin-contact-email">ইমেইল</Label><Input id="admin-contact-email" type="email" autoComplete="off" value={contactEmail} disabled={isLoading || isSavingContacts} onChange={e => setContactEmail(e.target.value)} placeholder="name@example.com" /></div>
              </div>
              <p className="text-xs text-gray-500">পরিবর্তিত ফোন/ইমেইল পুনরায় যাচাই করতে হবে। ব্যবহারকারীর পুরোনো সেশন ও OTP বাতিল হবে। অসম্পূর্ণ বায়োডাটার ক্ষেত্রেও এখান থেকে সংরক্ষণ করা যাবে।</p>
              <Button type="submit" disabled={isLoading || !data || isSavingContacts} className="bg-pink-600 hover:bg-pink-700">{isSavingContacts ? "সংরক্ষণ হচ্ছে..." : "ফোন ও ইমেইল সংরক্ষণ করুন"}</Button>
            </form>
          </CardContent>
        </Card>
        <AdminPasswordCard id={id} memberName={data?.name} disabled={isLoading || !data} />
        {/* Action Buttons - Hide/Unhide and Delete */}
        <div className="flex flex-wrap gap-3 mb-4 sm:mb-6">
          <Button
            onClick={handleOpenShareDialog}
            disabled={isLoading || !data}
            variant="outline"
            className="flex items-center gap-2 border-green-500 text-green-600 hover:bg-green-50"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp শেয়ার
          </Button>

          <Button
            onClick={() => setShowHideAlert(true)}
            disabled={isTogglingVisibility || isLoading}
            variant="outline"
            className={`flex items-center gap-2 ${
              data?.isPublishFromAdmin
                ? "border-orange-500 text-orange-600 hover:bg-orange-50"
                : "border-green-500 text-green-600 hover:bg-green-50"
            }`}
          >
            {data?.isPublishFromAdmin ? (
              <>
                <EyeOff className="w-4 h-4" />
                লুকান
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                প্রকাশ করুন
              </>
            )}
          </Button>

          <Button
            onClick={() => setShowDeleteAlert(true)}
            disabled={isDeleting}
            variant="outline"
            className="flex items-center gap-2 border-red-500 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            মুছে ফেলুন
          </Button>
        </div>
        </section>}

        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>WhatsApp গ্রুপে CV পাঠান</DialogTitle>
              <DialogDescription>
                মেয়েদের বা ছেলেদের গ্রুপ বেছে নিন। CV text একই থাকবে।
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {BIODATA_WHATSAPP_GROUPS.map((group) => (
                  <Card key={group.id} className="border-dashed">
                    <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-foreground">
                          {group.label}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {group.description}
                        </p>
                      </div>

                      <Button
                        type="button"
                        onClick={() => handleWhatsAppGroupShare(group)}
                        disabled={isLoading || !data}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <Send className="h-4 w-4" />
                        এই গ্রুপে পাঠান
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                গ্রুপ লিংক খোলার সময় CV টেক্সট কপি করার চেষ্টা করা হবে, যেন admin সহজে paste করে পাঠাতে পারেন।
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {editMode==='biodata' && !!data && <>
          <AdminBiodataSectionOverview sections={sectionProgress} selected={currentStep}
            loading={isLoading} onSelect={openSection}/>
          <section ref={formRef} id="biodata-editor-panel" aria-label="Selected biodata section"
            className="scroll-mt-24 space-y-4">


        {/* Form Content */}
        <Card className="w-full shadow-none py-0 border-0 sm:border border-gray-50">
          <CardHeader className="bg-gradient-to-r from-pink-50 to-pink-100 px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="text-xl sm:text-2xl text-pink-800">
              {steps[currentStep]}
            </CardTitle>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              ধাপ {stepPosition + 1} / {activeSteps.length}
            </p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 py-4 sm:py-6">
            {renderStep()}
          </CardContent>
        </Card>

        <div className="sticky bottom-3 z-20 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:p-4">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-900">{activeProgress?.title || steps[currentStep]}</p>
            <p className={biodataDirty?'text-[12px] font-medium text-amber-700':'text-[12px] text-emerald-700'}>
              {biodataDirty?'Unsaved changes · সংরক্ষণ করতে Save চাপুন':'সব পরিবর্তন সংরক্ষিত'}
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Button type="button" onClick={handlePrevious} disabled={stepPosition===0}
              variant="outline" className="min-h-10 flex-1 sm:flex-none">
              <ChevronLeft className="mr-1 size-4"/> Previous
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isLoading||isPending||!biodataDirty}
              className="min-h-10 flex-1 bg-pink-600 font-semibold text-white hover:bg-pink-700 sm:flex-none">
              {isPending?<RefreshCw className="mr-1 size-4 animate-spin"/>:<Save className="mr-1 size-4"/>}
              {isPending?'Saving...':'Save biodata'}
            </Button>
            <Button type="button" onClick={handleNext} disabled={stepPosition>=activeSteps.length-1}
              variant="outline" className="min-h-10 flex-1 sm:flex-none">
              Next <ChevronRight className="ml-1 size-4"/>
            </Button>
          </div>
        </div>
          </section>
        </>}
      </div>

      {/* Hide/Unhide Confirmation Dialog */}
      <AlertDialog open={showHideAlert} onOpenChange={setShowHideAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {data?.isPublished
                ? "প্রোফাইল লুকাতে চান?"
                : "প্রোফাইল প্রকাশ করতে চান?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {data?.isPublished
                ? "এই প্রোফাইলটি লুকানো হলে অন্য ব্যবহারকারীরা এটি দেখতে পারবেন না।"
                : "এই প্রোফাইলটি প্রকাশিত হলে অন্য ব্যবহারকারীরা এটি দেখতে পারবেন।"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleVisibility}
              className={
                data?.isPublished
                  ? "bg-orange-600 hover:bg-orange-700"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              নিশ্চিত করুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ব্যবহারকারী মুছে ফেলতে চান?</AlertDialogTitle>
            <AlertDialogDescription>
              এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না। এটি স্থায়ীভাবে এই
              ব্যবহারকারীর অ্যাকাউন্ট এবং সমস্ত ডেটা মুছে ফেলবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              মুছে ফেলুন
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
