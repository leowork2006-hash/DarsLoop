"use client";
import Link from "next/link";
import { House as RefHouse, FolderSimple as RefFolder, BookOpen as RefBook, Cards as RefCards, UsersThree as RefUsers, ChartBar as RefChart, Microphone as RefMicrophone, Plus as RefPlus, Question as RefQuestion, GearSix as RefGear, ListChecks as RefChecks, ClipboardText as RefTest, CaretDown as RefDown, CaretRight as RefCaret, ChatCircle as RefChat, List as RefMenu, UploadSimple as RefUpload } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, ChevronRight, CircleHelp, Headphones, Layers, LockKeyhole, Menu, Mic, Plus, Settings2, ShieldCheck, Users, X, BarChart3, Home, Upload, ListTodo } from "lucide-react";
import { type ClassGroup, type Lesson, type Review, type Workspace } from "@/lib/types";
import { Brand } from "./brand";
import { StudyHome } from "./study-home";
import { UploadPage } from "./upload-page";
import { StudyPlanPage } from "./study-plan-page";
import { hasSeenPageGuide, rememberPageGuide, type GuidePage } from "@/lib/page-guides";
import { useHelpPreference } from "./study-guide";
import { AddLesson } from "./add-lesson";
import { Modal } from "./modal";
import { Player, type Seek } from "./player";
import { LessonView, type LessonTab } from "./lesson-view";
import { api, message } from "./client-api";
import { GuidedTour } from "./guided-tour";
import { Insights } from "./insights";
import { TeacherDictionary } from "./learning-tools";
import { ThemeControl } from "./theme-control";
import { ReviewPage, type ReviewTab } from "./review-page";
import { LessonsPage } from "./lessons-page";
import { ClassesPage } from "./classes-page";
import { AccountSettings } from "./account-settings";
import { studyInsights } from "@/lib/insights";
import { WelcomeSetup } from "./welcome-setup";
import { saveGuideLanguage, type GuideLanguage } from "@/lib/guide-language";
import { readDeviceOnboarding, saveDeviceOnboarding } from "@/lib/onboarding";
type View="home"|"library"|"review"|"classes"|"insights"|"upload"|"plan"|"dictionary";
function ShareLesson({lesson,groups,onClose,refresh,onError}:{lesson:Lesson;groups:ClassGroup[];onClose:()=>void;refresh:()=>Promise<void>;onError:(s:string)=>void}) {
  const [group,setGroup]=useState(groups[0]?.id||""),[permitted,setPermitted]=useState(false),[busy,setBusy]=useState(false),[name,setName]=useState("");
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);try{let id=group;if(!id){const r=await api<{groups:ClassGroup[]}>("/api/classes",{method:"POST",body:JSON.stringify({action:"create",name})});id=r.groups.find(g=>g.name===name)?.id||"";if(!id)throw new Error("Create the class before sharing.");}await api("/api/classes",{method:"POST",body:JSON.stringify({action:"share",groupId:id,lessonId:lesson.id,permitted:true})});await refresh();onClose();}catch(e){onError(message(e));}finally{setBusy(false);}}
  return <Modal title="Share with your class" onClose={onClose} className="reference-small-modal reference-share-modal"><form onSubmit={submit}><p className="muted">Classmates receive the lesson’s audio, notes, transcript and practice. Your personal review responses remain private.</p><div className="share-lesson-preview"><Headphones size={22}/><div><strong>{lesson.title}</strong><span>{lesson.course}</span></div></div>{groups.length?<label className="field">Private class<select value={group} onChange={e=>setGroup(e.target.value)}>{groups.map(g=><option value={g.id} key={g.id}>{g.name}</option>)}</select></label>:<label className="field">Create a private class<input required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. My study circle"/></label>}<label className="check-row"><input type="checkbox" checked={permitted} onChange={e=>setPermitted(e.target.checked)}/><span>I have permission to share this recording and its study material with these classmates.</span></label><button className="button primary full" disabled={busy||!permitted||lesson.status!=="ready"||(!group&&name.trim().length<2)}>{busy?"Sharing…":<><Users size={17}/> Share lesson</>}</button><p className="small-text muted">You can stop sharing in Classes. Only the current transcript version is shared.</p></form></Modal>;
}
export function WorkspaceApp(){
  const [workspace,setWorkspace]=useState<Workspace|null>(null),[view,setView]=useState<View>("home"),[selected,setSelected]=useState<string|null>(null),[tab,setTab]=useState<LessonTab>("notes"),[practiceTarget,setPracticeTarget]=useState<string|null>(null),[course,setCourse]=useState<string|null>(null),[add,setAdd]=useState(false),[setup,setSetup]=useState(false),[share,setShare]=useState(false),[remove,setRemove]=useState(false),[mobileMenu,setMobileMenu]=useState(false),[toast,setToast]=useState(""),[fatal,setFatal]=useState(""),[invite,setInvite]=useState<string|null>(null),[inviteBusy,setInviteBusy]=useState(false),[seek,setSeek]=useState<Seek|null>(null),[deleting,setDeleting]=useState(false);
  const [guide,setGuide]=useState(false),[guidePage,setGuidePage]=useState<GuidePage|undefined>(undefined),[welcomed,setWelcomed]=useState(false),[chatLessonId,setChatLessonId]=useState<string|null>(null);
  const [reviewTab,setReviewTab]=useState<ReviewTab>("due");
  const [profileMenu,setProfileMenu]=useState(false);
  const [reviewAudioId,setReviewAudioId]=useState<string|null>(null);
  const seenPages=useRef(new Set<string>());
  const [onboarding,setOnboarding]=useState(false),[guideLanguage,setGuideLanguage]=useState<GuideLanguage>("en"),[addMode,setAddMode]=useState<"record"|"upload">("upload");
  const welcome=useHelpPreference(`workspace-welcome:${workspace?.userId||"loading"}`);
  const introduced=useRef<string|null>(null);
  useEffect(()=>{
    if(!workspace||introduced.current===workspace.userId)return;
    introduced.current=workspace.userId;
    const device=readDeviceOnboarding(workspace.userId),preference=device.pendingSync?device:workspace.onboarding?.completed?workspace.onboarding:device;
    setGuideLanguage(preference.language);
    const returning=preference.completed||workspace.lessons.length>0||workspace.reviews.length>0||workspace.groups.length>0;
    if(returning){welcome.dismiss();setWelcomed(true);return;}
    // Invitation acceptance takes priority; never stack two dialogs on first entry.
    if(!new URLSearchParams(window.location.search).has("invite"))setOnboarding(true);
  },[workspace]);
  const notify=useCallback((s:string)=>setToast(s),[]);
  function finishWelcome(language:GuideLanguage){
    setGuideLanguage(language);saveGuideLanguage(language);setOnboarding(false);setWelcomed(true);welcome.dismiss();
    if(!workspace)return;
    const preference={completed:true,language},userId=workspace.userId;
    // Skip means enter the product; Explore first explicitly starts the longer tour.
    seenPages.current.add(`${userId}:home`);rememberPageGuide(userId,"home");
    saveDeviceOnboarding(userId,{...preference,pendingSync:workspace.accountMode==="supabase"});
    setWorkspace(current=>current?.userId===userId?{...current,onboarding:preference}:current);
    if(workspace.accountMode!=="supabase")return;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
    void api("/api/account/onboarding",{method:"POST",body:JSON.stringify(preference),signal:controller.signal})
      .then(()=>{const device=readDeviceOnboarding(userId);if(device.language===language)saveDeviceOnboarding(userId,preference);})
      .catch(()=>notify("Your welcome choice is saved on this device. Account sync did not finish; you can update it later in Guide language."))
      .finally(()=>clearTimeout(timer));
  }
  const refresh=useCallback(async()=>{const data=await api<Workspace>("/api/workspace");setWorkspace(data);setFatal("");},[]);
  useEffect(()=>{let active=true;api<Workspace>("/api/workspace").then(data=>{if(!active)return;setWorkspace(data);const params=new URLSearchParams(window.location.search);if(params.has("invite"))setInvite(params.get("invite"));else if(params.get("view")==="upload")setView("upload");else if(params.get("view")==="plan")setView("plan");else if(params.get("view")==="insights")setView("insights");else if(params.get("view")==="review")setView("review");else if(params.get("view")==="library")setView("library");else if(params.get("view")==="classes")setView("classes");else if(params.get("view")==="dictionary")setView("dictionary");}).catch(e=>{if(active)setFatal(message(e));});return()=>{active=false;};},[]);
  useEffect(()=>{if(!workspace)return;const poll=setInterval(()=>void refresh().catch(()=>{}),workspace.lessons.some(l=>l.status==="queued"||l.status==="processing")?4000:15_000);const handler=()=>void refresh().catch(e=>notify(message(e)));window.addEventListener("darsloop-refresh",handler);return()=>{clearInterval(poll);window.removeEventListener("darsloop-refresh",handler);};},[workspace?.lessons.some(l=>l.status==="queued"||l.status==="processing"),!!workspace,refresh,notify]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(""),7000);return()=>clearTimeout(timer);},[toast]);
  const lesson=workspace?.lessons.find(l=>l.id===selected)||null;
  const playerLesson=lesson||(!selected&&view==="home"?workspace?.lessons.find(l=>l.id===chatLessonId)||null:!selected&&view==="review"?workspace?.lessons.find(l=>l.id===reviewAudioId)||null:null);
  const guideKey:GuidePage=lesson?`lesson-${tab}`:view;
  function closeGuide(){setGuide(false);welcome.dismiss();if(workspace){const page=guidePage||guideKey;seenPages.current.add(`${workspace.userId}:${page}`);rememberPageGuide(workspace.userId,page);}}
  function addLesson(mode:"record"|"upload"){if(mode==="upload"){navigate("upload");return;}setAddMode(mode);setAdd(true);setMobileMenu(false);}
  useEffect(()=>{
    if(!workspace||!welcomed||onboarding||add||setup||share||remove||mobileMenu||invite||guide)return;
    if(lesson&&!lesson.segments.length)return;
    const pageId=`${workspace.userId}:${guideKey}`;
    if(seenPages.current.has(pageId)||hasSeenPageGuide(workspace.userId,guideKey))return;
    const timer=setTimeout(()=>{if(document.querySelector("dialog[open]"))return;setGuidePage(guideKey);setGuide(true);},400);
    return()=>clearTimeout(timer);
  },[workspace?.userId,welcomed,guideKey,onboarding,add,setup,share,remove,mobileMenu,invite,guide,!!lesson?.segments.length]);
  const courses=[...new Set(workspace?.lessons.map(l=>l.course)||[])];
  const due=workspace?studyInsights(workspace.lessons,workspace.reviews).due:0;
  function navigate(v:View,c:string|null=null){setProfileMenu(false);setView(v);setSelected(null);setChatLessonId(null);setReviewAudioId(null);setSeek(null);setGuide(false);setCourse(c);setMobileMenu(false);}
  function open(l:Lesson,t:LessonTab="notes",target:string|null=null){setSelected(l.id);setChatLessonId(null);setReviewAudioId(null);setGuide(false);setTab(t);setPracticeTarget(target);setSeek(null);setMobileMenu(false);window.scrollTo(0,0);}
  const onPlay=useCallback((time:number)=>{if(selected)setSeek({lessonId:selected,time,nonce:Date.now()});},[selected]);
  function reviewed(r:Review){setWorkspace(w=>w?{...w,reviews:[...w.reviews.filter(old=>!(old.itemId===r.itemId&&old.lessonId===r.lessonId)),r]}:w);}
  async function deleteCurrent(){if(!lesson)return;setDeleting(true);try{await api(`/api/lessons/${lesson.id}`,{method:"DELETE"});setSelected(null);setRemove(false);await refresh();notify("Lesson and its saved study material deleted.");}catch(e){notify(message(e));}finally{setDeleting(false);}}
  const isReferenceHome=view==="home"&&!selected;
  const isReferenceUpload=view==="upload"&&!selected;
  const isReferenceInsights=view==="insights"&&!selected;
  const isReferenceReview=view==="review"&&!selected;
  const isReferenceLibrary=view==="library"&&!selected;
  const isReferenceClasses=view==="classes"&&!selected;
  const isReferencePlan=view==="plan"&&!selected;
  const isReferenceLesson=!!selected;
  const isReferenceShell=true;
  const legacySidebar=<><Link className="sidebar-brand" href="/"><Brand/></Link><p className="sidebar-caption">Your study space</p><div className="sidebar-capture"><button className="button primary add-button" data-tour="add" onClick={()=>addLesson("record")}><Mic size={17}/> Record a lesson</button><button className={`sidebar-upload ${view==="upload"&&!selected?"active":""}`} onClick={()=>addLesson("upload")}><Upload size={16}/> Upload</button></div><p className="nav-label">WORKSPACE</p><nav className="workspace-nav" aria-label="Student workspace"><button className={view==="home"&&!selected?"active":""} onClick={()=>navigate("home")}><Home size={18}/> Home</button><button className={view==="library"&&!course?"active":""} onClick={()=>navigate("library")}><BookOpen size={18}/> My lessons<span>{workspace?.lessons.length||0}</span></button><button data-tour="plan" className={view==="plan"?"active":""} onClick={()=>navigate("plan")}><ListTodo size={18}/> Study plan</button><button data-tour="review" className={view==="review"?"active":""} onClick={()=>navigate("review")}><Layers size={18}/> Review<span>{due>0?due:""}</span></button><button data-tour="insights" className={view==="insights"?"active":""} onClick={()=>navigate("insights")}><BarChart3 size={18}/> Insights</button><button data-tour="classes" className={view==="classes"?"active":""} onClick={()=>navigate("classes")}><Users size={18}/> Private classes</button></nav>{courses.length>0&&<><p className="nav-label course-nav-label">YOUR COURSES</p><nav className="course-nav" aria-label="Your courses">{courses.map(c=><button className={course===c?"active":""} key={c} onClick={()=>navigate("library",c)}><BookOpen size={15}/><span>{c}</span></button>)}</nav></>}<div className="sidebar-bottom"><button className="settings-button" onClick={()=>{setGuidePage(guideKey);setGuide(true);setMobileMenu(false);}}><CircleHelp size={17}/> Page guide<ChevronRight size={14}/></button><button className="settings-button" onClick={()=>{setSetup(true);setMobileMenu(false);}}><Settings2 size={17}/> Account & privacy<ChevronRight size={14}/></button><div className="workspace-profile"><div className="profile-avatar">S</div><div><strong>Student workspace</strong><small>{workspace?.accountMode==="supabase"?"Your private account":"Private to this browser"}</small></div><LockKeyhole size={14}/></div></div></>;
  const referenceSidebar=<>
    <Link className="sidebar-brand reference-wordmark" href="/"><Brand/></Link>
    <nav className="workspace-nav reference-primary-nav" aria-label="Student workspace">
      <button className={isReferenceHome?"active":""} aria-current={isReferenceHome?"page":undefined} onClick={()=>navigate("home")}><RefHouse size={19} weight="regular"/> Home</button>
      <button className={isReferenceLibrary&&!course?"active":""} aria-current={isReferenceLibrary&&!course?"page":undefined} onClick={()=>navigate("library")}><RefFolder size={19} weight="regular"/> My lessons</button>
    </nav>
    <div className="reference-sidebar-divider"/>
    {courses.length>0&&<nav className="course-nav reference-course-nav" aria-label="Your courses">{courses.map(c=><button key={c} className={isReferenceLibrary&&course===c?"active":""} aria-current={isReferenceLibrary&&course===c?"page":undefined} onClick={()=>navigate("library",c)}><span className="reference-course-icon"><RefBook size={18}/></span><span>{c}</span><RefCaret className="reference-course-arrow" size={14}/></button>)}</nav>}
    <nav className="workspace-nav reference-study-nav" aria-label="Study tools">
      <button data-tour="plan" className={isReferencePlan?"active":""} aria-current={isReferencePlan?"page":undefined} onClick={()=>navigate("plan")}><RefBook size={19}/> Study plan</button>
      <button data-tour="review" className={isReferenceReview?"active":""} aria-current={isReferenceReview?"page":undefined} onClick={()=>{navigate("review");setReviewTab("due");}}><RefCards size={19}/> Review{due>0&&<span>{due}</span>}</button>
      <div className="reference-practice-links">{([{id:"quiz",label:"Quiz",Icon:RefChecks},{id:"cards",label:"Flashcards",Icon:RefCards},{id:"test",label:"Lesson test",Icon:RefTest}] as const).map(({id,label,Icon})=><button key={id} className={isReferenceReview&&reviewTab===id?"active":""} onClick={()=>{navigate("review");setReviewTab(id);}}><Icon size={16}/>{label}</button>)}</div>
      <button className={view==="dictionary"&&!selected?"active":""} onClick={()=>navigate("dictionary")}><RefBook size={19}/>Teacher’s terms</button>
      <button data-tour="classes" className={isReferenceClasses?"active":""} aria-current={isReferenceClasses?"page":undefined} onClick={()=>navigate("classes")}><RefUsers size={19}/> Private classes</button>
      <button data-tour="insights" className={isReferenceInsights?"active":""} aria-current={isReferenceInsights?"page":undefined} onClick={()=>navigate("insights")}><RefChart size={19}/> Insights</button>
      <button data-tour="add" onClick={()=>addLesson("record")}><RefMicrophone size={19}/> Record a lesson</button>
    </nav>
    <button className={`reference-upload-button ${isReferenceUpload?"active":""}`} aria-current={isReferenceUpload?"page":undefined} onClick={()=>addLesson("upload")}><RefPlus size={18}/> Upload</button>
    <div className="sidebar-bottom reference-sidebar-bottom">
      <button className="reference-guide-button" onClick={()=>{setGuidePage(guideKey);setGuide(true);setMobileMenu(false);}}><RefQuestion size={18}/> Page guide</button>
      <button className="settings-button" onClick={()=>{setSetup(true);setMobileMenu(false);}}><RefGear size={18}/> Account & privacy</button>
    </div>
  </>;
  const sidebar=isReferenceShell?referenceSidebar:legacySidebar;
  return <div className={`workspace-shell ${playerLesson?"has-player":""} ${isReferenceShell?"is-reference-shell":""} ${isReferenceHome?"is-reference-home":""} ${isReferenceUpload?"is-reference-upload":""} ${isReferenceInsights?"is-reference-insights":""} ${isReferenceReview?"is-reference-review":""} ${isReferenceLibrary?"is-reference-library":""} ${isReferenceClasses?"is-reference-classes":""} ${isReferencePlan?"is-reference-plan":""} ${isReferenceLesson?"is-reference-lesson":""}`}>
