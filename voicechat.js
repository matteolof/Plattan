/* Plattan v214: optional WebRTC voice chat, HTTPS required on tablets. */
(()=>{
'use strict';
const css=document.createElement('style');css.textContent=`
#brVoice{position:fixed;right:18px;bottom:282px;z-index:75;display:none;width:90px;font:12px system-ui;color:white}
#brVoiceToggle{display:block;width:100%;min-height:34px;border:1px solid #ffffff66;border-radius:10px;padding:7px 8px;background:#263f36;color:white;font:700 12px system-ui;touch-action:manipulation;box-shadow:0 4px 12px #0006}
#brVoiceToggle.connected{background:#b52e35;border-color:#ffb0b0;color:white}#brVoiceControls{display:none;position:absolute;right:0;bottom:calc(100% + 8px);width:min(210px,calc(100vw - 36px));background:#13221bf2;padding:8px;border-radius:10px;box-shadow:0 4px 18px #0009;box-sizing:border-box;gap:5px}
#brVoiceControls.open{display:grid}
#brVoiceControls button{min-height:34px;border:1px solid #ffffff55;border-radius:9px;padding:6px 7px;background:#274735;color:white;font:700 11px system-ui;touch-action:manipulation}
#brVoiceControls button:disabled{opacity:.55}
#brVoiceControls button[hidden]{display:none!important}
#brVoiceMute{background:#67433a!important}#brVoiceSpeaker{background:#36556b!important}
#brVoiceState{font:11px system-ui;padding:5px;border-radius:7px;background:#111b;overflow-wrap:anywhere}
`;document.head.appendChild(css);
const panel=document.createElement('div');panel.id='brVoice';panel.innerHTML='<button id="brVoiceToggle" type="button" aria-expanded="false">🎤 Röstchatt</button><div id="brVoiceControls"><button id="brVoiceStart" type="button">🎤 Starta röstchatt</button><button id="brVoiceMute" type="button" hidden>🔇 Stäng av mick</button><button id="brVoiceSpeaker" type="button" disabled>🔇 Ljud av – slå på ljud</button><div id="brVoiceState" role="status">Röstchatt avstängd</div></div>';document.body.appendChild(panel);
const toggle=panel.querySelector('#brVoiceToggle'),controls=panel.querySelector('#brVoiceControls');
function closeControls(){controls.classList.remove('open');toggle.setAttribute('aria-expanded','false')}
toggle.onclick=()=>{const open=controls.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open))};
document.addEventListener('pointerdown',e=>{if(!panel.contains(e.target))closeControls()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeControls()});
const start=panel.querySelector('#brVoiceStart'),mute=panel.querySelector('#brVoiceMute'),status=panel.querySelector('#brVoiceState'),speaker=panel.querySelector('#brVoiceSpeaker');
let myId=null,roster=[],stream=null,enabled=false,muted=false,busy=false,epoch=0,soundEnabled=false;
const peers=new Map();
const processingOn=true;
const rtcConfig={iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]};
// Ask the browser for its built-in acoustic echo cancellation and voice processing.
// Only request optional constraints supported by this browser (especially important on iOS).
function microphoneConstraints(){
 const supported=navigator.mediaDevices.getSupportedConstraints?.()||{};
 const audio={echoCancellation:processingOn};
 if(supported.noiseSuppression)audio.noiseSuppression=processingOn;
 if(supported.autoGainControl)audio.autoGainControl=processingOn;
 if(supported.channelCount)audio.channelCount={ideal:1};
 return {audio,video:false};
}
function logMicProcessing(){
 const track=stream?.getAudioTracks()[0];
 if(!track)return;
 const settings=track.getSettings?.()||{};
 console.info('Plattan voice processing', {echoCancellation:settings.echoCancellation,noiseSuppression:settings.noiseSuppression,autoGainControl:settings.autoGainControl,channelCount:settings.channelCount});
}

