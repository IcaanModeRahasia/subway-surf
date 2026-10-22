/* ================================================================
   UPGRADE v7 (menimpa fungsi lama di atas)
   ================================================================ */
let starPts=null,planetGrp=null,auroraMats=[],cityB=[],camBaseX=0,glide=0,boardSpin=0,susanoState=0,holdSpawn=false;
const SLIDE_T=.7,CITY_LEN=24*14;

/* ---------- AUDIO: browser menahan suara sampai ada sentuhan -> resume ---------- */
['pointerdown','touchstart','touchend','click','keydown'].forEach(ev=>document.addEventListener(ev,()=>{initAudio();if(audioCtx&&audioCtx.state!=='running')audioCtx.resume()},{passive:true}));
{const _as=activateSkill;activateSkill=function(){initAudio();if(audioCtx&&audioCtx.state!=='running')audioCtx.resume();_as()}}

/* ---------- PLAYLIST (file mp3 di folder yang sama dengan index.html) ---------- */
const PLAYLIST=[
  ['aku-ga-romantis.mp3','Aku Ga Romantis'],['sampai-kau-jadi-milikku.mp3','Sampai Kau Jadi Milikku'],
  ['flatline.mp3','Flatline'],['kebutuhan-hati.mp3','Kebutuhan Hati'],['its-only-me.mp3','Its Only Me'],
  ['danke.mp3','Danke'],['lagu-naruto.mp3','Lagu Naruto'],['best-part.mp3','Best Part'],
  ['se-yang.mp3','Se Yang'],['24-7.mp3','24/7']
];
let trackIdx=0,trackFails=0,musicAudio=null,synthFallback=false;
function updateTrackLabel(){const e=document.getElementById('trackLabel');if(e)e.textContent=synthFallback?'musik bawaan':PLAYLIST[trackIdx][1]}
function playTrack(){
  if(musicMuted||!musicPlaying)return;
  if(!musicAudio){
    musicAudio=new Audio();musicAudio.volume=.55;
    musicAudio.addEventListener('ended',()=>{trackIdx=(trackIdx+1)%PLAYLIST.length;playTrack()});
    musicAudio.addEventListener('playing',()=>{trackFails=0});
    musicAudio.addEventListener('error',()=>{trackFails++;if(trackFails>=PLAYLIST.length){synthFallback=true;updateTrackLabel();if(musicPlaying&&!musicMuted)scheduleLoop();return}trackIdx=(trackIdx+1)%PLAYLIST.length;playTrack()});
  }
  musicAudio.src=PLAYLIST[trackIdx][0];musicAudio.play().catch(()=>{});updateTrackLabel();
}
function startMusic(){if(!audioCtx)initAudio();if(musicPlaying)return;musicPlaying=true;if(musicMuted)return;if(synthFallback){scheduleLoop();return}if(musicAudio&&musicAudio.src&&!musicAudio.ended){musicAudio.play().catch(()=>{});updateTrackLabel()}else playTrack()}
function stopMusic(){musicPlaying=false;if(musicTimer)clearTimeout(musicTimer);if(musicAudio)musicAudio.pause()}
function nextTrack(){if(synthFallback)return;trackIdx=(trackIdx+1)%PLAYLIST.length;trackFails=0;if(!musicMuted){musicPlaying=true;playTrack()}else updateTrackLabel()}
function toggleMusic(){musicMuted=!musicMuted;document.getElementById('musicLabel').textContent=musicMuted?'OFF':'ON';if(musicMuted)stopMusic();else startMusic()}
updateTrackLabel();

/* ---------- FULLSCREEN OTOMATIS ---------- */
function goFull(){const el=document.documentElement,f=el.requestFullscreen||el.webkitRequestFullscreen;if(f&&!document.fullscreenElement&&!document.webkitFullscreenElement){try{const p=f.call(el);if(p&&p.catch)p.catch(()=>{})}catch(e){}}}
{const _sg=startGame;startGame=function(r){goFull();_sg(r)}}
{const _rg=resetGameState;resetGameState=function(){_rg();susanoState=0;holdSpawn=false;glide=0;boardSpin=0;susanooNextAttack=6}}

