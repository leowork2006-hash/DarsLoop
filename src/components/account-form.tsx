"use client";
import { useState } from "react";
import { ArrowRight, Eye, EyeSlash } from "@phosphor-icons/react";
import type { SocialProvider } from "@/lib/account-input";
import { api, message } from "./client-api";
export function AccountForm({providers=[],initialError=""}:{providers?:SocialProvider[];initialError?:string}){
 const [mode,setMode]=useState<"signin"|"signup">("signin"),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(initialError),[notice,setNotice]=useState("");
 async function social(provider:SocialProvider){setBusy(true);setError("");setNotice("");try{const invite=new URLSearchParams(window.location.search).get("invite");const r=await api<{url:string}>("/api/account/oauth",{method:"POST",body:JSON.stringify({provider,invite})});window.location.assign(r.url);}catch(e){setError(message(e));setBusy(false);}}
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");setNotice("");try{
  const invite=new URLSearchParams(window.location.search).get("invite");
  const r=await api<{next?:string;message?:string}>("/api/account",{method:"POST",body:JSON.stringify({action:mode,email:email.trim(),password,invite})});
  setPassword("");if(r.next)window.location.assign(r.next);else{setNotice(r.message||"Check your email.");setMode("signin");}
 }catch(e){setError(message(e));}finally{setBusy(false);}}
 return <div className="account-reference-form" data-mode={mode}>
 {providers.length>0&&<><div className="social-signin" aria-label="Sign in options">
  {providers.includes("google")&&<button type="button" className="social-button google-signin" aria-label="Sign in with Google" disabled={busy} onClick={()=>social("google")}><img src="/auth/google-signin.png" alt="" width="189" height="40"/></button>}
  {providers.includes("apple")&&<button type="button" className="social-button apple-signin" disabled={busy} onClick={()=>social("apple")}><img src="/auth/apple.svg" alt="" width="20" height="20"/>Sign in with Apple</button>}
 </div><p className="account-divider"><span>or use your email</span></p></>}
 <div className="account-switch" aria-label="Email account options"><button type="button" disabled={busy} className={mode==="signin"?"active":""} aria-pressed={mode==="signin"} onClick={()=>{setMode("signin");setError("");setNotice("");}}>Sign in</button><button type="button" disabled={busy} className={mode==="signup"?"active":""} aria-pressed={mode==="signup"} onClick={()=>{setMode("signup");setError("");setNotice("");}}>Create account</button></div>
 <form className="account-form" onSubmit={submit} aria-busy={busy}>
  <label className="field">Email<input type="email" autoComplete="email" inputMode="email" required maxLength={254} value={email} placeholder="Enter your email" onChange={e=>setEmail(e.target.value)} disabled={busy}/></label>
  <div className="field"><label htmlFor="account-password">Password</label><div className="password-field"><input id="account-password" aria-describedby="password-hint" type={show?"text":"password"} autoComplete={mode==="signup"?"new-password":"current-password"} required minLength={mode==="signup"?12:1} maxLength={128} value={password} placeholder={mode==="signup"?"Choose a password":"Enter your password"} onChange={e=>setPassword(e.target.value)} disabled={busy}/><button type="button" className="icon-button" disabled={busy} aria-label={show?"Hide password":"Show password"} onClick={()=>setShow(v=>!v)}>{show?<EyeSlash size={19}/>:<Eye size={19}/>}</button></div><small id="password-hint">{mode==="signup"?"Use at least 12 characters.":"Use your DarsLoop password."}</small></div>
  {error&&<p className="form-error" role="alert">{error}</p>}{notice&&<p className="account-notice" role="status">{notice}</p>}
  <button className="button primary full" disabled={busy}>{busy?"Please wait…":mode==="signup"?"Create account":"Sign in"}<ArrowRight size={17}/></button>
 </form>{mode==="signup"&&<p className="account-confirmation-hint">After signup, open your email confirmation link in this browser.</p>}</div>;
}
