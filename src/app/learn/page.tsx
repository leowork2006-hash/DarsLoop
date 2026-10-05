import { WorkspaceApp } from "@/components/workspace";
import { cloudMode } from "@/lib/supabase/config";
import { accountUser } from "@/lib/supabase/server";
import { accountDestination } from "@/lib/account-input";
import { redirect } from "next/navigation";
export const dynamic="force-dynamic";
export default async function Learn({searchParams}:{searchParams:Promise<{invite?:string;example?:string}>}){
 const {invite,example}=await searchParams;
 if(example==="1"&&!invite)redirect("/example");
 if(cloudMode()&&!await accountUser()){const next=accountDestination(invite);redirect(next.includes("?")?`/signin?invite=${invite}`:"/signin");}
 return <WorkspaceApp/>;
}
