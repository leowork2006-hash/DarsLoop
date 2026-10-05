import Link from "next/link";
import { ArrowRight, LockKey } from "@phosphor-icons/react/ssr";
import { AccountForm } from "@/components/account-form";
import { cloudMode } from "@/lib/supabase/config";
import { accountUser } from "@/lib/supabase/server";
import { enabledProviders } from "@/lib/supabase/providers";
import { accountDestination, accountFeedback } from "@/lib/account-input";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
export const dynamic="force-dynamic";
export default async function SignIn({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const query=await searchParams;
 if(cloudMode()){
  if(await accountUser())redirect(accountDestination(query.invite));
  const providers=await enabledProviders();
  return <div className="signin-shell reference-signin"><SignInStory/><main className="signin-page"><Link className="brand-link" href="/"><Brand/></Link><section><h1>Your study space.</h1><p>Sign in to save your lessons and practice.</p><AccountForm providers={providers} initialError={accountFeedback(query)}/><Link href="/#product" className="text-link">See how it works <ArrowRight size={15}/></Link></section></main></div>;
 }
 return <main className="signin-page reference-signin-local"><Link className="brand-link" href="/"><Brand/></Link><section><div className="signin-icon"><LockKey size={25}/></div><h1>Continue on this device.</h1><p>Your lessons are linked to this browser. Account sign-in is not active in this local mode.</p><Link href="/learn" className="button primary">Open my workspace <ArrowRight size={18}/></Link><p className="muted small-text">Clearing browser cookies removes access to this local session.</p><Link href="/" className="text-link">Back to DarsLoop</Link></section></main>;
}
function SignInStory(){return <aside className="signin-story"><span className="signin-reference-companion" aria-hidden="true"><img src="/art/hoopoe-guide-v10.png" width="88" height="88" alt=""/></span><h2>Keep the lesson close.</h2><p>Record your class. Get notes and practise<br/>what you learned.</p><div className="signin-reference-art" aria-hidden="true"><img src="/art/audio-upload-v11.png" width="300" height="260" alt=""/></div><span className="signin-story-caption">For Islamic classes, Arabic lessons and study circles.</span></aside>;}