function setStatus(msg){status.textContent=msg}
function send(to,data){return fetch('/api/voice/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:myId,to,data})}).then(r=>{if(!r.ok)throw Error('Signalering misslyckades')})}
async function unlockAudio(){
 const attempts=[];for(const p of peers.values()){p.audio.muted=false;p.audio.volume=1;if(p.audio.srcObject)attempts.push(p.audio.play().then(()=>{p.playback='spelar';return true}).catch(e=>{p.playback='blockerad: '+e.name;console.warn('Voice playback blocked',e);return false}))}
 const results=await Promise.all(attempts);return !results.includes(false)
}
function refreshSpeaker(){speaker.textContent=soundEnabled?'🔊 Ljud på – stäng av':'🔇 Ljud av – slå på ljud';for(const p of peers.values())p.audio.muted=!soundEnabled}
function closePeer(id){const p=peers.get(id);if(!p)return;peers.delete(id);try{p.pc.close()}catch{}p.audio.remove()}
function stop(){toggle.classList.remove('connected');closeControls();epoch++;enabled=false;muted=false;soundEnabled=false;speaker.disabled=true;refreshSpeaker();for(const id of [...peers.keys()]){send(id,{type:'bye'}).catch(()=>{});closePeer(id)}if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}start.textContent='🎤 Starta röstchatt';mute.hidden=true;start.disabled=false;setStatus('Röstchatt avstängd')}
function peer(id){if(peers.has(id))return peers.get(id);const pc=new RTCPeerConnection(rtcConfig),audio=document.createElement('audio');audio.autoplay=true;audio.playsInline=true;audio.muted=!soundEnabled;audio.style.display='none';document.body.appendChild(audio);const p={pc,audio,pending:[],remoteReady:false,playback:'väntar på ljudspår'};peers.set(id,p);
 stream.getTracks().forEach(track=>pc.addTrack(track,stream));
 pc.ontrack=e=>{audio.srcObject=e.streams[0]||new MediaStream([e.track]);p.playback=soundEnabled?'försöker spela':'högtalare av';if(soundEnabled)audio.play().then(()=>{p.playback='spelar';}).catch(err=>{p.playback='blockerad: '+err.name;setStatus('Tryck på 🔇 Ljud av för att aktivera högtalaren.')});};
 pc.onicecandidate=e=>{if(e.candidate)send(id,{type:'candidate',candidate:e.candidate.toJSON()}).catch(()=>{})};
 pc.onconnectionstatechange=()=>{if(!enabled)return;const count=[...peers.values()].filter(x=>x.pc.connectionState==='connected').length;setStatus(`Röstchatt på · ${count} anslutna${muted?' · mick av':''}`)};
 return p}
async function offer(id){const p=peer(id);if(p.pc.signalingState!=='stable')return;try{const desc=await p.pc.createOffer();await p.pc.setLocalDescription(desc);await send(id,{type:'offer',sdp:p.pc.localDescription.sdp})}catch(e){console.warn('Voice offer',e)}}
async function flush(p){while(p.pending.length&&p.pc.remoteDescription){const c=p.pending.shift();try{await p.pc.addIceCandidate(c)}catch(e){console.warn('Voice candidate',e)}}}
async function receive(from,data){if(!enabled||!stream||!roster.some(p=>p.id===from))return;
 if(data.type==='bye'){closePeer(from);return}
 const p=peer(from),pc=p.pc;
 try{
 if(data.type==='candidate'){if(data.candidate){p.pending.push(data.candidate);await flush(p)}return}
 if(data.type==='offer'){
 // Lower ID is the offerer. Reject unexpected simultaneous offers.
 if(myId<from)return;
 if(pc.signalingState!=='stable'){await pc.setLocalDescription({type:'rollback'})}
 await pc.setRemoteDescription({type:'offer',sdp:data.sdp});await flush(p);await pc.setLocalDescription(await pc.createAnswer());await send(from,{type:'answer',sdp:pc.localDescription.sdp});
 }else if(data.type==='answer'&&pc.signalingState==='have-local-offer'){await pc.setRemoteDescription({type:'answer',sdp:data.sdp});await flush(p)}
 }catch(e){console.warn('Voice signaling',e);setStatus('Ljudanslutning misslyckades – prova att starta om röstchatten')}
}
async function pollLoop(myEpoch){while(enabled&&epoch===myEpoch&&myId){try{const r=await fetch('/api/voice/poll',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:myId})});if(r.ok){const j=await r.json();for(const m of j.messages||[])await receive(m.from,m.data)}}catch(e){console.warn('Voice poll',e)}await new Promise(resolve=>setTimeout(resolve,350))}}
async function reconcile(){if(!enabled||!stream)return;const active=new Set(roster.filter(p=>p.id!==myId).map(p=>p.id));for(const id of peers.keys())if(!active.has(id))closePeer(id);for(const id of active)if(myId<id&&!peers.has(id))await offer(id)}
start.onclick=async()=>{closeControls();if(enabled){stop();return}if(busy||!myId)return;busy=true;start.disabled=true;try{
 if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Error('Mikrofon kräver HTTPS och en webbläsare som stöder ljud.');
 stream=await navigator.mediaDevices.getUserMedia(microphoneConstraints());
 logMicProcessing();
 enabled=true;toggle.classList.add('connected');closeControls();muted=false;soundEnabled=false;speaker.disabled=false;refreshSpeaker();start.textContent='⏹ Lämna röstchatt';mute.hidden=false;mute.textContent='🔇 Stäng av mick';setStatus('Röstchatt på · ansluter…');const current=++epoch;pollLoop(current);await reconcile();
 }catch(e){toggle.classList.remove('connected');if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;setStatus(e.name==='NotAllowedError'?'Mikrofonen nekades. Tillåt den i webbläsaren.':e.message||'Kunde inte starta mikrofonen.');start.textContent='🎤 Starta röstchatt'}finally{busy=false;start.disabled=false}};
 speaker.onclick=async()=>{if(!enabled)return;closeControls();if(soundEnabled){soundEnabled=false;refreshSpeaker();setStatus('Inkommande ljud avstängt');return}soundEnabled=true;refreshSpeaker();const ok=await unlockAudio();setStatus(ok?'Högtalare aktiverad – väntar på ljud från andra':'Ljudet kunde inte starta. Tryck på 🔊 igen eller kontrollera volymen.');};
 mute.onclick=()=>{if(!stream)return;closeControls();muted=!muted;stream.getAudioTracks().forEach(t=>t.enabled=!muted);mute.textContent=muted?'🎤 Slå på mick':'🔇 Stäng av mick';setStatus(muted?'Mikrofon avstängd (du hör andra)':'Mikrofon på')};
 window.addEventListener('br:joined',e=>{myId=e.detail.id;panel.style.display='block'});
 window.addEventListener('br:roster',e=>{roster=e.detail.players||[];reconcile().catch(console.warn)});
 window.addEventListener('br:left',()=>{stop();myId=null;roster=[];panel.style.display='none';controls.classList.remove('open');toggle.setAttribute('aria-expanded','false')});
 window.addEventListener('pagehide',stop);
})();
