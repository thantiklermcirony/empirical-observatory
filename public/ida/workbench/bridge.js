// Manual signaling allows Pages hosting without a signaling backend. LAN only by design.
export class Bridge{
 constructor(onMessage,onState){this.onMessage=onMessage;this.onState=onState;this.pc=null;this.channel=null;this.role=null;this.timer=null}
 create(role){
  this.close();this.role=role;this.pc=new RTCPeerConnection({iceServers:[]});
  this.pc.onconnectionstatechange=()=>this.onState(this.pc?.connectionState||'closed',this.role);
  this.pc.ondatachannel=event=>this.bind(event.channel);return this.pc;
 }
 bind(channel){
  this.channel=channel;channel.onopen=()=>{this.onState('connected',this.role);this.timer=setInterval(()=>this.send({type:'ping',sent:performance.now()}),3000)};
  channel.onmessage=event=>{try{const msg=JSON.parse(event.data);if(msg.type==='ping')this.send({type:'pong',sent:msg.sent,remote:performance.now()});else this.onMessage(msg)}catch{}};
  channel.onclose=()=>{clearInterval(this.timer);this.onState('disconnected',this.role)};
 }
 async gathered(){
  if(this.pc.iceGatheringState==='complete')return;
  await new Promise(resolve=>{const timeout=setTimeout(resolve,6000);const pc=this.pc;const fn=()=>{if(pc.iceGatheringState==='complete'){clearTimeout(timeout);pc.removeEventListener('icegatheringstatechange',fn);resolve()}};pc.addEventListener('icegatheringstatechange',fn)});
 }
 async offer(){const pc=this.create('capture');this.bind(pc.createDataChannel('ida-experiment',{ordered:true}));await pc.setLocalDescription(await pc.createOffer());await this.gathered();return JSON.stringify(pc.localDescription)}
 async answer(text){const description=JSON.parse(text);if(description.type!=='offer')throw Error('Paste an offer');const pc=this.create('viewer');await pc.setRemoteDescription(description);await pc.setLocalDescription(await pc.createAnswer());await this.gathered();return JSON.stringify(pc.localDescription)}
 async accept(text){if(!this.pc||this.role!=='capture')throw Error('Create an offer first');const description=JSON.parse(text);if(description.type!=='answer')throw Error('Paste an answer');await this.pc.setRemoteDescription(description)}
 send(message){if(this.channel?.readyState==='open'&&this.channel.bufferedAmount<100000)this.channel.send(JSON.stringify(message))}
 close(){clearInterval(this.timer);if(this.channel){this.channel.onclose=null;this.channel.close()}if(this.pc){this.pc.onconnectionstatechange=null;this.pc.close()}this.channel=null;this.pc=null;this.role=null}
 get connected(){return this.channel?.readyState==='open'}
}