/* ---------- IKON SVG BERANIMASI ---------- */
const IC={
 coin:'<svg class="ic coinspin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="#ffd34d" stroke="#b9801a" stroke-width="1.6"/><circle cx="12" cy="12" r="7" fill="none" stroke="#e29a1c" stroke-width="1.4"/><path d="M8 8l3-2" stroke="#fff6c8" stroke-width="1.6" stroke-linecap="round"/></svg>',
 dist:'<svg class="ic ic-run" viewBox="0 0 24 24"><path d="M4 18l6-6-6-6M12 18l6-6-6-6" fill="none" stroke="#7ee8ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 pause:'<svg class="ic" viewBox="0 0 24 24"><rect x="5" y="4" width="5" height="16" rx="1.5" fill="#fff"/><rect x="14" y="4" width="5" height="16" rx="1.5" fill="#fff"/></svg>',
 boots:'<svg class="ic ic-float" viewBox="0 0 24 24"><path d="M5 4h8v9l6 3v4H5z" fill="#ff9a1f" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/><path d="M5 17h14" stroke="#fff" stroke-width="1.3"/></svg>',
 wings:'<svg class="ic ic-float" viewBox="0 0 24 24"><path d="M2 14c4-1 6-5 10-9 0 6-2 10-6 12 3 0 6-1 8-3-1 4-5 6-9 6-2 0-3-2-3-6z" fill="#bfeaff" stroke="#fff" stroke-width="1"/></svg>',
 board:'<svg class="ic ic-float" viewBox="0 0 24 24"><rect x="2" y="10" width="20" height="5" rx="2.5" fill="#25f0a0" stroke="#fff" stroke-width="1.2"/><circle cx="7" cy="18" r="1.8" fill="#fff"/><circle cx="17" cy="18" r="1.8" fill="#fff"/></svg>'
};
function skillSVG(c,size){
  const col='#'+c.skillColor.toString(16).padStart(6,'0');
  const S={
    destroy:'<g class="sp"><circle cx="24" cy="24" r="14" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="14 8"/><circle cx="24" cy="24" r="8" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="8 6"/></g>',
    speed_boost:'<path class="pu" d="M27 6L14 26h9l-3 16 14-22h-9z" fill="#fff"/>',
    teleport:'<path class="pu" d="M27 6L14 26h9l-3 16 14-22h-9z" fill="#fff"/>',
    phase:'<g class="sp"><path d="M24 10a14 14 0 1114 14M24 18a6 6 0 106 6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g>',
    coins_x3:'<circle class="pu" cx="24" cy="24" r="12" fill="#ffd34d" stroke="#fff" stroke-width="2"/><text x="24" y="29" text-anchor="middle" font-size="14" font-weight="900" fill="#7a4a00">x3</text>',
    magnet:'<path d="M5 24c6-10 12-13 19-13s13 3 19 13c-6 10-12 13-19 13S11 34 5 24z" fill="#fff"/><circle class="pu" cx="24" cy="24" r="7" fill="'+col+'"/><circle cx="24" cy="24" r="3" fill="#222"/>',
    invincible:'<path class="pu" d="M24 5l16 6v12c0 10-7 17-16 20C15 40 8 33 8 23V11z" fill="#fff" fill-opacity=".92"/>',
    slow:'<path class="fl" d="M30 8a16 16 0 1010 24A13 13 0 0130 8z" fill="#fff"/>',
    destroy_all:'<g class="sp"><circle cx="24" cy="24" r="6" fill="#fff"/><circle cx="24" cy="24" r="12" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="6 5"/><circle cx="24" cy="24" r="18" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="4 7"/></g>'
  }[c.effect]||'';
  return '<svg viewBox="0 0 48 48" width="'+size+'" height="'+size+'" class="sk"><defs><radialGradient id="sg'+c.id+'"><stop offset="0" stop-color="'+col+'" stop-opacity=".95"/><stop offset="1" stop-color="'+col+'" stop-opacity=".35"/></radialGradient></defs><circle cx="24" cy="24" r="22" fill="url(#sg'+c.id+')" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>'+S+'</svg>';
}
function fillIcons(){document.querySelectorAll('[data-ic]').forEach(e=>{e.innerHTML=IC[e.dataset.ic]||''})}
fillIcons();
function updateSkillButton(){if(!userData)return;const c=CHAR_MAP[userData.currentChar]||CHARACTERS[0];document.getElementById('skillIcon').innerHTML=skillSVG(c,44);document.getElementById('skillName').textContent=c.skillName.split(' ')[0]}
function updateStatusBar(){const bar=document.getElementById('statusBar');const it=[];if(bootsActive)it.push(['pill-boots',IC.boots+' BOOTS '+Math.ceil(bootsTimer)+'s']);if(wingsActive)it.push(['pill-wings',IC.wings+' FLY '+Math.ceil(wingsTimer)+'s']);if(hoverboardActive)it.push(['pill-board',IC.board+' BOARD '+Math.ceil(hoverboardTimer)+'s']);if(skillActiveTimer>0){const c=CHAR_MAP[userData.currentChar];it.push(['pill-skill',skillSVG(c,20)+' '+c.skillName.split(' ')[0]])}bar.innerHTML=it.map(i=>'<div class="status-pill '+i[0]+'">'+i[1]+'</div>').join('')}
function renderCharGrid(){
  document.getElementById('shopCoins').innerHTML='';const sc=document.getElementById('shopCoins');sc.textContent=userData.coins||0;
  const grid=document.getElementById('charGrid');grid.innerHTML='';
  CHARACTERS.forEach(char=>{const owned=(userData.unlockedChars||[]).includes(char.id),selected=userData.currentChar===char.id;const card=document.createElement('div');card.className='char-card'+(selected?' selected':'')+(!owned?' locked':'');
    const oH='#'+char.outfit.toString(16).padStart(6,'0'),hH='#'+char.hair.toString(16).padStart(6,'0');
    card.innerHTML='<div class="char-preview" style="background:linear-gradient(135deg,'+oH+','+hH+')">'+skillSVG(char,46)+'</div><div class="char-name">'+char.name+'</div><div class="char-skill">'+char.skillName+'</div><div class="char-price '+(owned?'owned':'')+'">'+(owned?(selected?'✓ DIPAKAI':'DIMILIKI'):IC.coin+' '+char.price)+'</div>';
    card.onclick=()=>selectChar(char);grid.appendChild(card)});
}

/* ---------- KONTROL: geser instan tanpa delay ---------- */
let tX=0,tY=0;
document.addEventListener('touchstart',e=>{if(e.target.closest&&e.target.closest('button'))return;tX=e.touches[0].clientX;tY=e.touches[0].clientY},{passive:true});
document.addEventListener('touchmove',e=>{
  if(!gameRunning||gamePaused)return;if(e.target.closest&&e.target.closest('button'))return;
  const x=e.touches[0].clientX,y=e.touches[0].clientY,dx=x-tX,dy=y-tY,TH=24;
  if(Math.abs(dx)>TH&&Math.abs(dx)>Math.abs(dy)){playerAction(dx>0?'right':'left');tX=x;tY=y}
  else if(Math.abs(dy)>TH&&Math.abs(dy)>Math.abs(dx)){playerAction(dy>0?'slide':'jump');tX=x;tY=y}
},{passive:true});
function playerAction(a){
  if(!gameRunning||gamePaused)return;
  if(a==='left'&&currentLane>0){currentLane--;targetX=LANES[currentLane]}
  else if(a==='right'&&currentLane<2){currentLane++;targetX=LANES[currentLane]}
  else if(a==='jump'){if(wingsActive)return;if(!isJumping){isJumping=true;playerVY=bootsActive?18:JUMP_V;isSliding=false;sfx('jump')}}
  else if(a==='slide'){if(wingsActive)return;isJumping=false;playerVY=0;playerY=getGroundY();if(!isSliding){isSliding=true;slideTimer=SLIDE_T;sfx('slide')}}
}

