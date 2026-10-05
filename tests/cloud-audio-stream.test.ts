import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import type {Lesson} from '../src/lib/types';
const storage=vi.hoisted(()=>({info:vi.fn(),createSignedUrl:vi.fn()}));
vi.mock('../src/lib/supabase/admin',()=>({adminClient:()=>({storage:{from:()=>storage}})}));
import {cloudAudioStream} from '../src/lib/supabase/audio-stream';
const lesson={ownerId:'owner',id:'lesson',audioPath:'owner/lesson',mime:'audio/mpeg'} as Lesson;
beforeEach(()=>{storage.info.mockResolvedValue({data:{size:24_000_000},error:null});storage.createSignedUrl.mockResolvedValue({data:{signedUrl:'https://storage.example.invalid/private-token'},error:null});});
afterEach(()=>{vi.unstubAllGlobals();vi.clearAllMocks();});
describe('private replay streams exact ranges without materializing whole recordings',()=>{
 it('streams a 100-byte seek and never exposes its server-side storage URL',async()=>{
  const upstream=new Response(new Uint8Array(100),{status:206,headers:{'Content-Range':'bytes 0-99/24000000'}}),fetcher=vi.fn(async()=>upstream);vi.stubGlobal('fetch',fetcher);
  const r=await cloudAudioStream(new Request('https://app.example.invalid/audio',{headers:{Range:'bytes=0-99'}}),lesson);
  expect(upstream.bodyUsed).toBe(true);expect(r.status).toBe(206);expect(r.headers.get('Content-Length')).toBe('100');expect(r.headers.get('Cache-Control')).toBe('private, no-store');expect(r.headers.get('Location')).toBeNull();expect(fetcher.mock.calls[0]).toHaveLength(2);
  expect((fetcher.mock.calls[0] as unknown as [string,RequestInit])[1]).toMatchObject({headers:{Range:'bytes=0-99'},redirect:'error',cache:'no-store'});expect((await r.arrayBuffer()).byteLength).toBe(100);
 });
 it('rejects invalid ranges before requesting or signing private media',async()=>{
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const r=await cloudAudioStream(new Request('https://app.example.invalid/audio',{headers:{Range:'bytes=24000000-'}}),lesson);
  expect(r.status).toBe(416);expect(r.headers.get('Content-Range')).toBe('bytes */24000000');expect(storage.createSignedUrl).not.toHaveBeenCalled();expect(fetcher).not.toHaveBeenCalled();
 });
 it('refuses an unexpected full-file response or mismatched range rather than buffering it',async()=>{
  const cancel=vi.fn(),body=new ReadableStream({cancel});vi.stubGlobal('fetch',vi.fn(async()=>new Response(body,{status:200})));
  await expect(cloudAudioStream(new Request('https://app.example.invalid/audio',{headers:{Range:'bytes=0-99'}}),lesson)).rejects.toThrow('Audio is unavailable');expect(cancel).toHaveBeenCalled();
 });
 it('does not request arbitrary paths or oversized storage objects',async()=>{
  await expect(cloudAudioStream(new Request('https://app.example.invalid/audio'),{...lesson,audioPath:'other/recording'})).rejects.toThrow('Invalid private audio path');expect(storage.info).not.toHaveBeenCalled();
  storage.info.mockResolvedValue({data:{size:25*1024*1024},error:null});await expect(cloudAudioStream(new Request('https://app.example.invalid/audio'),lesson)).rejects.toThrow('Audio is unavailable');expect(storage.createSignedUrl).not.toHaveBeenCalled();
 });
 it('preserves suffix range semantics and storage cancellation signal',async()=>{
  const fetcher=vi.fn(async()=>new Response(new Uint8Array(2),{status:206,headers:{'Content-Range':'bytes 23999998-23999999/24000000'}}));vi.stubGlobal('fetch',fetcher);
  const r=await cloudAudioStream(new Request('https://app.example.invalid/audio',{headers:{Range:'bytes=-2'}}),lesson);expect(r.headers.get('Content-Length')).toBe('2');expect((fetcher.mock.calls[0] as unknown as [string,RequestInit])[1].signal).toBeInstanceOf(AbortSignal);expect((await r.arrayBuffer()).byteLength).toBe(2);
 });
 it('rejects a truncated small range before sending successful playback headers',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(new Uint8Array(90),{status:206,headers:{'Content-Range':'bytes 0-99/24000000'}})));
  await expect(cloudAudioStream(new Request('https://app.example.invalid/audio',{headers:{Range:'bytes=0-99'}}),lesson)).rejects.toThrow('Audio is unavailable');
 });
 it('starts large playback after one chunk without reading the whole recording',async()=>{
  let pulls=0;const cancel=vi.fn();
  const body=new ReadableStream<Uint8Array>({pull(c){pulls++;c.enqueue(new Uint8Array(64*1024));},cancel},{highWaterMark:0});
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(body,{status:206,headers:{'Content-Range':'bytes 0-131071/24000000'}})));
  const r=await cloudAudioStream(new Request('https://app.example.invalid/audio',{headers:{Range:'bytes=0-131071'}}),lesson);
  expect(pulls).toBe(1);expect((await r.arrayBuffer()).byteLength).toBe(128*1024);expect(pulls).toBe(2);expect(cancel).toHaveBeenCalled();
 });
});
