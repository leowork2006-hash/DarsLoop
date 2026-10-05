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
 it("never reflects raw callback errors or external URLs into feedback",()=>{
  expect(accountFeedback({auth_error:"callback"})).toContain("different browser");
  expect(accountFeedback({auth_error:"cancelled"})).toContain("cancelled");
  expect(accountFeedback({auth_error:"<script>bad</script>",error_description:"private details"})).toBe("");
 });
});