/* ---------- DUNIA: langit malam, aurora, bintang, planet, kota bergerak ---------- */
function makeWindowTex(){const c=document.createElement('canvas');c.width=64;c.height=128;const x=c.getContext('2d');x.fillStyle='#10131f';x.fillRect(0,0,64,128);for(let r=0;r<16;r++)for(let q=0;q<6;q++){if(Math.random()<.55){x.fillStyle=Math.random()<.2?'#ff9ae0':Math.random()<.5?'#ffe9a0':'#9fd8ff';x.fillRect(q*10+3,r*8+2,6,4)}}const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;return t}
function stripeTex(a,b,n){const c=document.createElement('canvas');c.width=8;c.height=128;const x=c.getContext('2d');for(let i=0;i<n;i++){x.fillStyle=i%2?a:b;x.fillRect(0,i*128/n,8,128/n)}return new THREE.CanvasTexture(c)}
function initThree(){
  if(renderer)return;
  const gs=document.getElementById('gameScreen');
  scene=new THREE.Scene();scene.background=new THREE.Color(0x060a1c);scene.fog=new THREE.Fog(0x0b1238,70,320);
  camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.1,1500);camera.position.set(0,5.5,9);
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,3));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  gs.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0x8fa8ff,0x1a1a33,.85));
  const moon=new THREE.DirectionalLight(0xbcd0ff,1.05);moon.position.set(-20,40,15);moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);
  const sc=moon.shadow.camera;sc.left=-40;sc.right=40;sc.top=40;sc.bottom=-40;sc.far=120;sc.updateProjectionMatrix();moon.shadow.bias=-.0005;scene.add(moon);
  const rim=new THREE.DirectionalLight(0xb05cff,.6);rim.position.set(15,20,-20);scene.add(rim);
  // kubah langit
  const sk=document.createElement('canvas');sk.width=4;sk.height=512;const sx=sk.getContext('2d'),gr=sx.createLinearGradient(0,0,0,512);
  gr.addColorStop(0,'#03051a');gr.addColorStop(.45,'#0a1c55');gr.addColorStop(.75,'#25205f');gr.addColorStop(1,'#7a3b7a');sx.fillStyle=gr;sx.fillRect(0,0,4,512);
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1000,32,24),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sk),side:THREE.BackSide,fog:false})));
  // bintang
  const sp=[];for(let i=0;i<1800;i++){const th=Math.random()*Math.PI*2,y=Math.random()*.9+.04,r=Math.sqrt(1-y*y);sp.push(Math.cos(th)*r*900,y*900,Math.sin(th)*r*900)}
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));
  starPts=new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:2.4,sizeAttenuation:false,fog:false,transparent:true,opacity:.9,depthWrite:false}));scene.add(starPts);
  // planet
  planetGrp=new THREE.Group();
  const p1=new THREE.Mesh(new THREE.SphereGeometry(60,40,32),new THREE.MeshBasicMaterial({map:stripeTex('#c98a4b','#e8b878',9),fog:false}));p1.position.set(-260,170,-620);
  const ring=new THREE.Mesh(new THREE.RingGeometry(80,118,72),new THREE.MeshBasicMaterial({color:0xe8c890,transparent:true,opacity:.55,side:THREE.DoubleSide,fog:false,depthWrite:false}));ring.position.copy(p1.position);ring.rotation.x=Math.PI/2-.35;ring.rotation.y=.25;
  const p2=new THREE.Mesh(new THREE.SphereGeometry(45,36,28),new THREE.MeshBasicMaterial({map:stripeTex('#2a5cff','#58a6ff',6),fog:false}));p2.position.set(300,230,-760);
  const halo=new THREE.Mesh(new THREE.SphereGeometry(52,24,20),new THREE.MeshBasicMaterial({color:0x4a8cff,transparent:true,opacity:.18,blending:THREE.AdditiveBlending,side:THREE.BackSide,fog:false,depthWrite:false}));halo.position.copy(p2.position);
  const p3=new THREE.Mesh(new THREE.SphereGeometry(22,24,20),new THREE.MeshBasicMaterial({color:0xdfe6f5,fog:false}));p3.position.set(90,320,-820);
  [p1,ring,p2,halo,p3].forEach(m=>planetGrp.add(m));scene.add(planetGrp);
  // aurora
  auroraMats=[];
  [[0,150,-520,900,[.2,1,.6],[.5,.3,1]],[-220,180,-480,700,[.1,.9,.9],[.9,.3,.8]],[260,200,-560,800,[.3,1,.4],[.2,.5,1]]].forEach(a=>{
    const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
      uniforms:{time:{value:Math.random()*10},c1:{value:new THREE.Vector3(...a[4])},c2:{value:new THREE.Vector3(...a[5])}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'uniform float time;uniform vec3 c1;uniform vec3 c2;varying vec2 vUv;void main(){float band=sin(vUv.x*14.0+time*.6+sin(vUv.x*5.0+time*.4)*2.0)*.5+.5;float cur=smoothstep(0.0,.25,vUv.y)*(1.0-smoothstep(.35,1.0,vUv.y));float ray=pow(sin(vUv.x*60.0+time*.8)*.5+.5,3.0)*.5+.5;vec3 col=mix(c1,c2,clamp(vUv.y+band*.3,0.0,1.0));gl_FragColor=vec4(col,cur*band*ray*.8);}'});
    const pl=new THREE.Mesh(new THREE.PlaneGeometry(a[3],200,1,1),m);pl.position.set(a[0],a[1],a[2]);pl.rotation.y=a[0]*.0004;scene.add(pl);auroraMats.push(m)});
  // jalan
  roadTexture=makeRoadTexture();roadTexture.repeat.set(1,30);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(30,500),new THREE.MeshStandardMaterial({map:roadTexture,roughness:.85,metalness:.1}));
  ground.rotation.x=-Math.PI/2;ground.position.set(0,0,-180);ground.receiveShadow=true;scene.add(ground);
  // kota (akan bergerak ke belakang)
  cityB=[];const wt=[makeWindowTex(),makeWindowTex(),makeWindowTex()];
  for(const side of [-1,1])for(let i=0;i<24;i++){
    const h=5+Math.random()*16,t=wt[(i+(side>0?1:0))%3];
    const b=new THREE.Mesh(new THREE.BoxGeometry(3.5,h,4),new THREE.MeshStandardMaterial({map:t,emissiveMap:t,emissive:0xffffff,emissiveIntensity:1.1,roughness:.8}));
    b.position.set(side*(7+Math.random()*3.5),h/2,-i*14-10+20);b.castShadow=true;b.receiveShadow=true;scene.add(b);cityB.push(b);
  }
  player=buildCharacter(CHAR_MAP[userData.currentChar]||CHARACTERS[0]);scene.add(player);
  dog=buildDog();dog.position.set(0,0,dogChaseDistance);scene.add(dog);
  susanoo=buildSusanoo();susanoo.position.set(0,susanooBaseY,-90);scene.add(susanoo);
  clock=new THREE.Clock();skillBtnEl=document.getElementById('skillBtn');
  window.addEventListener('resize',onResize);
}

