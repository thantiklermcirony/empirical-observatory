import * as THREE from './vendor/three.module.js';
export class ExperimentSpace{
 constructor(canvas,onResponse,onFrame,onEvent){
  this.onResponse=onResponse;this.onFrame=onFrame;this.onEvent=onEvent;this.video=null;this.videoMesh=null;this.poseLast=0;this.lastText='';this.available=false;
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.xr.enabled=true;
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.setClearColor(0x0b1821);
  this.scene=new THREE.Scene();this.scene.fog=new THREE.FogExp2(0x0b1821,.022);
  this.camera=new THREE.PerspectiveCamera(48,1,.1,100);this.camera.position.set(0,1.7,3.4);this.camera.lookAt(0,1.4,-2);
  this.scene.add(new THREE.HemisphereLight(0xd7f4df,0x203747,2));const light=new THREE.PointLight(0xb6e9c9,15);light.position.set(1,4,1);this.scene.add(light);
  this.habitat=new THREE.Group();this.scene.add(this.habitat);
  const grid=new THREE.GridHelper(36,36,0x45605e,0x243b42);grid.position.y=-.1;grid.material.transparent=true;grid.material.opacity=.3;this.habitat.add(grid);
  this.rings=[];for(let i=0;i<4;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(1.1+i*.38,.007,8,100),new THREE.MeshBasicMaterial({color:0x6b9c8b,transparent:true,opacity:.3-i*.035}));ring.position.set(0,1.4,-2.5);this.habitat.add(ring);this.rings.push(ring)}
  this.target=new THREE.Mesh(new THREE.IcosahedronGeometry(.38,2),new THREE.MeshStandardMaterial({color:0xb6e9c9,roughness:.6,metalness:.25,emissive:0x254b3b,emissiveIntensity:.25}));this.target.position.set(0,1.4,-2);this.habitat.add(this.target);
  const particles=new Float32Array(240);for(let i=0;i<particles.length;i+=3){particles[i]=Math.sin(i*11.7)*14;particles[i+1]=1+Math.abs(Math.cos(i*7.3))*8;particles[i+2]=-3-Math.abs(Math.sin(i*3.1))*17}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(particles,3));this.habitat.add(new THREE.Points(geometry,new THREE.PointsMaterial({color:0x91b5a7,size:.018,transparent:true,opacity:.5})));
  const labelCanvas=document.createElement('canvas');labelCanvas.width=1024;labelCanvas.height=160;this.labelCanvas=labelCanvas;
  this.labelTexture=new THREE.CanvasTexture(labelCanvas);this.label=new THREE.Mesh(new THREE.PlaneGeometry(3.3,.52),new THREE.MeshBasicMaterial({map:this.labelTexture,transparent:true,depthWrite:false}));this.label.position.set(0,2.4,-3);this.scene.add(this.label);
  for(let i=0;i<2;i++){const controller=this.renderer.xr.getController(i);controller.addEventListener('select',()=>this.onResponse());controller.addEventListener('squeezestart',()=>{this.clearVideo();this.onEvent('xr_exit_requested',{});this.renderer.xr.getSession()?.end()});this.scene.add(controller)}
  this.renderer.xr.addEventListener('sessionend',()=>this.onEvent('xr_end',{}));
  new ResizeObserver(()=>this.resize()).observe(canvas.parentElement);this.resize();
  this.renderer.setAnimationLoop((time,frame)=>{
   this.onFrame?.(time,'before');
   if(!this.video){this.target.rotation.y=time*.00008;this.target.rotation.x=.2;this.target.position.y=1.4+Math.sin(time*.0005)*.04}
   this.renderer.render(this.scene,this.camera);this.onFrame?.(time,'after');
   if(frame&&time-this.poseLast>250){this.poseLast=time;const pose=frame.getViewerPose(this.renderer.xr.getReferenceSpace());if(pose)this.onEvent('xr_pose',{position:[pose.transform.position.x,pose.transform.position.y,pose.transform.position.z],orientation:[pose.transform.orientation.x,pose.transform.orientation.y,pose.transform.orientation.z,pose.transform.orientation.w]})}
  });
 }
 resize(){const rect=this.renderer.domElement.parentElement.getBoundingClientRect();if(!rect.width||!rect.height)return;this.renderer.setSize(rect.width,rect.height,false);this.camera.aspect=rect.width/rect.height;this.camera.updateProjectionMatrix()}
 setTrial(trial,phase,remote=false){
  this.target.material.color.set(trial?(trial.color==='teal'?0x8bd9b8:0xe6b478):0xb6e9c9);
  this.target.scale.setScalar(trial?1:.8);
  const text=trial?`RESPOND TO ${trial.rule.toUpperCase()}${remote?' · LINKED':''}`:phase==='recovery'?'RETURN · EYES OPEN':phase==='baseline'?'BASELINE · EYES OPEN':'IDA · A QUIET SPACE TO BEGIN';
  if(text!==this.lastText){this.lastText=text;const ctx=this.labelCanvas.getContext('2d');ctx.clearRect(0,0,1024,160);ctx.fillStyle='#dceee5';ctx.font='32px sans-serif';ctx.textAlign='center';ctx.fillText(text,512,70);ctx.fillStyle='#98b6ab';ctx.font='20px sans-serif';ctx.fillText('Trigger to respond · squeeze to leave VR',512,115);this.labelTexture.needsUpdate=true}
 }
 async supportsVR(){this.available=!!navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr').catch(()=>false);return this.available}
 async enterVR(){
  if(!navigator.xr)throw Error('WebXR is unavailable. Use HTTPS and a compatible headset browser.');
  if(this.renderer.xr.isPresenting){await this.renderer.xr.getSession().end();return}
  const session=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor']});
  this.renderer.xr.setReferenceSpaceType('local-floor');await this.renderer.xr.setSession(session);this.onEvent('xr_start',{});
 }
 async playVideo(url,mode){
  this.clearVideo();const video=document.createElement('video');video.crossOrigin='anonymous';video.playsInline=true;video.preload='auto';video.src=url;
  this.video=video;const texture=new THREE.VideoTexture(video);texture.colorSpace=THREE.SRGBColorSpace;
  if(video.requestVideoFrameCallback){const report=(now,m)=>{if(this.video!==video)return;this.onEvent('video_frame',{media_time:m.mediaTime,callback_ms:now,expected_display_ms:m.expectedDisplayTime,presented_frames:m.presentedFrames,timing:'browser video callback; not measured photons'});video.requestVideoFrameCallback(report)};video.requestVideoFrameCallback(report)}
  else video.addEventListener('timeupdate',()=>this.onEvent('video_frame',{media_time:video.currentTime,callback_ms:performance.now(),timing:'coarse timeupdate fallback; unsuitable for ERP'}));
  const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.FrontSide});
  this.videoMesh=new THREE.Mesh(mode==='360'?new THREE.SphereGeometry(40,64,32):new THREE.PlaneGeometry(4.8,2.7),material);
  this.videoMesh.position.set(0,1.6,mode==='360'?0:-3);if(mode==='360')this.videoMesh.geometry.scale(-1,1,1);
  this.scene.add(this.videoMesh);this.habitat.visible=false;this.label.visible=false;
  for(const name of ['playing','pause','seeking','seeked','waiting','ended','error'])video.addEventListener(name,()=>this.onEvent('video_'+name,{current_time:video.currentTime,projection:mode,error:video.error?.message}));
  try{await video.play()}catch(error){this.clearVideo();throw error}
 }
 clearVideo(){if(this.video){this.video.pause();this.video.removeAttribute('src');this.video.load();this.video=null}if(this.videoMesh){this.scene.remove(this.videoMesh);this.videoMesh.material.map.dispose();this.videoMesh.material.dispose();this.videoMesh.geometry.dispose();this.videoMesh=null}if(this.habitat)this.habitat.visible=true;if(this.label)this.label.visible=true}
}
