// Verify connections supplied after a secret-free build with a disposable account.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { adminClient } from "../src/lib/supabase/admin";

const configuredOrigin=process.env.TEST_ORIGIN;
if(!configuredOrigin||process.env.DARSLOOP_BACKEND!=="supabase")throw new Error("Set TEST_ORIGIN and private cloud connections explicitly.");
const origin=new URL(configuredOrigin).origin;
const admin=adminClient(),jar=new Map<string,string>(),checks:string[]=[];
let userId="";
function pass(label:string){checks.push(label);process.stdout.write(`PASS ${label}\n`);}
async function request(route:string,body?:unknown){
 const r=await fetch(origin+route,{method:body?"POST":"GET",headers:{Origin:origin,Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join("; "),...(body?{"Content-Type":"application/json"}:{})},...(body?{body:JSON.stringify(body)}:{})});
 for(const line of r.headers.getSetCookie()){const pair=line.split(";")[0],at=pair.indexOf("=");jar.set(pair.slice(0,at),pair.slice(at+1));}
 return r;
}
try{
 assert.equal((await request("/api/workspace")).status,401);pass("private workspace requires sign-in after a secret-free build");
 const email=`darsloop-runtime-${randomBytes(8).toString("hex")}@example.invalid`,password=randomBytes(32).toString("hex");
 const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(error,null);userId=data.user!.id;
 assert.equal((await request("/api/account",{action:"signin",email,password})).status,200);pass("runtime-only Supabase connection signs in a disposable confirmed account");
 const workspace=await request("/api/workspace");assert.equal(workspace.status,200);const content=await workspace.json();assert.equal(content.userId,userId);assert.equal(content.lessons.length,0);pass("authenticated runtime reads only the new account's empty private workspace");
 assert.equal((await request("/api/account",{action:"signout"})).status,200);
 assert.equal((await request("/api/workspace")).status,401);pass("sign-out removes access to the private workspace");
}finally{
 if(userId){const result=await admin.auth.admin.deleteUser(userId);assert.equal(result.error,null);const lookup=await admin.auth.admin.getUserById(userId);assert.equal(lookup.data.user,null);pass("disposable cloud account is removed and absence confirmed");}
}
await mkdir("verification",{recursive:true});
await writeFile("verification/runtime-auth-v16.json",JSON.stringify({checkedAt:new Date().toISOString(),origin,checks,scope:"Actual auth/database HTTP checks against a secret-free production build receiving cloud connections at runtime. No upload, model call, social consent or hosted Linux execution claimed."},null,2));