/* ---------- KARAKTER ala anime ---------- */
function buildCharacter(char){
  const g=new THREE.Group(),bg=new THREE.Group();g.add(bg);g.rotation.y=Math.PI;
  const M=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.55,metalness:.1},o||{}));
  const cloth=M(char.outfit),skin=M(char.skin,{roughness:.7}),hairM=M(char.hair,{roughness:.55,metalness:.25});
  const pantsC=char.id==='naruto'?0xff6a00:char.id==='rocklee'?0x00aa00:char.id==='minato'?0x22304a:0x20263c;
  const pants=M(pantsC),shoe=M(0x14141c,{roughness:.4}),dark=M(0x111118);
  const add=(m,x,y,z,p)=>{m.position.set(x,y,z);(p||bg).add(m);m.castShadow=true;return m};
  add(new THREE.Mesh(new THREE.CylinderGeometry(.27,.21,.72,14),cloth),0,1.1,0);
  add(new THREE.Mesh(new THREE.CylinderGeometry(.285,.285,.07,14),M(0x1a1a22)),0,.78,0);
  add(new THREE.Mesh(new THREE.CylinderGeometry(.11,.13,.14,10),skin),0,1.5,0);
  add(new THREE.Mesh(new THREE.TorusGeometry(.17,.05,8,16),cloth),0,1.47,0).rotation.x=Math.PI/2;
  add(new THREE.Mesh(new THREE.SphereGeometry(.27,26,26),skin),0,1.72,0).scale.set(1,1.06,1);
  const irisC=char.eyeColor;
  [-1,1].forEach(s=>{
    add(new THREE.Mesh(new THREE.SphereGeometry(.075,14,14),M(0xffffff,{roughness:.3})),s*.1,1.71,.225).scale.set(1,1.2,.45);
    add(new THREE.Mesh(new THREE.SphereGeometry(.05,14,14),new THREE.MeshStandardMaterial({color:irisC,emissive:irisC,emissiveIntensity:.5})),s*.1,1.705,.245).scale.set(1,1.25,.5);
    add(new THREE.Mesh(new THREE.SphereGeometry(.024,10,10),dark),s*.1,1.705,.262).scale.set(1,1.3,.5);
    add(new THREE.Mesh(new THREE.SphereGeometry(.014,8,8),new THREE.MeshBasicMaterial({color:0xffffff})),s*.1+.016,1.73,.268);
    if(char.acc==='sharingan')for(let k=0;k<3;k++){const a=k*2.094+.5;add(new THREE.Mesh(new THREE.SphereGeometry(.009,6,6),dark),s*.1+Math.cos(a)*.03,1.705+Math.sin(a)*.04,.266)}
    add(new THREE.Mesh(new THREE.BoxGeometry(.1,.016,.02),hairM),s*.1,1.79,.245).rotation.z=-s*.25;
    if(char.id==='naruto')for(let i=0;i<3;i++)add(new THREE.Mesh(new THREE.BoxGeometry(.07,.008,.008),M(0x553322)),s*.19,1.64+i*.025,.2).rotation.z=s*(i-1)*.3;
  });
  add(new THREE.Mesh(new THREE.BoxGeometry(.07,.012,.01),M(0x884433)),0,1.6,.255);
  // rambut
  add(new THREE.Mesh(new THREE.SphereGeometry(.29,22,22,0,Math.PI*2,0,Math.PI*.42),hairM),0,1.745,0);
  add(new THREE.Mesh(new THREE.BoxGeometry(.5,.42,.26),hairM),0,1.64,-.17);
  if(char.hairType==='spiky'){
    for(let i=0;i<16;i++){const a=i/16*Math.PI*2,r=.17,cn=add(new THREE.Mesh(new THREE.ConeGeometry(.09,.38+Math.random()*.12,7),hairM),Math.cos(a)*r,1.93,Math.sin(a)*r);cn.rotation.z=-Math.cos(a)*.85;cn.rotation.x=Math.sin(a)*.85}
    for(let i=-2;i<=2;i++){const cn=add(new THREE.Mesh(new THREE.ConeGeometry(.07,.3,6),hairM),i*.09,1.86,.22);cn.rotation.x=2.4;cn.rotation.z=-i*.15}
  }else if(char.hairType==='long'){
    add(new THREE.Mesh(new THREE.BoxGeometry(.5,.95,.16),hairM),0,1.3,-.22);
    [-1,1].forEach(s=>{add(new THREE.Mesh(new THREE.BoxGeometry(.1,.55,.14),hairM),s*.25,1.5,.08);add(new THREE.Mesh(new THREE.BoxGeometry(.08,.34,.08),hairM),s*.09,1.82,.25)});
    add(new THREE.Mesh(new THREE.BoxGeometry(.44,.1,.1),hairM),0,1.9,.2);
  }else if(char.hairType==='bowl'){
    add(new THREE.Mesh(new THREE.SphereGeometry(.3,20,20,0,Math.PI*2,0,Math.PI*.5),hairM),0,1.76,0);
    add(new THREE.Mesh(new THREE.BoxGeometry(.5,.1,.12),hairM),0,1.88,.22);
  }
  let tail=null;
  if(char.acc==='headband'){
    add(new THREE.Mesh(new THREE.TorusGeometry(.285,.03,8,28),M(0x1f3d8f)),0,1.8,0).rotation.x=Math.PI/2;
    add(new THREE.Mesh(new THREE.BoxGeometry(.2,.1,.03),M(0xcccccc,{metalness:.9,roughness:.2})),0,1.8,.285);
    tail=new THREE.Group();tail.position.set(0,1.8,-.29);bg.add(tail);
    [-.06,.06].forEach(x=>add(new THREE.Mesh(new THREE.BoxGeometry(.07,.02,.42),M(0x1f3d8f)),x,0,-.21,tail));
  }
  if(char.acc==='mask')add(new THREE.Mesh(new THREE.BoxGeometry(.4,.17,.3),M(0x23262e)),0,1.6,.1);
  const mkArm=s=>{const a=new THREE.Group();a.position.set(s*.37,1.4,0);bg.add(a);
    add(new THREE.Mesh(new THREE.CylinderGeometry(.075,.065,.62,10),cloth),0,-.31,0,a);
    add(new THREE.Mesh(new THREE.SphereGeometry(.075,10,10),skin),0,-.66,0,a);
    add(new THREE.Mesh(new THREE.SphereGeometry(.1,10,10),cloth),0,0,0,a);return a};
  const mkLeg=s=>{const l=new THREE.Group();l.position.set(s*.14,.9,0);bg.add(l);
    add(new THREE.Mesh(new THREE.CylinderGeometry(.105,.08,.84,10),pants),0,-.42,0,l);
    add(new THREE.Mesh(new THREE.BoxGeometry(.19,.12,.34),shoe),0,-.84,.06,l);return l};
  const aL=mkArm(-1),aR=mkArm(1),lL=mkLeg(-1),lR=mkLeg(1);
  g.userData.anim={armL:aL,armR:aR,legL:lL,legR:lR,bodyGroup:bg,tail};
  const aura=new THREE.Mesh(new THREE.TorusGeometry(.8,.08,8,32),new THREE.MeshBasicMaterial({color:char.skillColor,transparent:true,opacity:0}));aura.rotation.x=Math.PI/2;aura.position.y=.1;g.userData.aura=aura;g.add(aura);
  const wings=buildWings();wings.visible=false;g.userData.wings=wings;g.add(wings);
  const board=buildHoverboard();board.visible=false;g.userData.board=board;g.add(board);
  return g;
}
function animateCharacter(dt){
  const a=player.userData.anim;if(!a)return;
  const bgp=a.bodyGroup;animTime+=dt*(9+gameSpeed*.26);
  const s=Math.sin(animTime),c=Math.cos(animTime),k=1-Math.exp(-dt*22);
  if(!a.cur)a.cur={alx:0,arx:0,alz:0,arz:0,llx:0,lrx:0,lpx:.14,bx:0,by:0,bz:0,py:0};
  const cur=a.cur;
  if(a.tail){a.tail.rotation.x=.5+Math.sin(animTime*.8)*.3+gameSpeed*.004;a.tail.rotation.z=Math.sin(animTime*.5)*.15}
  if(isSliding&&!wingsActive){ // guling ke depan
    const p=Math.min(1,Math.max(0,1-slideTimer/SLIDE_T)),th=p*Math.PI*2;
    bgp.rotation.set(th,0,0);bgp.position.set(0,.85-.85*Math.cos(th),-.85*Math.sin(th));
    a.armL.rotation.set(-1.7,0,0);a.armR.rotation.set(-1.7,0,0);a.legL.rotation.set(-2,0,0);a.legR.rotation.set(-2,0,0);
    a.legL.position.x=-.14;a.legR.position.x=.14;return;
  }
  const bank=-(targetX-player.position.x)*.22;let T;
  if(wingsActive)T={alx:1.5,arx:1.5,alz:-.3,arz:.3,llx:.5+s*.08,lrx:.5-s*.08,lpx:.14,bx:1,by:0,bz:bank,py:0};
  else if(hoverboardActive&&isJumping)T={alx:-.5,arx:-.5,alz:-1.35,arz:1.35,llx:-1,lrx:-.7,lpx:.3,bx:.2,by:1.25,bz:bank,py:.12};
  else if(hoverboardActive)T={alx:0,arx:0,alz:-1.15+Math.sin(animTime*.4)*.12,arz:1.15-Math.sin(animTime*.4)*.12,llx:.12,lrx:-.12,lpx:.3,bx:.28,by:1.25,bz:bank+Math.sin(animTime*.3)*.05,py:-.1};
  else if(isJumping){const v=playerVY;
    if(v>3)T={alx:-2.5,arx:-2.3,alz:-.15,arz:.15,llx:-1.5,lrx:.7,lpx:.14,bx:-.15,by:0,bz:bank,py:0};
    else if(v>-3)T={alx:-1.2,arx:-1.2,alz:-.5,arz:.5,llx:-1.3,lrx:-1.1,lpx:.14,bx:.3,by:0,bz:bank,py:0};
    else T={alx:-.4,arx:-.4,alz:-1.1,arz:1.1,llx:-.6,lrx:.35,lpx:.14,bx:.1,by:0,bz:bank,py:0};
  }else T={alx:1.35+s*.12,arx:1.35+s*.12,alz:.08,arz:-.08,llx:s*1.15-.45,lrx:-s*1.15-.45,lpx:.14,bx:.52,by:0,bz:bank+c*.04,py:Math.abs(s)*.07};
  for(const key in T)cur[key]+=(T[key]-cur[key])*k;
  bgp.rotation.set(cur.bx,cur.by,cur.bz);bgp.position.set(0,cur.py,0);
  a.armL.rotation.set(cur.alx,0,cur.alz);a.armR.rotation.set(cur.arx,0,cur.arz);
  a.legL.rotation.set(cur.llx,0,0);a.legR.rotation.set(cur.lrx,0,0);a.legL.position.x=-cur.lpx;a.legR.position.x=cur.lpx;
}