<a className="skip-link" href="#workspace-main">Skip to study space</a><aside className="sidebar">{sidebar}</aside><div className="workspace-area"><header className="workspace-header"><button className="icon-button mobile-menu-button" aria-label="Open workspace menu" onClick={()=>setMobileMenu(true)}>{isReferenceShell?<RefMenu size={22}/>:<Menu size={21}/>}</button>{isReferenceShell?<>
    <div className="breadcrumb reference-breadcrumb"><span>{isReferenceHome?"Home":isReferenceLibrary||isReferenceClasses?"Workspace":"My lessons"}</span><RefCaret size={14}/>{isReferenceLesson?<RefBook size={16}/>:isReferencePlan?<RefBook size={16}/>:isReferenceHome?<RefChat size={16}/>:isReferenceUpload?<RefUpload size={16}/>:isReferenceInsights?<RefChart size={16}/>:isReferenceClasses?<RefUsers size={16}/>:isReferenceLibrary?<RefFolder size={16}/>:<RefCards size={16}/>}<span className="breadcrumb-current">{isReferenceLesson?lesson?.title:isReferencePlan?"Study plan":isReferenceHome?"Chat":isReferenceUpload?"Upload audio":isReferenceInsights?"Insights":isReferenceClasses?"Private classes":isReferenceLibrary?"My lessons":view==="dictionary"?"Teacher’s terms":"Review"}</span></div>
    <div className="workspace-header-right reference-header-actions">
      <button className="reference-header-guide" onClick={()=>{setGuidePage(guideKey);setGuide(true);}}><RefQuestion size={17}/> Guide</button>
      <button className="icon-button" aria-label="Account and privacy" onClick={()=>setSetup(true)}><RefGear size={20}/></button>
      <div className="reference-profile-wrap"><button className="reference-profile-button" aria-label="Open your account menu" aria-expanded={profileMenu} onClick={()=>setProfileMenu(!profileMenu)}>S</button>{profileMenu&&<><button className="profile-menu-dismiss" aria-label="Close account menu" onClick={()=>setProfileMenu(false)}/><div className="reference-profile-menu" onKeyDown={e=>{if(e.key==="Escape")setProfileMenu(false);}}><button onClick={()=>{setProfileMenu(false);setSetup(true);}}><RefGear size={18}/>Account & settings</button><button onClick={()=>{setProfileMenu(false);setGuidePage(guideKey);setGuide(true);}}><RefQuestion size={18}/>Page guide</button><div><span>Theme</span><ThemeControl/></div></div></>}</div>
    </div>
  </>:<><div className="breadcrumb"><BookOpen size={16}/><span>{view==="home"?"Home":view==="upload"?"Upload lesson":view==="plan"?"Study plan":view==="review"?"Review":view==="classes"?"Classes":view==="insights"?"Insights":"My lessons"}</span>{lesson&&<><ChevronRight size={13}/><span className="breadcrumb-current">{lesson.title}</span></>}</div><div className="workspace-header-right"><span className="private-label"><LockKeyhole size={13}/> Private workspace</span><button className="icon-button help-button" aria-label="Open study guide" onClick={()=>{setGuidePage(guideKey);setGuide(true);}}><CircleHelp size={19}/></button><button className="icon-button" aria-label="Account and privacy" onClick={()=>setSetup(true)}><Settings2 size={17}/></button></div></>}</header>
  <main className="workspace-main" id="workspace-main" tabIndex={-1}>{fatal?<div className="empty-state"><ShieldCheck/><h1>Couldn’t open your workspace.</h1><p>{fatal}</p><button className="button primary" onClick={()=>void refresh().catch(e=>setFatal(message(e)))}>Try again</button></div>:!workspace?<div className="loading-workspace"><div className="loading-line"/><div className="loading-line short"/><div className="loading-block"/><p>Opening your study space…</p></div>:lesson?<LessonView key={`${lesson.id}-${lesson.version}`} lesson={lesson} tab={tab} setTab={setTab} onBack={()=>navigate("library",lesson.course)} onPlay={onPlay} onError={notify} onShare={()=>setShare(true)} onDelete={()=>setRemove(true)} onReviewed={reviewed} focusItemId={practiceTarget} configured={workspace.configured.generation}/>:view==="home"?<StudyHome workspace={workspace} onAdd={addLesson} onOpen={open} onPlay={(l,time)=>{setChatLessonId(l.id);setSeek({lessonId:l.id,time,nonce:Date.now()});}} onChatLesson={id=>{setChatLessonId(id);setSeek(null);}} onError={notify} onReview={()=>navigate("review")} onPlan={l=>navigate("plan",l?.course||null)} onClasses={()=>navigate("classes")}/>:view==="upload"?<UploadPage workspace={workspace} onRecord={()=>addLesson("record")} onSaved={l=>{setWorkspace(w=>w?{...w,lessons:[l,...w.lessons.filter(old=>old.id!==l.id)]}:w);void refresh().catch(e=>notify(message(e)));}} onOpen={open} onPlan={l=>navigate("plan",l.course)} onError={notify}/>:view==="plan"?<StudyPlanPage workspace={workspace} initialCourse={course} onUpload={()=>addLesson("upload")} onOpenLesson={l=>open(l,"notes")} onOpenSource={(l,time)=>{open(l,"transcript");setSeek({lessonId:l.id,time,nonce:Date.now()});}} onOpenPractice={(l,id)=>open(l,"practice",id)} onAsk={l=>open(l,"ask")}/>:view==="insights"?<Insights lessons={workspace.lessons} reviews={workspace.reviews} onReview={(l,id)=>open(l,"practice",id)} onPractice={()=>navigate("review")}/>:view==="classes"?<ClassesPage workspace={workspace} refresh={refresh} onOpen={open} onError={notify} onUpload={()=>navigate("upload")}/>:view==="dictionary"?<TeacherDictionary lessons={workspace.lessons} onOpen={l=>open(l,"notes")} onPlay={(l,time)=>{open(l,"transcript");setSeek({lessonId:l.id,time,nonce:Date.now()});}}/>:view==="review"?<ReviewPage initialTab={reviewTab} onTabChange={setReviewTab} lessons={workspace.lessons} reviews={workspace.reviews} onOpen={(l,id)=>open(l,"practice",id)} onReviewed={reviewed} onError={notify} onUpload={()=>navigate("upload")} onPlay={(l,time)=>{setReviewAudioId(l.id);setSeek({lessonId:l.id,time,nonce:Date.now()});}}/>:<LessonsPage workspace={workspace} course={course||""} onCourse={c=>setCourse(c||null)} onOpen={open} onUpload={()=>navigate("upload")} onRecord={()=>addLesson("record")} onClasses={()=>navigate("classes")}/>}</main>
  {playerLesson&&<Player key={playerLesson.id} lesson={playerLesson} seek={seek} onError={notify}/>}<nav className="mobile-bottom-nav" aria-label="Mobile workspace"><button className={view==="home"?"active":""} onClick={()=>navigate("home")}>{isReferenceShell?<RefHouse size={20}/>:<Home size={19}/>}Home</button><button className={view==="library"?"active":""} onClick={()=>navigate("library")}>{isReferenceShell?<RefFolder size={20}/>:<BookOpen size={19}/>}Lessons</button><button data-tour="add" className="mobile-add" onClick={()=>addLesson("record")} aria-label="Record a lesson">{isReferenceShell?<RefMicrophone size={22}/>:<Mic size={22}/>}</button><button data-tour="review" className={view==="review"?"active":""} onClick={()=>navigate("review")}>{isReferenceShell?<RefCards size={20}/>:<Layers size={19}/>}Review</button><button data-tour="plan" className={view==="plan"?"active":""} onClick={()=>navigate("plan")}>{isReferenceShell?<RefBook size={20}/>:<ListTodo size={19}/>}Plan</button></nav></div>
  {onboarding&&<WelcomeSetup initialLanguage={guideLanguage} onClose={finishWelcome} onStart={(language,action)=>{finishWelcome(language);if(action==="tour"){setGuidePage(undefined);setGuide(true);}else{addLesson(action);}}}/>}
  {guide&&<GuidedTour key={guidePage||"workspace"} page={guidePage} language={guideLanguage} onChangeLanguage={()=>{setGuide(false);setOnboarding(true);}} onClose={closeGuide}/>}
  {toast&&<div className="toast" role="alert"><span>{toast}</span><button className="icon-button" aria-label="Dismiss message" onClick={()=>setToast("")}><X size={16}/></button></div>}
  {add&&workspace&&<AddLesson userId={workspace.userId} onUpload={()=>{setAdd(false);addLesson("upload");}} initialMode={addMode} onClose={()=>{setAdd(false);setAddMode("upload");}} onAdded={l=>{setAdd(false);setAddMode("upload");setSelected(l.id);setTab("notes");setWorkspace(w=>w?{...w,lessons:[l,...w.lessons]}:w);void refresh().catch(e=>notify(message(e)));}}/>}
  {mobileMenu&&<Modal title="Your workspace" onClose={()=>setMobileMenu(false)} className="reference-small-modal reference-menu-modal"><div className="mobile-sidebar">{sidebar}</div></Modal>}
  {share&&lesson&&workspace&&<ShareLesson lesson={lesson} groups={workspace.groups} onClose={()=>setShare(false)} refresh={refresh} onError={notify}/>}
  {remove&&lesson&&<Modal title="Delete this lesson?" onClose={()=>setRemove(false)} className="reference-small-modal reference-delete-modal"><p>This removes the lesson, its transcript, notes, practice history and class shares from your workspace. The action cannot be undone.</p><div className="modal-actions"><button className="button secondary" onClick={()=>setRemove(false)} disabled={deleting}>Keep lesson</button><button className="button danger" onClick={()=>void deleteCurrent()} disabled={deleting}>{deleting?"Deleting…":"Delete lesson"}</button></div></Modal>}
  {invite&&<Modal title="Join a private class" onClose={()=>{setInvite(null);window.history.replaceState({},"","/learn");}} className="reference-small-modal reference-invite-modal"><p>The person who created this invitation can share permitted lessons with you. Your review responses remain private.</p><button className="button primary full" disabled={inviteBusy} onClick={async()=>{setInviteBusy(true);try{await api("/api/classes",{method:"POST",body:JSON.stringify({action:"join",token:invite})});await refresh();setInvite(null);setWelcomed(true);setView("classes");setSelected(null);window.history.replaceState({},"","/learn");}catch(e){notify(message(e));}finally{setInviteBusy(false);}}}>{inviteBusy?"Joining…":"Accept invitation"}<ArrowRight size={17}/></button></Modal>}
  {setup&&workspace&&<AccountSettings workspace={workspace} guideLanguage={guideLanguage} onClose={()=>setSetup(false)} onError={notify} onGuideLanguage={()=>{setSetup(false);setOnboarding(true);}}/>}
  </div>;
}
