import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { prepareImportedAudio, mediaMime, inspectAudio } from "../src/lib/media";
import { readImportForm } from "../src/lib/import-form";
const run=promisify(execFile);
describe("streamed media imports",()=>{
  it("distinguishes raw AAC and FLAC from MP3",()=>{
    expect(mediaMime(Buffer.from([0xff,0xf1,0x50,0x80]))).toBe("audio/aac");
    expect(mediaMime(Buffer.from([0xff,0xfb,0x90,0x64]))).toBe("audio/mpeg");
    expect(mediaMime(Buffer.from("fLaC"))).toBe("audio/flac");
  });
  it("streams one file to disk, retains settings and rejects duplicate/oversized imports",async()=>{
    const directory=await mkdtemp(path.join(tmpdir(),"darsloop-multipart-"));
    const request=(form:FormData)=>new Request("http://localhost/api/lessons",{method:"POST",body:form});
    try{
      const form=new FormData();form.set("audio",new Blob(["recording"]),"../../untrusted.mp4");form.set("title","A lesson");
      const result=await readImportForm(request(form),path.join(directory,"safe"),100);
      expect(result.get("title")).toBe("A lesson");expect((await readFile(path.join(directory,"safe"))).toString()).toBe("recording");
      form.append("title","Another title");await expect(readImportForm(request(form),path.join(directory,"duplicate"),100)).rejects.toMatchObject({status:400});
      form.delete("title");form.set("audio",new Blob([new Uint8Array(101)]),"big.wav");await expect(readImportForm(request(form),path.join(directory,"big"),100)).rejects.toMatchObject({status:413});
      form.set("audio",new Blob([]),"empty.wav");await expect(readImportForm(request(form),path.join(directory,"empty"),100)).rejects.toMatchObject({status:400});
      form.set("audio",new Blob(["audio"]),"one.wav");form.append("audio",new Blob(["audio"]),"two.wav");await expect(readImportForm(request(form),path.join(directory,"two"),100)).rejects.toMatchObject({status:400});
      const broken=new Request("http://localhost/api/lessons",{method:"POST",headers:{"content-type":"multipart/form-data; boundary=broken"},body:"--broken\r\nContent-Disposition: form-data; name=\"audio\"; filename=\"test.wav\"\r\n\r\nunfinished"});
      await expect(readImportForm(broken,path.join(directory,"broken"),100)).rejects.toMatchObject({status:400});
    }finally{await rm(directory,{recursive:true,force:true});}
  });
  it("prepares actual AAC, video, FLAC and a WAV over the former 24 MB limit",async()=>{
    const directory=await mkdtemp(path.join(tmpdir(),"darsloop-conversion-"));
    try{
      for(const [name,args] of [
        ["raw.aac",["-c:a","aac","-f","adts"]],
        ["audio.flac",["-c:a","flac"]],
        ["large.wav",["-ar","192000","-ac","2","-c:a","pcm_s16le"]],
      ] as [string,string[]][]){await run("ffmpeg",["-nostdin","-loglevel","error","-i","fixtures/demo.mp3",...args,path.join(directory,name)]);}
      const video=path.join(directory,"video.mp4");
      await run("ffmpeg",["-nostdin","-loglevel","error","-f","lavfi","-i","color=c=white:s=160x100:r=1","-i","fixtures/demo.mp3","-shortest","-c:v","libx264","-c:a","aac",video]);
      expect((await stat(path.join(directory,"large.wav"))).size).toBeGreaterThan(24*1024*1024);
      for(const [name,preparation] of [["raw.aac","repackaged"],["audio.flac","compressed"],["large.wav","compressed"],["video.mp4","extracted"]]){
        const output=path.join(directory,name+"-prepared");const result=await prepareImportedAudio(path.join(directory,name),output);
        expect(result.importedMedia?.preparation).toBe(preparation);expect((await stat(output)).size).toBeLessThan(24*1024*1024);
        expect(Math.abs((await inspectAudio(output))-result.duration)).toBeLessThan(0.2);
      }
      const original=path.join(directory,"original");expect((await prepareImportedAudio("fixtures/demo.mp3",original)).importedMedia).toBeUndefined();
      expect(await readFile(original)).toEqual(await readFile("fixtures/demo.mp3"));
      await run("ffmpeg",["-nostdin","-loglevel","error","-f","lavfi","-i","color=c=white:s=160x100:r=1","-t","1","-c:v","libx264",path.join(directory,"silent.mp4")]);
      await expect(prepareImportedAudio(path.join(directory,"silent.mp4"),path.join(directory,"silent-out"))).rejects.toThrow();
    }finally{await rm(directory,{recursive:true,force:true});}
  },60_000);
});