/* ---------- GAME LOOP ---------- */
function updateParticles(dt){for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.userData.life-=dt;if(p.userData.life<=0){scene.remove(p);particles.splice(i,1);continue}if(!p.userData.ng)p.userData.vy-=15*dt;p.position.x+=p.userData.vx*dt;p.position.y+=p.userData.vy*dt;p.position.z+=p.userData.vz*dt;const s=Math.max(.1,p.userData.life);p.scale.set(s,s,s)}}
function updateGame(dt){
  const scaledDt=dt*timeSlowFactor,t=performance.now()*.001;
  const targetSpeed=Math.min(BASE_SPEED+distance*SPEED_PER_M,MAX_SPEED);
  if(gameSpeed<targetSpeed)gameSpeed=Math.min(targetSpeed,gameSpeed+22*dt);else gameSpeed=targetSpeed;
  distance+=gameSpeed*scaledDt;
  // anjing
  dogChaseDistance-=(gameSpeed<15?2:.5)*dt;
  if(gameSpeed>=15&&dogChaseDistance<5.5)dogChaseDistance+=1.2*dt;
  if(dogChaseDistance>6)dogChaseDistance=6;
  dog.position.z=dogChaseDistance;dog.position.x+=(player.position.x-dog.position.x)*Math.min(dt*5,1);
  if(dogChaseDistance<3.5&&Math.random()<.05)sfxBark();
  if(dogChaseDistance<=1.2&&!wingsActive&&!hoverboardActive){dogBite();return}
  player.position.x+=(targetX-player.position.x)*(1-Math.exp(-dt*40));
  if(bootsActive){bootsTimer-=dt;if(bootsTimer<=0)bootsActive=false}
  if(wingsActive){wingsTimer-=dt;if(wingsTimer<=0){wingsActive=false;invincibleTimer=Math.max(invincibleTimer,2.2);glide=1.4}}
  if(glide>0)glide-=dt;
  if(hoverboardActive){hoverboardTimer-=dt;if(hoverboardTimer<=0)hoverboardActive=false}
  if(invincibleTimer>0)invincibleTimer-=dt;
  if(skillActiveTimer>0){skillActiveTimer-=dt;if(skillActiveTimer<=0)endSkill()}
  if(skillCooldownTimer>0){skillCooldownTimer-=dt;if(skillCooldownTimer<0)skillCooldownTimer=0}
  if(isSliding){slideTimer-=dt;if(slideTimer<=0)isSliding=false}
  let onRamp=false;
  for(const o of obstacles){if(o.type==='train'&&o.hasRamp&&Math.abs(o.mesh.position.x-player.position.x)<1){const fz=o.mesh.position.z+6+o.rampLength,bz=o.mesh.position.z+6;if(PLAYER_Z>=bz&&PLAYER_Z<=fz){const tt=(fz-PLAYER_Z)/o.rampLength,ry=tt*TRAIN_TOP;if(ry>playerY){playerY=ry;playerVY=0;isJumping=false}onRamp=true}}}
  if(wingsActive){playerY+=(8+Math.sin(t*3)*.4-playerY)*Math.min(dt*4,1);playerVY=0;isJumping=false;if(Math.random()<.4){const ln=randomLane(),cm=createCoinMesh();cm.position.set(LANES[ln],6+Math.random()*3,-100);scene.add(cm);coins.push({mesh:cm})}}
  else if(!onRamp){
    const gy=getGroundY();
    if(isJumping||playerY>gy+.05){
      playerVY-=GRAVITY*dt;if(glide>0&&playerVY<-6)playerVY=-6;
      playerY+=playerVY*dt;
      if(playerVY<0&&playerY<=gy+(isJumping?.3:0)){playerY=gy;playerVY=0;isJumping=false}
    }else{playerY=gy;playerVY=0}
  }
  const lift=(hoverboardActive&&!wingsActive)?.2+Math.sin(t*5)*.03:0;
  player.position.y=playerY+lift;
  const bd=player.userData.board;bd.visible=hoverboardActive;bd.position.set(0,-.1,0);
  if(hoverboardActive){if(isJumping){boardSpin=Math.min(boardSpin+dt*13,Math.PI*2);bd.rotation.set(-.25,0,boardSpin)}else{boardSpin=0;bd.rotation.set(Math.sin(animTime*.5)*.03,0,Math.sin(animTime*.4)*.05)}}
  player.userData.wings.visible=wingsActive;
  player.userData.aura.material.opacity=skillActiveTimer>0?.6+Math.sin(t*10)*.3:0;
  animateCharacter(dt);animateDog(dt);animateSusanoo(dt);
  // dunia bergerak
  const move=gameSpeed*scaledDt;roadTexture.offset.y=(roadTexture.offset.y-move*.04)%1;
  for(const b of cityB){b.position.z+=move;if(b.position.z>25)b.position.z-=CITY_LEN}
  if(starPts)starPts.rotation.y+=dt*.004;if(planetGrp)planetGrp.rotation.y+=dt*.0006;
  auroraMats.forEach(m=>m.uniforms.time.value=t);
  for(let i=obstacles.length-1;i>=0;i--){const o=obstacles[i];o.mesh.position.z+=move;if(o.mesh.position.z>20){scene.remove(o.mesh);obstacles.splice(i,1)}}
  for(let i=coins.length-1;i>=0;i--){const cn=coins[i];cn.mesh.position.z+=move;cn.mesh.rotation.y+=dt*5;if(cn.mesh.position.z>20){scene.remove(cn.mesh);coins.splice(i,1)}}
  for(let i=powerups.length-1;i>=0;i--){const p=powerups[i];p.mesh.position.z+=move;p.mesh.rotation.y+=dt*3;p.mesh.position.y=(p.type==='hoverboard'?.5:1)+Math.sin(t*3)*.2;if(p.mesh.position.z>20){scene.remove(p.mesh);powerups.splice(i,1)}}
  // spawn dengan jarak lega
  if(!holdSpawn&&distance>nextSpawnDistance){spawnPattern();nextSpawnDistance=distance+Math.max(70,gameSpeed*2)+Math.random()*20}
  // Susanoo: berhenti spawn rintangan -> layar bersih -> baru menyerang
  if(susanoState===0){susanooNextAttack-=dt;if(susanooNextAttack<=0)susanoState=1}
  else if(susanoState===1){if(!obstacles.some(o=>o.mesh.position.z>-115&&o.mesh.position.z<20)){spawnSusanooAttack();susanoState=2}}
  else if(!arrowWarnings.length&&!arrows.length){susanoState=0;susanooNextAttack=7+Math.random()*4}
  holdSpawn=susanoState>0;
  // koin & powerup
  for(let i=coins.length-1;i>=0;i--){const cn=coins[i],px=player.position.x,py=playerY+1;if(activeSkillEffect==='magnet'){const dx=px-cn.mesh.position.x,dy=py-cn.mesh.position.y,dz=-cn.mesh.position.z,d=Math.sqrt(dx*dx+dy*dy+dz*dz);if(d<8){cn.mesh.position.x+=dx*dt*8;cn.mesh.position.y+=dy*dt*8;cn.mesh.position.z+=dz*dt*8}}
    if(Math.abs(cn.mesh.position.z-PLAYER_Z)<1.3&&Math.abs(cn.mesh.position.x-px)<1&&Math.abs(cn.mesh.position.y-py)<1.5){gameCoins+=coinMultiplier;sfx('coin');spawnCoinBurst(cn.mesh.position.x,cn.mesh.position.y,cn.mesh.position.z);scene.remove(cn.mesh);coins.splice(i,1)}}
  for(let i=powerups.length-1;i>=0;i--){const p=powerups[i];if(Math.abs(p.mesh.position.z-PLAYER_Z)<1.4&&Math.abs(p.mesh.position.x-player.position.x)<1.2&&Math.abs(p.mesh.position.y-(playerY+1))<2){if(p.type==='boots'){bootsActive=true;bootsTimer=8;sfx('boots')}else if(p.type==='wings'){wingsActive=true;wingsTimer=7;sfx('wings');hoverboardActive=false}else if(p.type==='hoverboard'){hoverboardActive=true;hoverboardTimer=20;sfx('board')}updateStatusBar();scene.remove(p.mesh);powerups.splice(i,1)}}
  // tabrakan
  if(!wingsActive&&invincibleTimer<=0&&!onRamp){
    for(const o of obstacles){
      if(Math.abs(o.mesh.position.x-player.position.x)>.95)continue;
      if(Math.abs(o.mesh.position.z-PLAYER_Z)>o.length/2+.3)continue;
      const pTop=playerY+(isSliding?.9:1.8);let hit=false;
      if(o.type==='train'){if(playerY>=TRAIN_TOP-.7)continue;hit=pTop>o.yBottom&&playerY<o.yTop}
      else if(o.type==='barrier')hit=playerY<o.yTop&&pTop>o.yBottom;
      else if(o.type==='highbar')hit=pTop>o.yBottom&&playerY<o.yTop;
      if(hit){if(hoverboardActive){hoverboardActive=false;invincibleTimer=1}else handleCollision();break}
    }
  }
  // kamera
  const fovT=72+(gameSpeed-32)*.12;camera.fov+=(fovT-camera.fov)*Math.min(dt*3,1);camera.updateProjectionMatrix();
  camBaseX+=(player.position.x*.4-camBaseX)*Math.min(dt*6,1);
  if(shakeTime>0){shakeTime-=dt;camera.position.x=camBaseX+(Math.random()-.5)*.6;camera.position.y=5.5+(Math.random()-.5)*.5}
  else{camera.position.x+=(camBaseX-camera.position.x)*Math.min(dt*8,1);camera.position.y+=(5.5-camera.position.y)*Math.min(dt*8,1)}
  camera.lookAt(player.position.x*.3,1.8+playerY*.3,-12);
  updateParticles(dt);updateRings(dt);updateArrowWarnings(dt);updateArrows(dt);updateHUD();updateStatusBar();updateSkillUI();
}

