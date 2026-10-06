import { describe, expect, it } from "vitest";
import { accountDestination, accountInput, accountProblem, accountFeedback, oauthInput, trustedOAuthUrl } from "../src/lib/account-input";
describe("account request boundaries",()=>{
 it("requires a valid email and bounded passwords without silently trimming credentials",()=>{
  expect(accountInput.safeParse({action:"signup",email:"a@example.invalid",password:"a".repeat(12)}).success).toBe(true);
  expect(accountInput.safeParse({action:"signup",email:"a@example.invalid",password:"short"}).success).toBe(false);
  expect(accountInput.safeParse({action:"signin",email:"not-an-email",password:"abc"}).success).toBe(false);
  expect(accountInput.safeParse({action:"signin",email:"a@example.invalid",password:"a".repeat(129)}).success).toBe(false);
  expect(accountInput.parse({action:"signin",email:"a@example.invalid",password:" secret "})).toMatchObject({password:" secret "});
  expect(accountInput.parse({action:"signin",email:" a@example.invalid ",password:" secret "})).toMatchObject({email:"a@example.invalid",password:" secret "});
 });
 it("allows a bounded invitation, never a user supplied redirect address",()=>{
  const token="a".repeat(48);expect(accountDestination(token)).toBe(`/learn?invite=${token}`);
  for(const s of ["https://evil.invalid","//evil.invalid","/admin","a".repeat(100)])expect(accountDestination(s)).toBe("/learn");
 });
 it("rejects unexpected social providers and redirect instructions",()=>{
  expect(oauthInput.safeParse({provider:"google",invite:"a".repeat(48)}).success).toBe(true);
  expect(oauthInput.safeParse({provider:"apple",invite:null}).success).toBe(true);
  expect(oauthInput.safeParse({provider:"github"}).success).toBe(false);
  expect(oauthInput.safeParse({provider:"google",invite:"//evil.invalid"}).success).toBe(false);
 });
 it("requires the correct Supabase origin, provider and PKCE challenge",()=>{
  const project="https://project.supabase.co",url=project+"/auth/v1/authorize?provider=google&code_challenge=challenge&code_challenge_method=s256";
  expect(trustedOAuthUrl(url,project,"google")).toBe(true);
  for(const wrong of [url.replace("project.supabase.co","evil.invalid"),url.replace("https:","http:"),url.replace("provider=google","provider=apple"),project+"/auth/v1/authorize?provider=google",url.replace("s256","plain")])expect(trustedOAuthUrl(wrong,project,"google")).toBe(false);
 });
 it("distinguishes confirmation, mail quota, credentials and service outages",()=>{
  expect(accountProblem({code:"email_not_confirmed"},"signin")).toMatchObject({status:403});
  expect(accountProblem({code:"over_email_send_rate_limit",status:429},"signup").message).toContain("Confirmation emails");
  expect(accountProblem({code:"invalid_credentials",status:400},"signin").message).toContain("DarsLoop");
  expect(accountProblem({status:503},"signin").status).toBe(503);
  expect(accountProblem({code:"email_address_not_authorized"},"signup").status).toBe(503);
 });
 it("gives specific signup actions only for documented email/input failures",()=>{
  const rejected=accountProblem({code:"email_address_invalid",status:422},"signup");expect(rejected).toMatchObject({status:400});expect(rejected.message).toContain("Check its spelling");expect(rejected.message).not.toMatch(/fake|test domain|nonexistent|already/i);
  expect(accountProblem({code:"validation_failed"},"signup").message).toContain("email address and password");
  expect(accountProblem({code:"weak_password"},"signup").message).toContain("at least 12 characters");
  expect(accountProblem({code:"validation_failed"},"signin")).toEqual(accountProblem({code:"invalid_credentials"},"signin"));
 });
 it("separates account/provider availability from delivery and request quotas",()=>{
  expect(accountProblem({code:"signup_disabled"},"signup")).toMatchObject({status:503,message:expect.stringContaining("already have")});
  expect(accountProblem({code:"email_provider_disabled"},"signup").message).toContain("social sign-in option if one is shown");
  expect(accountProblem({code:"email_address_not_authorized",status:500},"signup").message).toContain("Confirmation email cannot be sent");
  expect(accountProblem({code:"over_email_send_rate_limit"},"signup")).toMatchObject({status:429,message:expect.stringContaining("Confirmation emails")});
  expect(accountProblem({code:"over_request_rate_limit"},"signup")).toMatchObject({status:429,message:expect.stringContaining("Too many attempts")});
 });
 it("identifies network/timeout/service failures without treating them as bad credentials",()=>{
  expect(accountProblem({name:"AuthRetryableFetchError",status:0},"signup")).toMatchObject({status:503,message:expect.stringContaining("could not be reached")});
  for(const error of [{code:"request_timeout"},{status:408},{status:504}])expect(accountProblem(error,"signup")).toMatchObject({status:503,message:expect.stringContaining("took too long")});
  for(const error of [{code:"unexpected_failure"},{status:500},{name:"AuthRetryableFetchError",status:502}]){
   expect(accountProblem(error,"signup")).toMatchObject({status:503,message:expect.stringContaining("Account creation")});
   expect(accountProblem(error,"signin").message).toContain("Sign-in");
  }
 });
 it("keeps existing-account and unknown signup responses identical and never copies raw provider text",()=>{
  const fallback=accountProblem({},"signup");
  for(const code of ["email_exists","user_already_exists","user_not_found","new_unknown_code"]){
   const error={code,status:400,message:"private-address@example.invalid private credential fragment",error_description:"private request token"};
   expect(accountProblem(error,"signup")).toEqual(fallback);
   expect(accountProblem(error,"signup").message).not.toContain("private");
  }
  const unrecognized={status:422,message:"email_address_invalid: private-address@example.invalid"};
  expect(accountProblem(unrecognized,"signup")).toEqual(fallback);
  expect(accountProblem({code:"unknown"},"oauth")).toMatchObject({status:503,message:expect.stringContaining("another option")});
 });
 it("never reflects raw callback errors or external URLs into feedback",()=>{
  expect(accountFeedback({auth_error:"callback"})).toContain("different browser");
  expect(accountFeedback({auth_error:"cancelled"})).toContain("cancelled");
  expect(accountFeedback({auth_error:"<script>bad</script>",error_description:"private details"})).toBe("");
 });
});
