"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Group, Mesh, BufferGeometry, Material } from "three";

/** Decorative only. The quiz remains ordinary, accessible HTML if WebGL fails. */
export function StudyWorld({celebrate=false,paused=false,composition="practice"}:{celebrate?:boolean;paused?:boolean;composition?:"practice"|"welcome"}) {
  const host=useRef<HTMLDivElement>(null), celebration=useRef(celebrate), pause=useRef(paused);
  const [ready,setReady]=useState(false);
  useEffect(()=>{celebration.current=celebrate;},[celebrate]);
  useEffect(()=>{pause.current=paused;},[paused]);
  useEffect(()=>{
    const element=host.current;if(!element)return;
    let disposed=false,cleanup=()=>{};
    const motion=matchMedia("(prefers-reduced-motion: reduce)");
    if(motion.matches)return;
    import("three").then(T=>{
      if(disposed)return;
      const canvas=document.createElement("canvas");
      const context=canvas.getContext("webgl2",{alpha:true,antialias:true});
      if(!context)return;
      const renderer=new T.WebGLRenderer({canvas,context,alpha:true,antialias:true});
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
      renderer.setClearColor(0x000000,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
      const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.1,60);
      camera.position.set(0,4.5,12);camera.lookAt(0,0,0);
      scene.add(new T.HemisphereLight(0xffffff,0x738bc2,1.8));
      const sun=new T.DirectionalLight(0xffe7c9,3.2);sun.position.set(3,8,6);scene.add(sun);
      const world=new T.Group();scene.add(world);
      const materials:number[]=[0x527bff,0xf7d1a9,0xc9b9fa,0xfffaf1,0x293450];
      const mat=(color:number)=>new T.MeshStandardMaterial({color,roughness:.42,metalness:.03});
      const objects:Group[]=[];
      for(let i=0;i<3;i++){
        const group=new T.Group();
        const cover=new T.Mesh(new T.BoxGeometry(1.8,.14,1.3),mat(materials[i]));
        const pages=new T.Mesh(new T.BoxGeometry(1.68,.22,1.19),mat(0xfffaf1));pages.position.y=.17;
        const top=cover.clone();top.position.y=.35;
        const spine=new T.Mesh(new T.BoxGeometry(.13,.4,1.3),mat(materials[i]));spine.position.x=-.84;spine.position.y=.15;
        group.add(cover,pages,top,spine);group.position.set(i===2?3.7:-3.9,i===0?-.4:i===1?-.02:.1,i===2?-.5:i*.1);
        if(composition==="welcome")group.position.set(i===2?1.05:-.7,-.5+i*.33,-.15+i*.2);
        group.rotation.set(.18,i===2?-.5:.35+i*.14,i===2?-.12:.09);objects.push(group);world.add(group);
      }
      const ring=new T.Mesh(new T.TorusGeometry(.5,.15,12,48),mat(0xf4ba87));ring.position.set(4,-.8,1);ring.rotation.set(.2,.4,0);world.add(ring);
      const ball=new T.Mesh(new T.SphereGeometry(.32,24,16),mat(0xb9c9ff));ball.position.set(-4.8,1.3,-.5);world.add(ball);
      if(composition==="welcome"){ring.position.set(1.9,-.5,.2);ball.position.set(-1.9,1,-.5);}
      const stars:Mesh[]=[];
      for(let i=0;i<12;i++){
        const star=new T.Mesh(new T.OctahedronGeometry(.045+(i%3)*.012),mat(i%2?0xf2bf86:0x89a7fb));
        star.position.set((i%2?1:-1)*((composition==="welcome"?1.7:3.1)+(i%4)*.55),-.6+(i%5)*.5,-1);stars.push(star);world.add(star);
      }
      element.appendChild(canvas);canvas.dataset.renderer="webgl2";
      let visible=true,lost=false,pointerX=0,elapsed=0,last=0;
      const draw=()=>renderer.render(scene,camera);
      const resize=()=>{if(disposed||lost)return;const rect=element.getBoundingClientRect();renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/Math.max(rect.height,1);camera.updateProjectionMatrix();draw();};
      const observer=new ResizeObserver(resize);observer.observe(element);
      const tick=(time:number)=>{
        if(disposed||lost||!visible||document.hidden)return;
        const dt=Math.min((time-last)/1000,.04);last=time;
        if(!pause.current){elapsed+=dt;objects.forEach((o,i)=>{o.position.y=(i===0?-.4:i===1?-.02:.1)+Math.sin(elapsed*.7+i)*.09;o.rotation.y+=(pointerX*.06-o.rotation.y+(i===2?-.5:.35+i*.14))*.025;});ball.position.y=1.3+Math.sin(elapsed*.65)*.13;ring.rotation.z=elapsed*.12;stars.forEach((s,i)=>{s.rotation.y=elapsed*.3;s.scale.setScalar(celebration.current?1.6+Math.sin(elapsed*3+i)*.4:1);});}
        draw();
      };
      const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;renderer.setAnimationLoop(visible&&!motion.matches?tick:null);},{threshold:.05});intersection.observe(element);
      const pointer=(event:PointerEvent)=>{if(event.pointerType!=="mouse")return;pointerX=(event.clientX/innerWidth-.5)*2;};
      const changed=()=>{renderer.setAnimationLoop(motion.matches||lost||!visible?null:tick);setReady(!motion.matches&&!lost);if(!lost)draw();};
      const contextLost=(event:Event)=>{event.preventDefault();lost=true;renderer.setAnimationLoop(null);setReady(false);};
      canvas.addEventListener("webglcontextlost",contextLost);window.addEventListener("pointermove",pointer,{passive:true});motion.addEventListener("change",changed);
      resize();setReady(true);renderer.setAnimationLoop(tick);
      cleanup=()=>{renderer.setAnimationLoop(null);intersection.disconnect();observer.disconnect();window.removeEventListener("pointermove",pointer);motion.removeEventListener("change",changed);canvas.removeEventListener("webglcontextlost",contextLost);const geometries=new Set<BufferGeometry>(),mats=new Set<Material>();scene.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));}});geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();canvas.remove();};
    }).catch(()=>{if(!disposed)setReady(false);});
    return()=>{disposed=true;cleanup();};
  },[composition]);
  return <div className={`study-world ${ready?"world-ready":""}`} aria-hidden="true"><div ref={host} className="world-canvas"/><Image className="world-fallback" src="/art/study-objects-v4.webp" alt="" width={460} height={460} unoptimized/><div className="world-horizon"/></div>;
}