/* ---------- SUSANOO: memanah ---------- */
const _wv=new THREE.Vector3(),_tg=new THREE.SphereGeometry(.5,6,6),_tm=[new THREE.MeshBasicMaterial({color:0xcc88ff}),new THREE.MeshBasicMaterial({color:0xffffff})];
function nockWorld(){addSusanooBow();susanoo.userData.nock.getWorldPosition(_wv);return _wv.clone()}
function addSusanooBow(){
  if(!susanoo||susanoo.userData.bow)return;
  const U=susanoo.userData,add=THREE.AdditiveBlending;
  const shellM=new THREE.MeshBasicMaterial({color:0xaa66ff,transparent:true,opacity:.22,blending:add,depthWrite:false,side:THREE.BackSide});
  susanoo.children.slice().forEach(ch=>{if(ch.isMesh&&ch.geometry.type!=='SphereGeometry'){const s=new THREE.Mesh(ch.geometry,shellM);s.position.copy(ch.position);s.rotation.copy(ch.rotation);s.scale.setScalar(1.18);susanoo.add(s)}});
  const bowMat=new THREE.MeshStandardMaterial({color:0xb36bff,emissive:0x7a2cff,emissiveIntensity:2.4,transparent:true,opacity:.95});
  const bow=new THREE.Group(),arcG=new THREE.Group(),arc=new THREE.Mesh(new THREE.TorusGeometry(10,.9,10,48,Math.PI),bowMat);
  arc.rotation.z=Math.PI/2;arcG.rotation.y=Math.PI/2;arcG.add(arc);bow.add(arcG);
  const str=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,20,6),new THREE.MeshBasicMaterial({color:0xffccff}));bow.add(str);
  const nock=new THREE.Group(),nm=new THREE.MeshBasicMaterial({color:0xcc88ff,transparent:true,opacity:.9}),nc=new THREE.MeshBasicMaterial({color:0xffffff});
  const sh=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,16,8),nm);sh.rotation.x=Math.PI/2;sh.position.z=4;nock.add(sh);
  const hd=new THREE.Mesh(new THREE.ConeGeometry(1.2,3.6,10),nc);hd.rotation.x=Math.PI/2;hd.position.z=13;nock.add(hd);
  const gl=new THREE.Mesh(new THREE.SphereGeometry(2.6,16,16),new THREE.MeshBasicMaterial({color:0x8a3cff,transparent:true,opacity:.45,blending:add,depthWrite:false}));gl.position.z=3;nock.add(gl);
  nock.visible=false;bow.add(nock);
  bow.position.set(-8,12,8);bow.rotation.y=.15;susanoo.add(bow);
  U.bow=bow;U.str=str;U.nock=nock;U.draw=0;U.flames=[];
  for(let i=0;i<60;i++){
    const f=new THREE.Mesh(new THREE.ConeGeometry(.5+Math.random()*.8,2.5+Math.random()*4,6),new THREE.MeshBasicMaterial({color:i%2?0xcc88ff:0x7a2cff,transparent:true,opacity:.5,blending:add,depthWrite:false}));
    const a=Math.random()*Math.PI*2,r=3+Math.random()*6;f.position.set(Math.cos(a)*r,6+Math.random()*20,Math.sin(a)*r*.7);
    f.userData.baseY=f.position.y;f.userData.ph=Math.random()*6;susanoo.add(f);U.flames.push(f);
  }
}
function animateSusanoo(dt){
  if(!susanoo)return;addSusanooBow();
  const U=susanoo.userData,t=performance.now()*.001,d=U.draw||0;
  susanoo.position.y=susanooBaseY+Math.sin(t*.8)*.6;susanoo.rotation.y=Math.sin(t*.3)*.05;
  const e=d*d*(3-2*d);
  if(U.arms){U.arms[0].rotation.x=-1.45*e;U.arms[0].rotation.z=Math.sin(t*.5)*.08*(1-e);U.arms[1].rotation.x=-1.45*e;U.arms[1].position.z=-e*4;U.arms[1].rotation.z=-Math.sin(t*.5)*.08*(1-e)}
  U.str.position.z=-e*5;U.nock.visible=d>.03;U.nock.position.z=-e*5;U.nock.scale.setScalar(.35+e*.65);
  U.flames.forEach(f=>{const k=1+d*.8;f.position.y=f.userData.baseY+Math.sin(t*4+f.userData.ph)*1.2;const s=(1+Math.sin(t*6+f.userData.ph)*.25)*k;f.scale.set(s,1.3*s,s)});
  const aura=susanoo.children.find(c=>c.geometry&&c.geometry.type==='SphereGeometry'&&c.geometry.parameters.radius===24);
  if(aura){aura.rotation.y+=dt*.3;aura.material.opacity=.1+Math.sin(t*3)*.05+d*.12}
}
function spawnSusanooAttack(){
  const tx=LANES[currentLane],tz=-1;
  const marker=new THREE.Mesh(new THREE.RingGeometry(1.2,1.6,24),new THREE.MeshBasicMaterial({color:0xff0000,transparent:true,opacity:.9,side:THREE.DoubleSide}));marker.rotation.x=-Math.PI/2;marker.position.set(tx,.1,tz);scene.add(marker);
  const markerAura=new THREE.Mesh(new THREE.RingGeometry(.2,1.2,24),new THREE.MeshBasicMaterial({color:0xff2200,transparent:true,opacity:.35,side:THREE.DoubleSide}));markerAura.rotation.x=-Math.PI/2;markerAura.position.set(tx,.12,tz);scene.add(markerAura);
  if(audioCtx&&!musicMuted){const n=audioCtx.currentTime;playTone(880,n,.1,.2,'square');playTone(660,n+.15,.1,.2,'square');playTone(440,n+.3,.15,.2,'square')}
  arrowWarnings.push({marker,markerAura,lane:currentLane,targetX:tx,targetZ:tz,timer:1.9,totalTime:1.9});
}
function updateArrowWarnings(dt){
  for(let i=arrowWarnings.length-1;i>=0;i--){
    const w=arrowWarnings[i];w.timer-=dt;const prog=Math.min(1,1-w.timer/w.totalTime);susanoo.userData.draw=prog;
    const pulse=1+Math.sin(performance.now()*.015)*.15,sf=.8+prog*.6;
    w.marker.scale.set(pulse*sf,pulse*sf,1);w.markerAura.scale.set(pulse*sf,pulse*sf,1);
    w.marker.material.opacity=.6+Math.sin(performance.now()*.02)*.3;w.markerAura.material.opacity=.2+prog*.3;
    const np=nockWorld();
    for(let k=0;k<3;k++){const p=new THREE.Mesh(_tg,_tm[k%2]);p.position.set(np.x+(Math.random()-.5)*14,np.y+(Math.random()-.5)*14,np.z+(Math.random()-.5)*14);
      p.userData.vx=(np.x-p.position.x)*2;p.userData.vy=(np.y-p.position.y)*2;p.userData.vz=(np.z-p.position.z)*2;p.userData.life=.5;p.userData.ng=true;scene.add(p);particles.push(p)}
    if(w.timer<=0){fireArrow(np,new THREE.Vector3(w.targetX,.2,w.targetZ),w.lane);susanoo.userData.draw=0;scene.remove(w.marker);scene.remove(w.markerAura);arrowWarnings.splice(i,1)}
  }
}
function fireArrow(startPos,endPos,lane){
  const g=new THREE.Group(),add=THREE.AdditiveBlending;
  const core=new THREE.MeshBasicMaterial({color:0xf2d9ff}),mid=new THREE.MeshBasicMaterial({color:0xb36bff,transparent:true,opacity:.9}),glow=new THREE.MeshBasicMaterial({color:0x7a2cff,transparent:true,opacity:.35,blending:add,depthWrite:false});
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,11,8),core));
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,11,10),mid));
  const hd=new THREE.Mesh(new THREE.ConeGeometry(1.1,3.2,10),mid);hd.position.y=7;g.add(hd);
  const hc=new THREE.Mesh(new THREE.ConeGeometry(.5,3.2,8),core);hc.position.y=7.1;g.add(hc);
  const gl=new THREE.Mesh(new THREE.CylinderGeometry(1.8,1.8,14,12),glow);gl.position.y=.5;g.add(gl);
  for(let i=0;i<3;i++){const f=new THREE.Mesh(new THREE.BoxGeometry(.05,2.2,1.4),mid);f.position.y=-5;f.rotation.y=i*Math.PI/3;g.add(f)}
  g.position.copy(startPos);const dir=new THREE.Vector3().subVectors(endPos,startPos).normalize();g.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);scene.add(g);
  if(audioCtx&&!musicMuted){const n=audioCtx.currentTime;const ns=audioCtx.createBufferSource();ns.buffer=makeNoiseBuffer(.6);const nf=audioCtx.createBiquadFilter();nf.type='bandpass';nf.frequency.setValueAtTime(300,n);nf.frequency.exponentialRampToValueAtTime(3000,n+.4);nf.Q.value=5;const ng=audioCtx.createGain();ng.gain.setValueAtTime(.3,n);ng.gain.exponentialRampToValueAtTime(.001,n+.55);ns.connect(nf);nf.connect(ng);ng.connect(audioCtx.destination);ns.start(n);ns.stop(n+.6);playTone(120,n,.4,.25,'sawtooth')}
  arrows.push({mesh:g,start:startPos.clone(),end:endPos.clone(),t:0,duration:.55,lane});
}
function updateArrows(dt){
  for(let i=arrows.length-1;i>=0;i--){const a=arrows[i];a.t+=dt/a.duration;
    if(a.t>=1){susanooImpact(a.lane,a.end);scene.remove(a.mesh);arrows.splice(i,1);continue}
    a.mesh.position.lerpVectors(a.start,a.end,a.t);
    for(let k=0;k<4;k++){const p=new THREE.Mesh(_tg,_tm[k%2]);p.position.copy(a.mesh.position);p.position.x+=(Math.random()-.5)*2;p.position.y+=(Math.random()-.5)*2;p.userData.vx=(Math.random()-.5)*3;p.userData.vy=(Math.random()-.5)*3;p.userData.vz=(Math.random()-.5)*3;p.userData.life=.45;p.userData.ng=true;scene.add(p);particles.push(p)}}
}
function susanooImpact(lane,pos){
  spawnBigExplosion(pos.x,1,pos.z,0xc266ff);shakeTime=.7;
  const pil=new THREE.Mesh(new THREE.CylinderGeometry(1.4,2.2,40,16,1,true),new THREE.MeshBasicMaterial({color:0xcc88ff,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));pil.position.set(pos.x,20,pos.z);scene.add(pil);rings.push({mesh:pil,scale:1,life:.7});
  if(audioCtx&&!musicMuted){const n=audioCtx.currentTime;const b=audioCtx.createOscillator(),bg=audioCtx.createGain();b.type='sine';b.frequency.setValueAtTime(150,n);b.frequency.exponentialRampToValueAtTime(30,n+.8);bg.gain.setValueAtTime(0,n);bg.gain.linearRampToValueAtTime(.4,n+.02);bg.gain.exponentialRampToValueAtTime(.001,n+.9);b.connect(bg);bg.connect(audioCtx.destination);b.start(n);b.stop(n+.9)}
  if(wingsActive||invincibleTimer>0)return;
  if(Math.abs(player.position.x-pos.x)<1.3){if(hoverboardActive){hoverboardActive=false;invincibleTimer=1.5;return}handleCollision()}
}
