/* v11: penanda & penampil error (HP tidak punya console) */
(function(){
  const bar=document.createElement('div');
  bar.style.cssText='position:fixed;left:8px;bottom:8px;z-index:99;font:700 11px sans-serif;color:#fff;background:rgba(0,120,60,.9);padding:4px 8px;border-radius:8px;pointer-events:none';
  const need=['makeWindowTex','showSkillToast','spawnFlyCoins','canDodge','skillSVG','initThree','getGroundY','spawnSusanooAttack'];
  const miss=need.filter(n=>typeof window[n]!=='function');
  if(miss.length){bar.style.background='rgba(160,0,0,.92)';bar.textContent='v11 GAGAL: file dasar belum versi v8 (kurang: '+miss.join(', ')+')';document.body.appendChild(bar);throw new Error('v11 prasyarat tidak terpenuhi')}
  bar.textContent='v11 aktif';document.body.appendChild(bar);setTimeout(()=>bar.remove(),6000);
  window.addEventListener('error',e=>{const b=document.createElement('div');b.style.cssText='position:fixed;left:8px;right:8px;top:8px;z-index:99;font:11px monospace;color:#fff;background:rgba(160,0,0,.92);padding:6px;border-radius:8px;pointer-events:none';b.textContent='Error: '+e.message+' ('+String(e.filename||'').split('/').pop()+':'+e.lineno+')';document.body.appendChild(b);setTimeout(()=>b.remove(),8000)});
})();
/* ================================================================
   UPGRADE v9
   ================================================================ */
const SP_BASE=22,SP_MAX=70,SP_PER_M=.022;
const BOW_C=new THREE.Vector3(-3.5,24,16),BOW_R=11,PULL_MAX=8,ARM_L=19;
const _dn=new THREE.Vector3(0,-1,0),_up=new THREE.Vector3(0,1,0),_a1=new THREE.Vector3(),_a2=new THREE.Vector3(),_a3=new THREE.Vector3();
let dying=false,dyingT=0,biteDone=false,stagger=0,bumpCD=0,lastLaneFrom=1,lastLaneTime=-9,cityExtraBuilt=false,bossActive=false,chakra=100,intro=false,introT=0,castT=0;

/* ---------- KOTA LEBIH PADAT + LAMPU JALAN ---------- */
function addMoreCity(){
  const wt=[makeWindowTex(),makeWindowTex(),makeWindowTex()];
  const mk=(x,z,h,w,t)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,w*1.1),new THREE.MeshStandardMaterial({map:t,emissiveMap:t,emissive:0xffffff,emissiveIntensity:1.1,roughness:.8}));b.position.set(x,h/2,z);scene.add(b);cityB.push(b)};
  const lampM=new THREE.MeshStandardMaterial({color:0x222233,metalness:.6,roughness:.4}),bulbM=new THREE.MeshBasicMaterial({color:0xfff0b0});
  for(const side of [-1,1]){
    for(let i=0;i<34;i++)mk(side*(7.2+Math.random()*2.5),20-i*CITY_LEN/34-Math.random()*4,5+Math.random()*18,3+Math.random()*2,wt[i%3]);
    for(let i=0;i<30;i++)mk(side*(12+Math.random()*8),20-i*CITY_LEN/30-Math.random()*6,14+Math.random()*34,5+Math.random()*4,wt[(i+1)%3]);
    for(let i=0;i<16;i++){
      const g=new THREE.Group();
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,5.2,8),lampM);pole.position.y=2.6;g.add(pole);
      const arm=new THREE.Mesh(new THREE.BoxGeometry(1.1,.08,.08),lampM);arm.position.set(-side*.5,5.2,0);g.add(arm);
      const bulb=new THREE.Mesh(new THREE.SphereGeometry(.28,10,10),bulbM);bulb.position.set(-side*1,5.1,0);g.add(bulb);
      g.position.set(side*5.4,0,20-i*CITY_LEN/16);scene.add(g);cityB.push(g);
    }
  }
}

/* ---------- INPUT ---------- */
function playerAction(a){
  if(!gameRunning||gamePaused||dying||intro||stagger>0)return;
  if(a==='left'&&currentLane>0){lastLaneFrom=currentLane;lastLaneTime=performance.now();currentLane--;targetX=LANES[currentLane]}
  else if(a==='right'&&currentLane<2){lastLaneFrom=currentLane;lastLaneTime=performance.now();currentLane++;targetX=LANES[currentLane]}
  else if(a==='jump'){if(wingsActive)return;if(!isJumping){isJumping=true;playerVY=bootsActive?18:JUMP_V;isSliding=false;sfx('jump')}}
  else if(a==='slide'){if(wingsActive)return;isJumping=false;playerVY=0;playerY=getGroundY();if(!isSliding){isSliding=true;slideTimer=SLIDE_T;sfx('slide')}}
}

/* ---------- TERBENTUR (samping) vs TERTABRAK (depan = mati) ---------- */
function doBump(o){
  if(dying||bumpCD>0)return;
  bumpCD=.6;stagger=.45;
  gameSpeed=Math.max(6,gameSpeed*.4);
  dogChaseDistance=Math.max(1.3,dogChaseDistance-1.8);
  shakeTime=.4;sfx('hit');isSliding=false;
  const df=document.getElementById('dangerFlash');df.classList.add('on');setTimeout(()=>df.classList.remove('on'),300);
  if(o){ // dorong keluar dari obstacle agar tidak tembus, lalu kembali ke jalur asal
    const sg=Math.sign(player.position.x-o.mesh.position.x)||1;
    player.position.x=o.mesh.position.x+sg*1.02;
    if(performance.now()-lastLaneTime<700)currentLane=lastLaneFrom;
    else currentLane=Math.max(0,Math.min(2,Math.round((player.position.x/2.2)+1)));
    targetX=LANES[currentLane];
  }
}
function handleCollision(){doBump(null)}
function startCrash(){
  if(dying)return;
  dying=true;dyingT=0;biteDone=false;isSliding=false;isJumping=false;
  sfx('hit');shakeTime=.6;
  const df=document.getElementById('dangerFlash');df.classList.add('on');setTimeout(()=>df.classList.remove('on'),300);
}
function finishRun(){
  gameRunning=false;if(gameLoopId)cancelAnimationFrame(gameLoopId);
  const finalScore=Math.floor(distance);
  userData.coins=(userData.coins||0)+gameCoins;
  const isNew=finalScore>(userData.highScore||0);if(isNew)userData.highScore=finalScore;
  userData.totalGames=(userData.totalGames||0)+1;
  saveUserData();clearResumeState();stopMusic();
  document.getElementById('overDistance').textContent=finalScore;document.getElementById('overCoins').textContent=gameCoins;
  document.getElementById('newRecord').classList.toggle('hidden',!isNew);
  document.getElementById('gameScreen').classList.remove('active');document.getElementById('overScreen').classList.add('active');
}
function crashPose(a){
  const f=Math.min(1,dyingT/.35),e=1-(1-f)*(1-f),b=a.bodyGroup;
  b.rotation.set(-1.5*e,0,0);b.position.set(biteDone?Math.sin(dyingT*40)*.03:0,.22*e,0);
  a.armL.rotation.set(-.6*e,0,-1.1*e);a.armR.rotation.set(-.6*e,0,1.1*e);
  a.legL.rotation.set(.4*e,0,-.15*e);a.legR.rotation.set(.2*e,0,.15*e);a.legL.position.x=-.14;a.legR.position.x=.14;
  if(a.tail)a.tail.rotation.x=.3;
}
function staggerPose(a){
  const k=Math.min(1,stagger/.45),t=performance.now()*.001,b=a.bodyGroup;
  b.rotation.set(-.35*k+Math.sin(t*28)*.08*k,0,Math.sin(t*22)*.18*k);b.position.set(0,0,0);
  a.armL.rotation.set(-1.4+Math.sin(t*30)*.7*k,0,-.6);a.armR.rotation.set(-1.4+Math.cos(t*30)*.7*k,0,.6);
  a.legL.rotation.set(.8*k,0,0);a.legR.rotation.set(-.5*k,0,0);a.legL.position.x=-.14;a.legR.position.x=.14;
}
{const _ac=animateCharacter;animateCharacter=function(dt){
  const a=player.userData.anim;if(!a)return;
  if(dying){crashPose(a);return}
  if(stagger>0){staggerPose(a);return}
  _ac(dt);
}}
{const _rg=resetGameState;resetGameState=function(){
  _rg();gameSpeed=SP_BASE;dying=false;dyingT=0;biteDone=false;stagger=0;bumpCD=0;lastLaneTime=-9;
  if(dog){dog.rotation.set(0,0,0);dog.position.y=0}
}}

function cameraStep(dt,useFov){
  if(useFov){const fovT=72+(gameSpeed-SP_BASE)*.12;camera.fov+=(fovT-camera.fov)*Math.min(dt*3,1);camera.updateProjectionMatrix()}
  camBaseX+=(player.position.x*.4-camBaseX)*Math.min(dt*6,1);
  if(shakeTime>0){shakeTime-=dt;camera.position.x=camBaseX+(Math.random()-.5)*.6;camera.position.y=5.5+(Math.random()-.5)*.5}
  else{camera.position.x+=(camBaseX-camera.position.x)*Math.min(dt*8,1);camera.position.y+=(5.5-camera.position.y)*Math.min(dt*8,1)}
  camera.lookAt(player.position.x*.3,3.6+playerY*.3,-12);
}
function updateDying(dt){
  dyingT+=dt;
  gameSpeed*=Math.exp(-dt*3.5);const move=gameSpeed*dt;
  roadTexture.offset.y=(roadTexture.offset.y-move*.04)%1;
  for(const b of cityB){b.position.z+=move;if(b.position.z>25)b.position.z-=CITY_LEN}
  obstacles.forEach(o=>{o.mesh.position.z+=move});coins.forEach(c=>{c.mesh.position.z+=move});powerups.forEach(p=>{p.mesh.position.z+=move});
  if(playerY>0){playerVY-=GRAVITY*dt;playerY+=playerVY*dt;if(playerY<0){playerY=0;playerVY=0}}
  player.position.y=playerY;
  animateCharacter(dt);animateDog(dt);animateSusanoo(dt);swallowStep(dt);
  if(starPts)starPts.rotation.y+=dt*.004;auroraMats.forEach(m=>m.uniforms.time.value=performance.now()*.001);
  cameraStep(dt,false);
  updateParticles(dt);updateRings(dt);updateArrowWarnings(dt);updateArrows(dt);
  if(dyingT>3.3)finishRun();
}

/* ---------- SUSANOO: tangan IK, busur besar, tarik, lepas ---------- */
function buildSusanoo(){
  const g=new THREE.Group();
  const mat=new THREE.MeshStandardMaterial({color:0xa557ff,emissive:0x7a2cff,emissiveIntensity:2.4,transparent:true,opacity:.93,metalness:.5,roughness:.25,fog:false});
  const dense=new THREE.MeshStandardMaterial({color:0x6a2bb8,emissive:0x4a12a0,emissiveIntensity:1.8,transparent:true,opacity:.88,fog:false});
  const eyeM=new THREE.MeshBasicMaterial({color:0xff2a2a,fog:false});
  const P=(geo,m,x,y,z,par)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);(par||g).add(o);return o};
  P(new THREE.CylinderGeometry(6,9,10,20),dense,0,5,0);
  P(new THREE.CylinderGeometry(8,6,16,20),dense,0,15,0);
  for(let i=0;i<6;i++){const r=P(new THREE.TorusGeometry(7.6-i*.4,.8,10,28),mat,0,8+i*2.8,0);r.rotation.x=Math.PI/2;r.scale.set(1,.85,1)}
  P(new THREE.CylinderGeometry(1.1,1.1,20,8),mat,0,16,-6);
  [-1,1].forEach(s=>{P(new THREE.SphereGeometry(4.6,16,14),mat,s*10.5,22,0);for(let k=0;k<3;k++){const sp=P(new THREE.ConeGeometry(.9,5,6),mat,s*(10.5+k*1.6),27,0);sp.rotation.z=-s*(.3+k*.25)}});
  P(new THREE.SphereGeometry(4.8,20,18),mat,0,29,0).scale.set(1.1,1.2,1.1);
  P(new THREE.BoxGeometry(5.4,2.4,4),mat,0,25.2,1.5);
  [-1,1].forEach(s=>{P(new THREE.SphereGeometry(1.3,12,12),eyeM,s*1.9,29.6,4.4);P(new THREE.ConeGeometry(1.5,9,8),mat,s*3.6,35,0).rotation.z=-s*.4});
  for(let i=-2;i<=2;i++)P(new THREE.ConeGeometry(.35,1.4,5),mat,i*.9,24.4,3.6).rotation.x=Math.PI;
  const arms=[];
  [-1,1].forEach(s=>{const ag=new THREE.Group();ag.position.set(s*10.5,22,0);
    P(new THREE.CylinderGeometry(2.4,1.8,ARM_L-1,10),mat,0,-(ARM_L-1)/2,0,ag);P(new THREE.BoxGeometry(4.4,4.4,4.4),mat,0,-ARM_L,0,ag);P(new THREE.SphereGeometry(2.8,12,12),dense,0,-1,0,ag);g.add(ag);arms.push(ag)});
  g.userData.arms=arms;
  const aura=new THREE.Mesh(new THREE.SphereGeometry(24,32,32),new THREE.MeshBasicMaterial({color:0x9b59b6,transparent:true,opacity:.1,side:THREE.BackSide,wireframe:true,fog:false}));aura.position.y=18;g.add(aura);
  const hc=document.createElement('canvas');hc.width=hc.height=128;const hx=hc.getContext('2d'),hg=hx.createRadialGradient(64,64,0,64,64,64);hg.addColorStop(0,'rgba(170,90,255,.9)');hg.addColorStop(.5,'rgba(120,40,220,.4)');hg.addColorStop(1,'rgba(80,0,160,0)');hx.fillStyle=hg;hx.fillRect(0,0,128,128);
  const halo=new THREE.Mesh(new THREE.PlaneGeometry(110,110),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(hc),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));halo.position.set(0,22,-8);g.add(halo);
  return g;
}
function addSusanooBow(){
  if(!susanoo||susanoo.userData.bow)return;
  const U=susanoo.userData,AD=THREE.AdditiveBlending;
  const shellM=new THREE.MeshBasicMaterial({color:0xaa66ff,transparent:true,opacity:.22,blending:AD,depthWrite:false,side:THREE.BackSide,fog:false});
  susanoo.children.slice().forEach(ch=>{if(ch.isMesh&&ch.geometry.type!=='SphereGeometry'&&ch.geometry.type!=='PlaneGeometry'){const s=new THREE.Mesh(ch.geometry,shellM);s.position.copy(ch.position);s.rotation.copy(ch.rotation);s.scale.copy(ch.scale).multiplyScalar(1.18);susanoo.add(s)}});
  const bowMat=new THREE.MeshStandardMaterial({color:0xb36bff,emissive:0x7a2cff,emissiveIntensity:2.6,transparent:true,opacity:.95,fog:false});
  const bow=new THREE.Group(),arcG=new THREE.Group(),arc=new THREE.Mesh(new THREE.TorusGeometry(BOW_R,1.2,10,48,Math.PI),bowMat);
  arc.rotation.z=Math.PI/2;arcG.rotation.y=Math.PI/2;arcG.add(arc);bow.add(arcG);
  for(const s of [-1,1]){const tip=new THREE.Mesh(new THREE.SphereGeometry(1.6,10,10),new THREE.MeshBasicMaterial({color:0xf0d0ff,fog:false}));tip.position.set(0,s*BOW_R,0);bow.add(tip)}
  const strM=new THREE.MeshBasicMaterial({color:0xffe0ff,fog:false});
  const sU=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,1,6),strM),sD=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,1,6),strM);bow.add(sU);bow.add(sD);
  const nock=new THREE.Group(),nm=new THREE.MeshBasicMaterial({color:0xcc88ff,transparent:true,opacity:.95,fog:false}),nc=new THREE.MeshBasicMaterial({color:0xffffff,fog:false});
  const sh=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,16,8),nm);sh.rotation.x=Math.PI/2;sh.position.z=8;nock.add(sh);
  const hd=new THREE.Mesh(new THREE.ConeGeometry(1.5,4,10),nc);hd.rotation.x=Math.PI/2;hd.position.z=17.9;nock.add(hd);
  for(let i=0;i<3;i++){const f=new THREE.Mesh(new THREE.BoxGeometry(.06,2.4,1.6),nm);f.position.z=1.4;f.rotation.z=i*Math.PI/3;nock.add(f)}
  const glow=new THREE.Mesh(new THREE.CylinderGeometry(1.9,1.9,19,12),new THREE.MeshBasicMaterial({color:0x8a3cff,transparent:true,opacity:.3,blending:AD,depthWrite:false,fog:false}));glow.rotation.x=Math.PI/2;glow.position.z=8.5;nock.add(glow);
  const mid=new THREE.Object3D();mid.position.z=8;nock.add(mid);
  nock.visible=false;bow.add(nock);bow.position.copy(BOW_C);bow.rotation.order='YXZ';susanoo.add(bow);
  Object.assign(U,{bow,nock,glow,arrowMid:mid,sU,sD,raise:0,pull:0,rel:0,draw:0,aim:{yaw:0,pitch:0},flames:[]});
  for(let i=0;i<90;i++){
    const f=new THREE.Mesh(new THREE.ConeGeometry(.7+Math.random(),3+Math.random()*5,6),new THREE.MeshBasicMaterial({color:i%2?0xcc88ff:0x7a2cff,transparent:true,opacity:.5,blending:AD,depthWrite:false,fog:false}));
    const a=Math.random()*Math.PI*2,r=4+Math.random()*10;f.position.set(Math.cos(a)*r,4+Math.random()*28,Math.sin(a)*r*.7);
    f.userData.baseY=f.position.y;f.userData.ph=Math.random()*6;susanoo.add(f);U.flames.push(f);
  }
}
function placeSeg(m,a,b){const d=_a3.copy(b).sub(a),len=d.length();m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(1,Math.max(.01,len),1);m.quaternion.setFromUnitVectors(_up,d.divideScalar(len||1))}
function pointArm(ag,tg){const d=_a3.copy(tg).sub(ag.position),len=d.length();if(len<.01)return;d.divideScalar(len);ag.quaternion.setFromUnitVectors(_dn,d);ag.scale.set(1,Math.max(.4,len/ARM_L),1)}
function setAim(tx,tz){const U=susanoo.userData;addSusanooBow();U.bow.getWorldPosition(_a1);const dx=tx-_a1.x,dz=tz-_a1.z,dy=.2-_a1.y;U.aim={yaw:Math.atan2(dx,dz),pitch:Math.atan2(-dy,Math.hypot(dx,dz))}}
function nockWorld(){addSusanooBow();susanoo.userData.arrowMid.getWorldPosition(_wv);return _wv.clone()}
function animateSusanoo(dt){
  if(!susanoo)return;addSusanooBow();
  const U=susanoo.userData,t=performance.now()*.001;
  const warn=arrowWarnings.length>0,active=warn||arrows.length>0;
  U.raise+=((active?1:0)-U.raise)*Math.min(dt*(active?7:2.2),1);
  const rel=U.rel;U.rel=Math.max(0,rel-dt*2.2);
  if(!warn)U.pull+=(0-U.pull)*Math.min(dt*25,1);
  const R=U.raise*U.raise*(3-2*U.raise),pull=U.pull;
  susanoo.scale.setScalar(2.1);susanoo.position.set(0,Math.sin(t*.8)*.6,-128);susanoo.rotation.y=Math.sin(t*.3)*.04-R*.12;
  const bow=U.bow;bow.position.copy(BOW_C);
  bow.rotation.y+=(U.aim.yaw-bow.rotation.y)*Math.min(dt*6,1);bow.rotation.x+=(U.aim.pitch-bow.rotation.x)*Math.min(dt*6,1);
  const pd=pull*PULL_MAX+(pull>.95?Math.sin(t*40)*.18:0)+Math.sin(t*55)*rel*2.2;
  _a1.set(0,0,-pd);
  placeSeg(U.sU,_a2.set(0,BOW_R,0),_a1);placeSeg(U.sD,_a2.set(0,-BOW_R,0),_a1);
  U.nock.position.set(0,0,-pd);U.nock.visible=warn&&R>.35;U.nock.scale.setScalar(Math.min(1,Math.max(.01,(R-.35)/.45)));
  U.glow.material.opacity=.25+pull*.5+(pull>.95?Math.sin(t*30)*.1:0);
  // tangan: kiri memegang busur, kanan menarik tali
  susanoo.updateMatrixWorld(true);
  const shL=U.arms[0].position,shR=U.arms[1].position;
  const restL=new THREE.Vector3(shL.x-1,shL.y-18,1.5),restR=new THREE.Vector3(shR.x+1,shR.y-18,1.5);
  const actL=new THREE.Vector3(BOW_C.x+Math.sin(t*45)*.1*pull,BOW_C.y,BOW_C.z-.5);
  const actR=new THREE.Vector3(rel*3,rel*2.5,-pd-rel*8);bow.localToWorld(actR);susanoo.worldToLocal(actR);
  pointArm(U.arms[0],restL.lerp(actL,R));pointArm(U.arms[1],restR.lerp(actR,R));
  U.flames.forEach(f=>{const k=1+pull*.8;f.position.y=f.userData.baseY+Math.sin(t*4+f.userData.ph)*1.2;const s=(1+Math.sin(t*6+f.userData.ph)*.25)*k;f.scale.set(s,1.3*s,s)});
  const aura=susanoo.children.find(c=>c.geometry&&c.geometry.type==='SphereGeometry'&&c.geometry.parameters.radius===24);
  if(aura){aura.rotation.y+=dt*.3;aura.material.opacity=.1+Math.sin(t*3)*.05+pull*.12}
}
function updateArrowWarnings(dt){
  for(let i=arrowWarnings.length-1;i>=0;i--){
    const w=arrowWarnings[i];if(!w.aimed){setAim(w.targetX,w.targetZ);w.aimed=true}
    w.timer-=dt;const el=w.totalTime-w.timer,prog=Math.min(1,el/w.totalTime),pp=Math.min(1,Math.max(0,(el-.5)/1.4));
    susanoo.userData.pull=pp*pp*(3-2*pp);susanoo.userData.draw=susanoo.userData.pull;
    const pulse=1+Math.sin(performance.now()*.015)*.15,sf=.8+prog*.6;
    w.marker.scale.set(pulse*sf,pulse*sf,1);w.markerAura.scale.set(pulse*sf,pulse*sf,1);
    w.marker.material.opacity=.6+Math.sin(performance.now()*.02)*.3;w.markerAura.material.opacity=.2+prog*.3;
    if(el>.4){const np=nockWorld();
      for(let k=0;k<3;k++){const p=new THREE.Mesh(_tg,_tm[k%2]);p.scale.setScalar(2);p.position.set(np.x+(Math.random()-.5)*36,np.y+(Math.random()-.5)*36,np.z+(Math.random()-.5)*36);
        p.userData.vx=(np.x-p.position.x)*2.2;p.userData.vy=(np.y-p.position.y)*2.2;p.userData.vz=(np.z-p.position.z)*2.2;p.userData.life=.45;p.userData.ng=true;scene.add(p);particles.push(p)}}
    if(w.timer<=0){
      const np=nockWorld();
      fireArrow(np,new THREE.Vector3(w.targetX,.2,w.targetZ),w.lane);
      susanoo.userData.pull=0;susanoo.userData.draw=0;susanoo.userData.rel=1;
      const fl=new THREE.Mesh(new THREE.SphereGeometry(2,14,14),new THREE.MeshBasicMaterial({color:0xe8c8ff,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));fl.position.copy(np);scene.add(fl);rings.push({mesh:fl,scale:1,maxScale:7,life:.4});
      scene.remove(w.marker);scene.remove(w.markerAura);arrowWarnings.splice(i,1);
    }
  }
}

/* ---------- GAME LOOP v9 ---------- */
function updateGame(dt){
  if(dying){updateDying(dt);return}
  if(intro){updateIntro(dt);return}
  if(!cityExtraBuilt){addMoreCity();cityExtraBuilt=true}
  const scaledDt=dt*timeSlowFactor*(castT>0?.35:1),t=performance.now()*.001;
  if(stagger>0)stagger-=dt;if(bumpCD>0)bumpCD-=dt;
  const boost=activeSkillEffect==='speed_boost'?1.35:1;
  const targetSpeed=Math.min(SP_BASE+distance*SP_PER_M,SP_MAX)*boost;
  if(gameSpeed<targetSpeed)gameSpeed=Math.min(targetSpeed,gameSpeed+16*dt);else gameSpeed=targetSpeed;
  distance+=gameSpeed*scaledDt;
  dogChaseDistance-=(gameSpeed<14?2:.5)*dt;
  if(gameSpeed>=14&&dogChaseDistance<5.5)dogChaseDistance+=1.2*dt;
  if(dogChaseDistance>6)dogChaseDistance=6;
  dog.position.z=dogChaseDistance;dog.position.x+=(player.position.x-dog.position.x)*Math.min(dt*5,1);
  if(dogChaseDistance<3.5&&Math.random()<.05)sfxBark();
  if(dogChaseDistance<=1.2&&!wingsActive&&!hoverboardActive){startCrash();return}
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
  for(const o of obstacles){if(o.type==='train'&&o.hasRamp&&!o.moving&&Math.abs(o.mesh.position.x-player.position.x)<1.05){const z1=o.mesh.position.z,z0=o.prevZ===undefined?z1:o.prevZ,rl=o.rampLength;if(0>=Math.min(z0,z1)+6&&0<=Math.max(z0,z1)+6+rl){const ry=Math.min(1,Math.max(0,(z1+6+rl)/rl))*TRAIN_TOP;if(ry>=playerY-.05){playerY=Math.max(playerY,ry);playerVY=0;isJumping=false;onRamp=true}else rampGrace=.2}}}
  if(onRamp)rampGrace=.35;else if(rampGrace>0)rampGrace-=dt;
  if(wingsActive){playerY+=(8+Math.sin(t*3)*.3-playerY)*Math.min(dt*4,1);playerVY=0;isJumping=false}
  else if(!onRamp){
    const gy=getGroundY();
    if(isJumping||playerY>gy+.05){
      const kk=Math.min(3,Math.max(1,gameSpeed/SP_BASE));playerVY-=GRAVITY*dt*kk;if(glide>0&&playerVY<-6)playerVY=-6;
      playerY+=playerVY*dt*kk;
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
  const move=gameSpeed*scaledDt;roadTexture.offset.y=(roadTexture.offset.y-move*.04)%1;
  for(const b of cityB){b.position.z+=move;if(b.position.z>25)b.position.z-=CITY_LEN}
  if(starPts)starPts.rotation.y+=dt*.004;if(planetGrp)planetGrp.rotation.y+=dt*.0006;
  auroraMats.forEach(m=>m.uniforms.time.value=t);
  for(let i=obstacles.length-1;i>=0;i--){const o=obstacles[i];o.prevZ=o.mesh.position.z;o.mesh.position.z+=move+(o.speed||0)*scaledDt;if(o.sweep)o.mesh.position.x=Math.sin(t*1.7+o.phase)*2.8;if(o.mesh.position.z>20){scene.remove(o.mesh);obstacles.splice(i,1)}}
  for(let i=coins.length-1;i>=0;i--){const cn=coins[i];cn.mesh.position.z+=move;cn.mesh.rotation.y+=dt*5;if(cn.mesh.position.z>20){scene.remove(cn.mesh);coins.splice(i,1)}}
  for(let i=powerups.length-1;i>=0;i--){const p=powerups[i];p.mesh.position.z+=move;p.mesh.rotation.y+=dt*3;p.mesh.position.y=(p.type==='hoverboard'?.5:1)+Math.sin(t*3)*.2;if(p.mesh.position.z>20){scene.remove(p.mesh);powerups.splice(i,1)}}
  if(wingsActive)spawnFlyCoins(move);
  if(bossActive){}else if(susanoState===0){susanooNextAttack-=dt;if(susanooNextAttack<=0){susanoState=1;susWait=0}}
  else if(susanoState===1){susWait+=dt;if(canDodge()){spawnSusanooAttack();susanoState=2}else if(susWait>12){susanoState=0;susanooNextAttack=4}}
  else if(!arrowWarnings.length&&!arrows.length){susanoState=0;susanooNextAttack=9+Math.random()*5}
  holdSpawn=susanoState===2||bossActive;
  if(!holdSpawn&&distance>nextSpawnDistance){spawnPattern();nextSpawnDistance=distance+Math.max(24,gameSpeed)+Math.random()*8}
  for(let i=coins.length-1;i>=0;i--){const cn=coins[i],px=player.position.x,py=playerY+1;if(activeSkillEffect==='magnet'){const dx=px-cn.mesh.position.x,dy=py-cn.mesh.position.y,dz=-cn.mesh.position.z,d=Math.sqrt(dx*dx+dy*dy+dz*dz);if(d<8){cn.mesh.position.x+=dx*dt*8;cn.mesh.position.y+=dy*dt*8;cn.mesh.position.z+=dz*dt*8}}
    if(Math.abs(cn.mesh.position.z-PLAYER_Z)<1.3&&Math.abs(cn.mesh.position.x-px)<1&&Math.abs(cn.mesh.position.y-py)<1.5){gameCoins+=coinMultiplier;sfx('coin');spawnCoinBurst(cn.mesh.position.x,cn.mesh.position.y,cn.mesh.position.z);scene.remove(cn.mesh);coins.splice(i,1)}}
  for(let i=powerups.length-1;i>=0;i--){const p=powerups[i];if(Math.abs(p.mesh.position.z-PLAYER_Z)<1.4&&Math.abs(p.mesh.position.x-player.position.x)<1.2&&Math.abs(p.mesh.position.y-(playerY+1))<2){
    if(p.type==='boots'){bootsActive=true;bootsTimer=8;sfx('boots')}
    else if(p.type==='wings'){wingsActive=true;wingsTimer=7;sfx('wings');hoverboardActive=false;flyLane=currentLane;flyX=LANES[currentLane];flyAcc=0;flyCount=0}
    else if(p.type==='hoverboard'){hoverboardActive=true;hoverboardTimer=20;sfx('board')}
    updateStatusBar();scene.remove(p.mesh);powerups.splice(i,1)}}
  // tabrakan: depan = mati digigit anjing, samping = hanya terbentur
  if(!wingsActive&&invincibleTimer<=0&&!onRamp&&rampGrace<=0){
    for(let i=0;i<obstacles.length;i++){
      const o=obstacles[i];
      if(Math.abs(o.mesh.position.x-player.position.x)>.95)continue;
      {const z1=o.mesh.position.z,z0=o.prevZ===undefined?z1:o.prevZ,hh=o.length/2+.3;if(Math.max(z0,z1)<PLAYER_Z-hh||Math.min(z0,z1)>PLAYER_Z+hh)continue}
      const pTop=playerY+(isSliding?.9:1.8);let hit=false;
      if(o.type==='train'){if(!o.moving&&playerY>=TRAIN_TOP-.7)continue;hit=pTop>o.yBottom&&playerY<o.yTop}
      else if(o.type==='barrier')hit=playerY<o.yTop&&pTop>o.yBottom;
      else hit=pTop>o.yBottom&&playerY<o.yTop;
      if(!hit)continue;
      const wasIn=o.prevZ!==undefined&&Math.abs(o.prevZ-PLAYER_Z)<=o.length/2+.3;
      if(o.sweep||wasIn){doBump(o)}
      else if(hoverboardActive){hoverboardActive=false;invincibleTimer=1;spawnExplosion(o.mesh.position.x,1.5,o.mesh.position.z,0x00ffaa);scene.remove(o.mesh);obstacles.splice(i,1);shakeTime=.3;sfx('hit')}
      else startCrash();
      break;
    }
  }
  bossTick(dt);
  if(dying)return;
  cameraStep(dt,true);
  updateParticles(dt);updateRings(dt);updateArrowWarnings(dt);updateArrows(dt);updateHUD();updateStatusBar();updateSkillUI();
}
/* ================================================================
   V11: skill x4 + chakra, bos, intro anjing, anjing raksasa
   Suara: file mp3 di folder yang sama dengan index.html (lihat daftar nama).
   Jika file belum ada, otomatis pakai suara bawaan browser (TTS).
   ================================================================ */
const bossDbg=/boss/.test(location.search);
let boss=null,bossIdx=0,hazards=[],bossAtkT=0,shots=[],pending=null,castDur=.7,castOrb=null,skCD=[0,0,0,0],shieldT=0,shieldM=null,introHit=false,introAngry=false,swallowed=false;

/* ---------- SUARA ---------- */
function speakTTS(t,rate,pitch){try{const u=new SpeechSynthesisUtterance(t);u.lang='ja-JP';u.rate=rate||1.05;u.pitch=pitch||.9;speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}}
function playVoice(key,fb){
  if(musicMuted)return;let done=false;
  const f=()=>{if(done)return;done=true;if(typeof fb==='function')fb();else if(fb)speakTTS(fb)};
  try{const a=new Audio(key+'.mp3');a.volume=.95;a.addEventListener('error',f);const p=a.play();if(p&&p.catch)p.catch(f)}catch(e){f()}
}
function burp(){if(!audioCtx)return;const n=audioCtx.currentTime;playTone(110,n,.5,.5,'sawtooth');playTone(70,n+.1,.7,.5,'square');playTone(180,n+.5,.3,.3,'sine')}
function growl(){if(!audioCtx)return;const n=audioCtx.currentTime;playTone(90,n,.6,.45,'sawtooth');playTone(60,n+.05,.8,.45,'square');sfxBark();setTimeout(sfxBark,180)}

/* ---------- DATA SKILL: [nama, fx, chakra, cooldown, nilai, warna] ---------- */
const SK={
 naruto:[['Rasengan','bolt',25,5,30,0x00ccff],['Kage Bunshin','bolt3',35,8,22,0xffaa00],['Sage Mode','shield',30,12,3,0x66ff99],['Bijuu Dama','ultnova',100,35,150,0xff7700]],
 sasuke:[['Chidori','beam',30,6,45,0x8866ff],['Katon Gokakyu','bolt',25,5,28,0xff5500],['Susanoo Guard','shield',35,14,3.5,0xaa66ff],['Amaterasu','ultbeam',100,35,160,0x220033]],
 kakashi:[['Raikiri','dash',30,7,25,0x66aaff],['Kamui','shield',30,12,3,0x6666ff],['Raiton Wave','wave',35,9,22,0xaaccff],['Kamui Shuriken','ultrain',100,35,150,0x9966ff]],
 jiraya:[['Rasengan Besar','bolt',28,6,32,0xffaa44],['Fire Toad','wave',35,9,26,0xff6600],['Sage Koin','coin',25,12,6,0xffd34d],['Gamabunta Smash','ultnova',100,35,150,0xcc4400]],
 sakura:[['Shannaro','bolt',25,5,26,0xff88bb],['Cherry Punch','wave',30,7,30,0xff69b4],['Byakugou Heal','chakra',10,15,45,0x88ffcc],['Cherry Impact','ultbeam',100,35,150,0xff3388]],
 hinata:[['Juuken','bolt',20,4,24,0xddddff],['Hakke Rokujuuyon','wave',35,9,26,0xaaaaff],['Byakugan','magnet',25,12,5,0xeeeeff],['Twin Lion Fist','ultbeam',100,35,150,0x99aaff]],
 minato:[['Hiraishin','dash',30,7,25,0xffff00],['Rasengan Ni','bolt',25,5,30,0x44ccff],['Kunai Barrage','rain',40,10,24,0xffee66],['Hiraishin Barrage','ultrain',100,35,150,0xffff66]],
 madara:[['Katon','bolt',25,5,30,0xff4400],['Meteor','rain',45,12,28,0xcc3300],['Susanoo Shield','shield',35,12,4,0x9900ff],['Tengai Shinsei','ultnova',100,40,170,0xaa00ff]],
 itachi:[['Katon Hosenka','rain',35,9,20,0xff6633],['Tsukuyomi','slow',35,14,4,0xff0000],['Yata Mirror','shield',35,14,4,0xcc66ff],['Susanoo Totsuka','ultbeam',100,35,160,0x7733cc]],
 gaara:[['Sand Burial','bolt',25,5,28,0xddaa44],['Sand Shield','shield',30,10,4,0xccaa55],['Sand Tsunami','wave',35,9,30,0xeebb55],['Sabaku Taisou','ultnova',100,35,150,0xffcc66]],
 rocklee:[['Konoha Senpuu','dash',25,6,28,0x66ff66],['Eight Gates','haste',35,12,5,0xff2222],['Hidden Lotus','beam',40,8,50,0x44ff44],['Night Guy','ultbeam',100,35,160,0xff0000]],
 pain:[['Shinra Tensei','wave',30,8,35,0x88aaff],['Bansho Tenin','bolt',25,5,30,0xaa88ff],['Almighty Push','shield',30,12,3.5,0x6688ff],['Chibaku Tensei','ultnova',100,40,180,0x553388]]
};
const FXI={bolt:'destroy',bolt3:'destroy_all',beam:'speed_boost',wave:'destroy_all',shield:'invincible',haste:'speed_boost',dash:'teleport',slow:'slow',magnet:'magnet',coin:'coins_x3',rain:'destroy_all',chakra:'magnet',ultbeam:'speed_boost',ultrain:'destroy_all',ultnova:'invincible'};
const DS={bolt:v=>'Proyektil ke depan: hancurkan rintangan, '+v+' dmg bos (bos bisa menghindar).',bolt3:v=>'3 proyektil di 3 jalur, '+v+' dmg tiap kena.',beam:v=>'Laser lurus tak bisa dihindari: '+v+' dmg bos, hancurkan rintangan sejalur.',wave:v=>'Gelombang kejut: hancurkan rintangan 60 m dan '+v+' dmg bos.',shield:v=>'Perisai '+v+' detik: kebal dan pantulkan serangan bos.',haste:v=>'Lari 1,35x selama '+v+' detik.',dash:v=>'Melesat maju 40 m, hancurkan rintangan, '+v+' dmg bos.',slow:v=>'Waktu melambat '+v+' detik.',magnet:v=>'Tarik koin selama '+v+' detik.',coin:v=>'Koin x3 selama '+v+' detik.',rain:v=>'Hujan 6 proyektil, '+v+' dmg tiap kena.',chakra:v=>'Pulihkan '+v+' chakra.',ultbeam:v=>'ULT: 3 laser sekaligus, '+v+' dmg bos.',ultrain:v=>'ULT: 9 proyektil beruntun ke bos, total ~'+Math.round(v*1.3)+' dmg.',ultnova:v=>'ULT: ledakan besar '+v+' dmg + kebal 2,5 detik.'};
const descOf=s=>DS[s[1]](s[4])+' (Chakra '+s[2]+', CD '+s[3]+'s)';
CHARACTERS.forEach(c=>{c.desc=SK[c.id].map(s=>s[0]).join(', ');c.cooldown=SK[c.id][0][3]});

/* ---------- HUD: chakra, skill bar, bar bos ---------- */
{const st=document.createElement('style');st.textContent='#chk{position:absolute;top:104px;left:16px;width:150px;z-index:6;pointer-events:none;color:#9fe;font:700 10px sans-serif}#chk div,#bossBar div{height:9px;border-radius:5px;background:rgba(0,0,0,.55);overflow:hidden;border:1px solid rgba(255,255,255,.25)}#chkf{display:block;height:100%;width:100%;background:linear-gradient(90deg,#2ad,#8ff)}#bossBar{position:absolute;top:70px;left:50%;transform:translateX(-50%);width:56%;z-index:6;text-align:center;color:#fff;font:800 12px sans-serif;display:none;pointer-events:none}#bossF{display:block;height:100%;background:linear-gradient(90deg,#c00,#f64)}#skillBar{position:absolute;right:12px;bottom:96px;display:grid;grid-template-columns:repeat(2,58px);gap:8px;z-index:7}.sk4{position:relative;width:58px;height:58px;border-radius:50%;border:2px solid rgba(255,255,255,.5);background:rgba(20,10,40,.7);color:#fff;cursor:pointer;padding:0;overflow:hidden}.sk4.ult{border-color:#ffd34d;box-shadow:0 0 12px #ffb300}.sk4 span{display:flex;justify-content:center}.sk4 i{position:absolute;bottom:1px;left:0;right:0;font:700 9px sans-serif;font-style:normal;text-align:center}.sk4 u{position:absolute;inset:0;background:rgba(0,0,0,.6);transform-origin:bottom;transform:scaleY(0)}.sk4.off{opacity:.55}';document.head.appendChild(st)}
function ensureHud(){
  if(document.getElementById('chk'))return;const gs=document.getElementById('gameScreen');
  const w=document.createElement('div');w.id='chk';w.innerHTML='CHAKRA<div><span id="chkf"></span></div>';gs.appendChild(w);
  const b=document.createElement('div');b.id='bossBar';b.innerHTML='<span id="bossN"></span><div><span id="bossF"></span></div>';gs.appendChild(b);
}
function updateSkillButton(){
  if(!userData)return;const c=CHAR_MAP[userData.currentChar]||CHARACTERS[0],gs=document.getElementById('gameScreen');
  let bar=document.getElementById('skillBar');if(!bar){bar=document.createElement('div');bar.id='skillBar';gs.appendChild(bar)}
  bar.innerHTML='';
  SK[c.id].forEach((s,i)=>{const b=document.createElement('button');b.className='sk4'+(i===3?' ult':'');b.innerHTML='<span>'+skillSVG({id:c.id+i,skillColor:s[5],effect:FXI[s[1]]},34)+'</span><i>'+(i===3?'ULT':s[2])+'</i><u></u>';b.onclick=ev=>{ev.stopPropagation();useSkill(i)};bar.appendChild(b)});
  const ob=document.getElementById('skillBtn');if(ob)ob.style.display='none';
}
function updateSkillUI(){
  const f=document.getElementById('chkf');if(f)f.style.width=Math.max(0,chakra)+'%';
  const c=CHAR_MAP[userData.currentChar]||CHARACTERS[0];
  document.querySelectorAll('#skillBar .sk4').forEach((b,i)=>{const s=SK[c.id][i];b.querySelector('u').style.transform='scaleY('+(skCD[i]>0?skCD[i]/s[3]:0)+')';b.classList.toggle('off',skCD[i]>0||chakra<s[2])});
  const bb=document.getElementById('bossBar');if(bb){bb.style.display=boss?'block':'none';if(boss){document.getElementById('bossN').textContent=boss.d.name;document.getElementById('bossF').style.width=Math.max(0,boss.hp/boss.max*100)+'%'}}
}
function endSkill(){coinMultiplier=1;timeSlowFactor=1;activeSkillEffect=null;skillActiveTimer=0}
document.addEventListener('keydown',e=>{const m={'1':0,'2':1,'3':2,'4':3,'e':1,'r':2,'f':3}[e.key.toLowerCase()];if(m!==undefined)useSkill(m)});

/* ---------- CAST: ucapan jurus + hand seal + pose ---------- */
function useSkill(i){
  if(!gameRunning||gamePaused||dying||intro||castT>0)return;
  const c=CHAR_MAP[userData.currentChar]||CHARACTERS[0],s=SK[c.id][i];if(skCD[i]>0||chakra<s[2])return;
  initAudio();if(audioCtx&&audioCtx.state!=='running')audioCtx.resume();
  chakra-=s[2];skCD[i]=s[3];castT=castDur=i===3?1:.7;pending={c,s,i};invincibleTimer=Math.max(invincibleTimer,castT+.25);
  playVoice('jutsu-'+c.id+'-'+(i+1),s[0]+'!');triggerFlash(s[5]);showSkillToast({skillName:s[0],desc:descOf(s)});
  castOrb=new THREE.Mesh(new THREE.SphereGeometry(.9,16,16),new THREE.MeshBasicMaterial({color:s[5],transparent:true,opacity:.45,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(castOrb);
  if(audioCtx&&!musicMuted){const n=audioCtx.currentTime;playTone(220,n,.5,.12,'sawtooth');playTone(440,n+.2,.4,.1,'sine')}
}
function activateSkill(){useSkill(0)}
function castPose(a){
  const p=1-castT/castDur,b=a.bodyGroup,fx=pending?pending.s[1]:'bolt';
  b.position.set(0,0,0);a.legL.position.x=-.2;a.legR.position.x=.2;a.legL.rotation.set(.1,0,-.2);a.legR.rotation.set(-.1,0,.2);
  if(p<.6){const q=[[-1.9,.9,-1.9,-.9],[-1.6,.5,-2.2,-.4],[-2.1,.3,-1.5,-.8]][Math.floor(p*16)%3];b.rotation.set(.18,0,0);a.armL.rotation.set(q[0],0,q[1]);a.armR.rotation.set(q[2],0,q[3])}
  else if(/shield/.test(fx)){b.rotation.set(-.1,0,0);a.armL.rotation.set(-2.8,0,.5);a.armR.rotation.set(-2.8,0,-.5)}
  else if(/haste|dash/.test(fx)){b.rotation.set(.8,0,0);a.armL.rotation.set(1.5,0,0);a.armR.rotation.set(1.5,0,0)}
  else if(/^ult/.test(fx)){b.rotation.set(-.2,0,0);a.armL.rotation.set(-3,0,.3);a.armR.rotation.set(-3,0,-.3)}
  else{b.rotation.set(.3,0,0);a.armR.rotation.set(-1.55,0,-.1);a.armL.rotation.set(.6,0,.4)}
}
function explodeObs(o,col){spawnExplosion(o.mesh.position.x,1.5,o.mesh.position.z,col);scene.remove(o.mesh)}
function clearObs(range,col,x){for(let i=obstacles.length-1;i>=0;i--){const o=obstacles[i],z=o.mesh.position.z;if(z>-range&&z<5&&(x===undefined||Math.abs(o.mesh.position.x-x)<1.3)){explodeObs(o,col);obstacles.splice(i,1)}}}
function fxCol(x,y,h,r,col,life){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r*1.4,h,14,1,true),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));m.position.set(x,y,-1);scene.add(m);rings.push({mesh:m,scale:1,life})}
function bossHit(d,melee){
  if(!boss)return;boss.hp-=d;boss.flash=.15;spawnExplosion(boss.x,boss.y+1.5,boss.z,boss.d.col);sfx('hit');
  if(boss.hp<=0)bossDefeat();
}
function fireShot(x,dmg,col,size,nd){
  const m=new THREE.Group();
  m.add(new THREE.Mesh(new THREE.SphereGeometry(.55*size,12,12),new THREE.MeshBasicMaterial({color:0xffffff})));
  m.add(new THREE.Mesh(new THREE.SphereGeometry(1.1*size,12,12),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false})));
  m.position.set(x,1.4,-1.5);scene.add(m);shots.push({m,x,dmg,col,nd,vz:-85});
  if(boss&&!boss.enter&&boss.dodgeCD<=0&&!nd&&Math.abs(boss.x-x)<1.8&&Math.random()<.5){boss.dodgeCD=1.8;boss.dodgeIn=.08}
}
function updateShots(dt){
  for(let i=shots.length-1;i>=0;i--){
    const s=shots[i];s.m.position.z+=s.vz*dt;s.m.rotation.y+=dt*8;let dead=false;
    for(let j=obstacles.length-1;j>=0;j--){const o=obstacles[j];if(o.mesh.position.z<2&&Math.abs(o.mesh.position.x-s.x)<1.2&&Math.abs(o.mesh.position.z-s.m.position.z)<o.length/2+.6){explodeObs(o,s.col);obstacles.splice(j,1);dead=true;break}}
    if(!dead&&boss&&Math.abs(boss.x-s.x)<1.8&&s.m.position.z<=boss.z+2){bossHit(s.dmg);dead=true}
    if(dead||s.m.position.z<-130){scene.remove(s.m);shots.splice(i,1)}
  }
}
function doBeam(x,dmg,col,huge){
  const m=new THREE.Mesh(new THREE.BoxGeometry(huge?2.2:1,huge?2.2:1,120),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));
  m.position.set(x,1.3,-61);scene.add(m);rings.push({mesh:m,scale:1,life:.5});
  clearObs(120,col,x);if(boss&&Math.abs(boss.x-x)<1.8)bossHit(dmg);
}
function doWave(dmg,col){
  const r=new THREE.Mesh(new THREE.TorusGeometry(1,.3,8,40),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));r.rotation.x=Math.PI/2;r.position.set(player.position.x,.3,0);scene.add(r);rings.push({mesh:r,scale:1,maxScale:30,life:.8});
  clearObs(60,col);if(boss)bossHit(dmg);
}
function bossLaneX(){return boss?LANES[Math.min(2,Math.max(0,Math.round(boss.x/2.2)+1))]:LANES[Math.floor(Math.random()*3)]}
function resolveSkill(p){
  const [nm,fx,cost,cd,v,col]=p.s;shakeTime=.35;
  if(audioCtx&&!musicMuted){const n=audioCtx.currentTime;playTone(300,n,.15,.2,'sawtooth');playTone(120,n,.4,.35,'sine')}
  if(fx==='bolt')fireShot(LANES[currentLane],v,col,1);
  else if(fx==='bolt3')[0,1,2].forEach(l=>fireShot(LANES[l],v,col,.9));
  else if(fx==='rain'){for(let k=0;k<6;k++)setTimeout(()=>{if(gameRunning&&!dying)fireShot(boss&&Math.random()<.6?bossLaneX():LANES[Math.floor(Math.random()*3)],v,col,.8)},k*130)}
  else if(fx==='beam')doBeam(LANES[currentLane],v,col,false);
  else if(fx==='wave')doWave(v,col);
  else if(fx==='shield'){invincibleTimer=Math.max(invincibleTimer,v);shieldT=v;shieldM=shieldM||new THREE.Mesh(new THREE.SphereGeometry(1.7,20,16),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.3,blending:THREE.AdditiveBlending,depthWrite:false}));shieldM.material.color.setHex(col);scene.add(shieldM)}
  else if(fx==='haste'){activeSkillEffect='speed_boost';skillActiveTimer=v}
  else if(fx==='dash'){distance+=40;clearObs(50,col);invincibleTimer=Math.max(invincibleTimer,1.2);if(boss)bossHit(v,true)}
  else if(fx==='slow'){timeSlowFactor=.45;activeSkillEffect='slow';skillActiveTimer=v}
  else if(fx==='magnet'){activeSkillEffect='magnet';skillActiveTimer=v}
  else if(fx==='coin'){coinMultiplier=3;activeSkillEffect='coins_x3';skillActiveTimer=v}
  else if(fx==='chakra')chakra=Math.min(100,chakra+v);
  else if(fx==='ultbeam')[0,1,2].forEach(l=>doBeam(LANES[l],v,col,true));
  else if(fx==='ultrain'){for(let k=0;k<9;k++)setTimeout(()=>{if(gameRunning&&!dying)fireShot(boss?bossLaneX():LANES[k%3],v/7,col,.9,true)},k*110)}
  else if(fx==='ultnova'){doWave(v,col);invincibleTimer=Math.max(invincibleTimer,2.5)}
  spawnSkillVFX({id:p.c.id,skillColor:col});
}

/* ---------- BOS ---------- */
const BOSSES=[
 {id:'pain',name:'PAIN',hp:160,col:0xff8800,outfit:0x222222,hair:0xff8800,hairType:'spiky',acc:'rinnegan',eye:0x9900cc,at:[['Shinra Tensei','quake'],['Bansho Tenin','strike2'],['Chibaku Tensei','strike3'],['Rod Barrage','arrows']]},
 {id:'obito',name:'OBITO',hp:240,col:0xff3300,outfit:0x2a1a1a,hair:0x1a1a1a,hairType:'spiky',acc:'mask',eye:0xcc0000,at:[['Kamui','strike2'],['Katon Gokakyu','fire'],['Kunai Barrage','arrows'],['Kamui Shuriken','laser']]},
 {id:'madara',name:'MADARA',hp:340,col:0x9900ff,outfit:0x7a1a1a,hair:0x1a1a1a,hairType:'long',acc:'sharingan',eye:0xcc0000,at:[['Susanoo Ya','arrows'],['Meteor','strike3'],['Katon Housenka','fire'],['Susanoo Ken','slash']]},
 {id:'kaguya',name:'KAGUYA',hp:460,col:0xaaccff,outfit:0xeeeeff,hair:0xffffff,hairType:'long',acc:'byakugan',eye:0xaa88ff,at:[['Ootsutsuki Beam','laser'],['Gempa Gouka','quake'],['Bone Blade','slash'],['Kaguya Orbs','strike3']]},
 {id:'kaguya',name:'KAGUYA MENGAMUK',hp:700,col:0xff66cc,outfit:0xffddee,hair:0xffffff,hairType:'long',acc:'byakugan',eye:0xff4488,fast:1.5,at:[['Ootsutsuki Beam','laser'],['Gempa Gouka','quake'],['Bone Blade','slash'],['Kaguya Orbs','strike3']]}
];
const BOSS_AT=[5000,10000,15000,20000,30000],bossAt=i=>bossDbg?300*(i+1):BOSS_AT[i];
function spawnBoss(){
  const d=BOSSES[bossIdx];
  const g=buildCharacter({id:d.id,outfit:d.outfit,hair:d.hair,skin:0xffe0c8,hairType:d.hairType,acc:d.acc,eyeColor:d.eye,skillColor:d.col});
  g.rotation.y=0;g.scale.setScalar(2.2);
  const au=new THREE.Mesh(new THREE.SphereGeometry(2.6,20,16),new THREE.MeshBasicMaterial({color:d.col,transparent:true,opacity:.18,blending:THREE.AdditiveBlending,depthWrite:false}));au.position.y=1.5;g.add(au);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.2,.08,8,40),new THREE.MeshBasicMaterial({color:d.col}));ring.position.y=1.4;ring.rotation.x=Math.PI/2;g.add(ring);
  if(d.id==='kaguya')[-1,1].forEach(s=>{const h=new THREE.Mesh(new THREE.ConeGeometry(.12,.5,8),new THREE.MeshStandardMaterial({color:0xffffff}));h.position.set(s*.16,2.05,.1);h.rotation.z=-s*.3;g.add(h)});
  g.position.set(0,5,-90);scene.add(g);
  boss={g,x:0,tx:0,y:5,z:-90,hp:d.hp,max:d.hp,d,dodgeCD:0,dodgeIn:-1,laneT:2,flash:0,au,ring,enter:true};
  bossActive=true;hazards.length=0;bossAtkT=3;
  showSkillToast({skillName:'BOS: '+d.name,desc:'Kalahkan dengan skill & perisai! Hindari serangannya.'});
  playVoice('boss-'+d.id+'-intro',d.name);
}
function bossDefeat(){
  const b=boss;for(let k=0;k<4;k++)setTimeout(()=>spawnBigExplosion(b.x+(Math.random()-.5)*3,b.y+1,b.z,b.d.col),k*200);
  scene.remove(b.g);boss=null;bossActive=false;hazards.forEach(h=>{if(h.m)scene.remove(h.m)});hazards.length=0;
  const bonus=100*(bossIdx+1);gameCoins+=bonus;bossIdx++;showSkillToast({skillName:'BOS KALAH!',desc:'+'+bonus+' koin'});sfx('wings');
}
function bm(geo,col,op){return new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}))}
function hzStrike(lane,delay,fire){
  const m=bm(new THREE.RingGeometry(1,1.6,24),0xff2222,.8);m.rotation.x=-Math.PI/2;m.position.set(LANES[lane],.1,-1);scene.add(m);
  hazards.push({k:'strike',lane,t:delay,fire,m,linger:0,hit:false});
}
function hazHit(){
  if(wingsActive||dying)return;
  if(shieldT>0){bossHit(14,true);return}
  if(invincibleTimer>0)return;
  doBump(null);chakra=Math.max(0,chakra-15);
}
function bossAttack(at,idx){
  const d=boss.d,f=d.fast||1,k=at[1];
  playVoice('boss-'+d.id+'-'+(idx+1),at[0]);
  showSkillToast({skillName:d.name+': '+at[0],desc:'Pindah jalur, lompat, tunduk, atau pakai perisai!'});
  const R=()=>Math.floor(Math.random()*3);
  if(k==='strike2'){const l=[0,1,2].sort(()=>Math.random()-.5);hzStrike(l[0],1/f);hzStrike(l[1],1/f)}
  else if(k==='strike3'){for(let q=0;q<3;q++)hzStrike(R(),(.8+q*.45)/f)}
  else if(k==='arrows'){const s=R();for(let q=0;q<4;q++)hzStrike((s+q)%3,(.7+q*.35)/f)}
  else if(k==='fire'){const o=R();[0,1,2].forEach(l=>{if(l!==o)hzStrike(l,1.1/f,true)})}
  else if(k==='quake'){const m=bm(new THREE.PlaneGeometry(9,6),0xff2222,.4);m.rotation.x=-Math.PI/2;m.position.set(0,.1,-1);scene.add(m);hazards.push({k:'quake',t:.9/f,m})}
  else if(k==='slash'){const m=bm(new THREE.PlaneGeometry(9,.5),0xff2222,.7);m.position.set(0,1.4,-1);scene.add(m);hazards.push({k:'slash',t:.9/f,m})}
  else if(k==='laser'){const th=(Math.random()<.5?-1:1)*.35,m=bm(new THREE.BoxGeometry(.5,.5,90),0xff2222,.5);m.rotation.y=th;m.position.set(0,.6,-30);scene.add(m);hazards.push({k:'laser',t:2.2/f,tot:2.2/f,tel:.8/f,th,m,dir:Math.random()<.5?1:-1})}
}
function updateHazards(dt){
  for(let i=hazards.length-1;i>=0;i--){
    const h=hazards[i];h.t-=dt;let done=false;
    if(h.k==='strike'){
      if(h.linger>0){h.linger-=dt;if(!h.hit&&Math.abs(player.position.x-LANES[h.lane])<1&&playerY<1.2){h.hit=true;hazHit()}if(h.linger<=0)done=true}
      else{h.m.scale.setScalar(1+Math.sin(performance.now()*.02)*.1+(1-h.t)*.2);
        if(h.t<=0){fxCol(LANES[h.lane],11,22,1.2,boss?boss.d.col:0xff5500,h.fire?.9:.45);spawnExplosion(LANES[h.lane],1,-1,boss?boss.d.col:0xff5500);shakeTime=.2;scene.remove(h.m);h.m=null;
          if(h.fire)h.linger=.8;else{if(Math.abs(player.position.x-LANES[h.lane])<1&&playerY<1.6)hazHit();done=true}}}
    }else if(h.k==='quake'){h.m.material.opacity=.3+Math.sin(performance.now()*.03)*.15;
      if(h.t<=0){const r=new THREE.Mesh(new THREE.TorusGeometry(1,.3,8,40),new THREE.MeshBasicMaterial({color:0xffaa44,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));r.rotation.x=Math.PI/2;r.position.set(0,.3,-1);scene.add(r);rings.push({mesh:r,scale:1,maxScale:14,life:.7});shakeTime=.4;sfx('hit');if(playerY<.35)hazHit();done=true}}
    else if(h.k==='slash'){if(h.t<=0){fxCol(0,1.4,.4,5,0xffffff,.3);shakeTime=.25;if(!isSliding&&playerY<2.2)hazHit();done=true}}
    else if(h.k==='laser'){const e=h.tot-h.t;
      if(e<h.tel){h.m.material.opacity=.25+Math.sin(performance.now()*.03)*.15;h.m.scale.x=.4}
      else{const p=Math.min(1,(e-h.tel)/(h.tot-h.tel)),x=(-4+8*p)*h.dir,xc=x-30*Math.tan(h.th);h.m.position.x=xc;h.m.material.opacity=.9;h.m.scale.x=2;if(Math.abs(x-player.position.x)<.9&&playerY<1)hazHit()}
      if(h.t<=0)done=true}
    if(done){if(h.m)scene.remove(h.m);hazards.splice(i,1)}
  }
}
function updateBoss(dt){
  if(!boss){if(bossIdx<BOSSES.length&&distance>=bossAt(bossIdx)&&susanoState===0&&!dying&&!intro)spawnBoss();return}
  const b=boss,t=performance.now()*.001;b.dodgeCD-=dt;
  if(b.enter){b.z+=(-26-b.z)*Math.min(dt*1.6,1);if(b.z>-27)b.enter=false}
  if(b.dodgeIn>=0){b.dodgeIn-=dt;if(b.dodgeIn<0){const o=[0,1,2].filter(l=>Math.abs(LANES[l]-b.x)>.5);b.tx=LANES[o[Math.floor(Math.random()*o.length)]];b.dodgeIn=-1}}
  b.laneT-=dt;if(b.laneT<=0){b.laneT=2.2+Math.random()*1.5;b.tx=Math.random()<.5?LANES[currentLane]:LANES[Math.floor(Math.random()*3)]}
  b.x+=(b.tx-b.x)*Math.min(dt*9,1);b.y=5+Math.sin(t*1.6)*.5;
  b.g.position.set(b.x,b.y,b.z);b.g.rotation.z=(b.tx-b.x)*.12;b.ring.rotation.z+=dt*2;
  b.flash=Math.max(0,b.flash-dt);b.au.material.opacity=.18+(b.flash>0?.5:0);
  const a=b.g.userData.anim;if(a){a.bodyGroup.rotation.set(0,0,0);a.armL.rotation.set(-1.2,0,-.9+Math.sin(t*2)*.1);a.armR.rotation.set(-1.2,0,.9-Math.sin(t*2)*.1);a.legL.rotation.set(.15,0,0);a.legR.rotation.set(.15,0,0)}
  if(!b.enter){bossAtkT-=dt*(b.d.fast||1);if(bossAtkT<=0){const ix=Math.floor(Math.random()*b.d.at.length);bossAttack(b.d.at[ix],ix);bossAtkT=2.8+Math.random()*1.2}}
  updateHazards(dt);
}

/* ---------- ANJING: marah (api), intro, raksasa menelan ---------- */
function ensureDogFire(){
  if(!dog||dog.userData.fireG)return;const g=new THREE.Group();
  for(let i=0;i<16;i++){const c=new THREE.Mesh(new THREE.ConeGeometry(.12+Math.random()*.1,.5+Math.random()*.5,6),new THREE.MeshBasicMaterial({color:i%2?0xff5500:0xffcc00,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false}));c.position.set((Math.random()-.5)*.6,.5+Math.random()*.7,(Math.random()-.5)*1.2);c.userData.b=c.position.y;c.userData.p=Math.random()*6;g.add(c)}
  g.visible=false;dog.add(g);dog.userData.fireG=g;
}
function dogAngry(on){
  dog.scale.setScalar(on?1.8:1);dog.userData.fireG.visible=on;
  dog.traverse(o=>{if(o.material&&o.material.emissive&&o.material.color&&o.material.color.getHex()!==0x222222&&!o.material.transparent){o.material.emissive.setHex(on?0xcc2200:0);o.material.emissiveIntensity=on?.8:0}});
}
function dogFx(){const g=dog&&dog.userData.fireG;if(!g||!g.visible)return;const t=performance.now()*.001;g.children.forEach(c=>{c.position.y=c.userData.b+Math.sin(t*10+c.userData.p)*.12;c.scale.y=1+Math.sin(t*14+c.userData.p)*.3})}
function introPose(a){
  const T=introT,b=a.bodyGroup;b.position.set(0,0,0);a.legL.position.x=-.14;a.legR.position.x=.14;a.legL.rotation.set(0,0,0);a.legR.rotation.set(0,0,0);
  if(T<.5){b.rotation.set(.1,0,0);a.armL.rotation.set(-1,0,.4);a.armR.rotation.set(-1.2,0,-.4)}
  else if(T<.85){b.rotation.set(0,-.5,0);a.armL.rotation.set(-1,0,.4);a.armR.rotation.set(.9,0,0)}
  else if(T<1.1){b.rotation.set(.25,.4,0);a.armR.rotation.set(-1.55,0,0);a.armL.rotation.set(.5,0,.3)}
  else if(T<1.8){b.rotation.set(0,0,0);a.armL.rotation.set(0,0,-.1);a.armR.rotation.set(0,0,.1)}
  else{b.rotation.set(.52,0,0);a.armL.rotation.set(1.35,0,0);a.armR.rotation.set(1.35,0,0)}
}
function updateIntro(dt){
  introT+=dt;const T=introT;
  animateDog(dt);
  const face=T<.5?T/.5:(T<1.7?1:Math.max(0,1-(T-1.7)/.4));player.rotation.y=Math.PI*(1-face);
  if(T<.5){dog.position.z+=(1.8-dog.position.z)*Math.min(dt*6,1);if(Math.random()<.08)sfxBark()}
  if(T>.85&&!introHit){introHit=true;sfx('hit');shakeTime=.3;spawnExplosion(0,1.2,1.2,0xffffff)}
  if(introHit&&T<1.4){const k=Math.min(1,(T-.85)/.5);dog.position.z=1.8+3*Math.sin(k*Math.PI/2);dog.position.y=Math.sin(k*Math.PI)*1.2}
  if(T>1.1&&!introAngry){introAngry=true;dogAngry(true);dog.scale.setScalar(1);playVoice('anjing-marah',growl)}
  if(introAngry){const g=Math.min(1,(T-1.1)/.5);dog.scale.setScalar(1+.8*g);dog.position.z+=(dogChaseDistance-dog.position.z)*Math.min(dt*3,1)}
  animateCharacter(dt);dogFx();if(T>1.4)dog.position.y=0;
  if(starPts)starPts.rotation.y+=dt*.004;auroraMats.forEach(m=>m.uniforms.time.value=performance.now()*.001);
  cameraStep(dt,false);updateParticles(dt);updateRings(dt);
  if(T>2.2){intro=false;player.rotation.y=Math.PI;dog.position.set(0,0,dogChaseDistance)}
}
function swallowStep(dt){
  const T=dyingT,g=Math.min(1,Math.max(0,(T-.3)/1)),sc=1.8+g*6;
  dog.scale.setScalar(sc);dog.position.z=dogChaseDistance*(1-g)+1.2*sc*g;dog.position.x+=(player.position.x-dog.position.x)*Math.min(dt*8,1);
  dog.rotation.x=-.7*g;dog.position.y=0;if(dog.userData.fireG)dog.userData.fireG.visible=true;dogFx();
  camera.position.z=9+g*5;
  if(T>.3&&!biteDone){biteDone=true;sfx('bite');playVoice('anjing-marah',growl)}
  const sw=Math.min(1,Math.max(0,(T-1.2)/.8));
  if(sw>0){const mz=dog.position.z-1.17*sc,k=Math.min(1,sw*.3+dt*4);player.position.x+=(dog.position.x-player.position.x)*k;player.position.z+=(mz-player.position.z)*k;player.position.y+=(.5-player.position.y)*k;player.scale.setScalar(Math.max(.02,1-sw));player.visible=sw<1}
  if(sw>=1&&!swallowed){swallowed=true;shakeTime=.5;playVoice('anjing-kenyang',burp)}
  if(swallowed)dog.scale.setScalar(sc*(1+Math.sin((T-2)*14)*.04));
}

/* ---------- TICK UTAMA ---------- */
function bossTick(dt){
  chakra=Math.min(100,chakra+6*dt);for(let i=0;i<4;i++)skCD[i]=Math.max(0,skCD[i]-dt);
  if(castT>0){castT-=dt;if(castOrb){castOrb.position.set(player.position.x,playerY+1.1,0);castOrb.scale.setScalar(1+(1-castT/castDur)*2.2)}
    if(castT<=0){if(castOrb){scene.remove(castOrb);castOrb=null}if(pending){const p=pending;pending=null;resolveSkill(p)}}}
  if(shieldM){if(shieldT>0){shieldT-=dt;shieldM.position.set(player.position.x,playerY+1,0);shieldM.scale.setScalar(1+Math.sin(performance.now()*.01)*.06)}else{scene.remove(shieldM)}}
  updateShots(dt);updateBoss(dt);dogFx();
}
{const _ac2=animateCharacter;animateCharacter=function(dt){
  const a=player.userData.anim;if(!a)return;
  if(intro){introPose(a);return}
  if(castT>0&&!dying){castPose(a);return}
  _ac2(dt);
}}
{const _rg3=resetGameState;resetGameState=function(){
  _rg3();chakra=100;castT=0;pending=null;skCD=[0,0,0,0];shieldT=0;shots.forEach(s=>scene.remove(s.m));shots.length=0;
  if(castOrb){scene.remove(castOrb);castOrb=null}if(shieldM)scene.remove(shieldM);
  if(boss){scene.remove(boss.g);boss=null}hazards.forEach(h=>{if(h.m)scene.remove(h.m)});hazards.length=0;bossActive=false;bossIdx=0;swallowed=false;
  if(camera)camera.position.z=9;if(player){player.visible=true;player.scale.setScalar(1)}
  if(dog){dog.rotation.set(0,0,0);dog.position.y=0}
}}
{const _sg2=startGame;startGame=function(r){
  _sg2(r);ensureHud();ensureDogFire();updateSkillButton();
  if(!r){intro=true;introT=0;introHit=false;introAngry=false;dogAngry(false);dog.position.set(0,0,6);player.rotation.y=Math.PI}
  else{intro=false;dogAngry(true)}
}}
/* ================================================================
   V12: MODEL BOS KHUSUS (Pain, Obito, Madara, Kaguya)
   ================================================================ */
const TH=THREE;
const MT=(c,e,o)=>new TH.MeshStandardMaterial(Object.assign({color:c,emissive:e||0,emissiveIntensity:e?1.2:0,roughness:.5,metalness:.2},o||{}));
const AB=(c,o)=>new TH.MeshBasicMaterial({color:c,transparent:true,opacity:o,blending:TH.AdditiveBlending,depthWrite:false,side:TH.DoubleSide});
function Pp(geo,mat,x,y,z,par,rx,ry,rz){const m=new TH.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.set(rx||0,ry||0,rz||0);m.castShadow=true;par.add(m);return m}
function humanoid(o){
  const g=new TH.Group(),skin=MT(o.skin||0xffe0c8,0,{roughness:.7}),cloth=MT(o.cloth,o.cE);
  Pp(new TH.CylinderGeometry(.34,.27,.95,16),cloth,0,1.3,0,g);
  const head=new TH.Group();head.position.set(0,1.95,0);g.add(head);
  Pp(new TH.SphereGeometry(.27,24,20),skin,0,0,0,head).scale.set(1,1.08,1);
  Pp(new TH.CylinderGeometry(.1,.12,.2,10),skin,0,1.78,0,g);
  const arms=[-1,1].map(s=>{const a=new TH.Group();a.position.set(s*.46,1.65,0);g.add(a);
    Pp(new TH.SphereGeometry(.14,10,10),cloth,0,0,0,a);Pp(new TH.CylinderGeometry(.09,.075,.8,10),MT(o.sleeve||o.cloth),0,-.4,0,a);Pp(new TH.SphereGeometry(.09,10,10),skin,0,-.84,0,a);return a});
  return{g,head,arms};
}
function spikes(par,mat,n,r,y,len,w,bk){
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2,c=Pp(new TH.ConeGeometry(w,len*(.7+Math.random()*.6),7),mat,Math.cos(a)*r,y,Math.sin(a)*r-(bk||0),par);c.rotation.z=-Math.cos(a)*.9;c.rotation.x=Math.sin(a)*.9+(bk?-.3:0)}
}
function eyes(head,kind,col,y,z,sep){
  [-1,1].forEach(s=>{
    Pp(new TH.SphereGeometry(.07,12,12),MT(0xffffff),s*sep,y,z,head).scale.set(1,1.15,.5);
    if(kind==='rinne')[.05,.035,.02].forEach((r,i)=>Pp(new TH.TorusGeometry(r,.007,6,18),AB(col,1),s*sep,y,z+.035,head));
    else{const ir=Pp(new TH.SphereGeometry(.048,12,12),MT(col,col),s*sep,y,z+.03,head);ir.scale.z=.5}
  });
}
function auraOf(g,col,y){
  const au=Pp(new TH.SphereGeometry(1.7,20,16),AB(col,.18),0,y,0,g);
  const ring=Pp(new TH.TorusGeometry(1.5,.04,8,48),new TH.MeshBasicMaterial({color:col}),0,y-.1,0,g,Math.PI/2);
  return{au,ring};
}

/* ----- PAIN: jubah Akatsuki, rambut oranye, piercing, Rinnegan, batang hitam melayang ----- */
function mkPain(){
  const {g,head,arms}=humanoid({cloth:0x15151a});
  Pp(new TH.CylinderGeometry(.5,.9,1.6,20,1,true),MT(0x15151a,0,{side:TH.DoubleSide}),0,.75,0,g);
  for(let i=0;i<5;i++)Pp(new TH.SphereGeometry(.1,10,8),MT(0xcc1111,0x550000),(i%2?.28:-.28),.5+i*.28,.5-i*.02,g).scale.set(1.5,.9,.3);
  const hair=MT(0xff7a00,0x331100);spikes(head,hair,16,.2,.22,.5,.09);spikes(head,hair,6,.12,.18,.45,.08,.1);
  const sil=MT(0xdddddd,0,{metalness:.9});
  for(let i=0;i<6;i++)Pp(new TH.CylinderGeometry(.012,.012,.07,6),sil,(i-2.5)*.045,-.02+Math.sin(i*1.3)*.04,.265,head,Math.PI/2);
  for(const s of [-1,1])for(let j=0;j<3;j++)Pp(new TH.SphereGeometry(.018,8,8),sil,s*.268,-.02+j*.04,0,head);
  eyes(head,'rinne',0x9966ff,.03,.235,.095);
  const rods=new TH.Group();rods.position.set(0,1.5,-.55);g.add(rods);
  for(let i=0;i<6;i++){const r=new TH.Group();r.rotation.z=i/6*Math.PI*2;rods.add(r);Pp(new TH.CylinderGeometry(.03,.03,1.5,6),MT(0x222222,0x222244),0,.9,0,r);Pp(new TH.ConeGeometry(.05,.25,6),MT(0x333333),0,1.75,0,r)}
  const halo=Pp(new TH.TorusGeometry(1.2,.03,8,48),AB(0x88aaff,.7),0,1.5,-.2,g);
  arms[0].rotation.set(-.4,0,-.9);arms[1].rotation.set(-.4,0,.9);
  return{g,col:0xff8800,anim:t=>{rods.rotation.z=t*.7;const p=(t*1.2)%1;halo.scale.setScalar(1+p*.5);halo.material.opacity=.7*(1-p)}};
}

/* ----- OBITO: topeng spiral oranye, satu lubang Sharingan, pusaran Kamui, gunbai ----- */
function mkObito(){
  const {g,head,arms}=humanoid({cloth:0x1d1d28});
  Pp(new TH.CylinderGeometry(.5,.8,1.5,20,1,true),MT(0x1d1d28,0,{side:TH.DoubleSide}),0,.8,0,g);
  arms[1].children[1].material=MT(0xeeeeee,0,{roughness:.9});
  [-1,1].forEach(s=>{for(let i=0;i<3;i++)Pp(new TH.ConeGeometry(.06,.35,6),MT(0x2a2a38),s*(.5+i*.1),1.88,0,g,0,0,-s*(.5+i*.3))});
  const mask=Pp(new TH.SphereGeometry(.285,24,16,0,Math.PI*2,0,Math.PI*.55),MT(0xe8731a,0x331100),0,0,0,head,Math.PI/2);mask.scale.set(1,1.1,1);
  [[.08,.275],[.15,.246],[.22,.185]].forEach(([r,z])=>Pp(new TH.TorusGeometry(r,.01,6,28),MT(0x222222),0,0,z,head));
  Pp(new TH.TorusGeometry(.055,.012,8,20),MT(0x000000),.09,.04,.268,head);
  Pp(new TH.SphereGeometry(.045,12,12),MT(0xdd0000,0xff0000),.09,.04,.262,head).scale.z=.4;
  spikes(head,MT(0x111111),18,.2,.15,.5,.09,.15);
  const vortex=new TH.Group();vortex.position.set(0,1.6,-1.5);g.add(vortex);
  for(let i=1;i<=5;i++)Pp(new TH.TorusGeometry(.35*i,.04,8,40,Math.PI*1.5),AB(i%2?0x9955ff:0x220033,.8),0,0,0,vortex,0,0,i);
  Pp(new TH.CircleGeometry(.4,24),new TH.MeshBasicMaterial({color:0x000000}),0,0,.01,vortex);
  const fan=Pp(new TH.CylinderGeometry(.6,.6,.06,24),MT(0x771111,0x220000),.35,1.5,-.5,g,Math.PI/2,0,.4);
  Pp(new TH.TorusGeometry(.6,.04,6,32),MT(0x222222),.35,1.5,-.47,g,0,0,0);
  arms[0].rotation.set(-.5,0,-.8);arms[1].rotation.set(-.9,0,.6);
  return{g,col:0xff3300,anim:t=>{vortex.rotation.z=-t*1.5;const s=1+Math.sin(t*3)*.08;vortex.scale.set(s,s,1)}};
}

/* ----- MADARA: zirah merah Uchiha, rambut spiky panjang, tanduk, gunbai, tulang rusuk Susanoo, orb Gudoudama ----- */
function mkMadara(){
  const {g,head,arms}=humanoid({cloth:0x8a1414,sleeve:0x222228});
  const plate=MT(0xb02020,0x220000,{metalness:.5});
  for(let i=0;i<4;i++)Pp(new TH.TorusGeometry(.33-i*.01,.06,8,24),plate,0,1.0+i*.22,0,g,Math.PI/2);
  [-1,1].forEach(s=>Pp(new TH.SphereGeometry(.22,12,10),plate,s*.5,1.88,0,g).scale.set(1.2,.7,1.1));
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;Pp(new TH.BoxGeometry(.28,.8,.06),MT(0x8a1414),Math.cos(a)*.42,.45,Math.sin(a)*.42,g,0,-a,0)}
  const hr=MT(0x0d0d10);spikes(head,hr,26,.2,.18,.8,.1,.15);
  for(let i=0;i<10;i++)Pp(new TH.ConeGeometry(.08,1.1,6),hr,(i-4.5)*.07,-.3,-.3,head,Math.PI*.55+(Math.random()-.5)*.2,0,(i-4.5)*.12);
  [-1,1].forEach(s=>Pp(new TH.ConeGeometry(.04,.3,6),MT(0xdddddd),s*.12,.34,.12,head,0,0,-s*.25));
  eyes(head,'rinne',0xaa66ff,.03,.235,.095);
  const fan=new TH.Group();fan.position.set(0,-.95,.2);arms[1].add(fan);
  Pp(new TH.CylinderGeometry(.7,.7,.06,28),MT(0x331111,0x110000),0,-.35,0,fan,Math.PI/2);
  Pp(new TH.TorusGeometry(.7,.05,6,32),MT(0x888888,0,{metalness:.8}),0,-.35,0,fan);
  Pp(new TH.CylinderGeometry(.04,.04,.9,6),MT(0x442211),0,.05,0,fan);
  const rib=new TH.Group();rib.position.set(0,1.4,0);g.add(rib);
  for(let i=0;i<3;i++)Pp(new TH.TorusGeometry(.9+i*.15,.05,8,32),AB(0xaa44ff,.45),0,(i-1)*.4,0,rib,Math.PI/2);
  const orbs=new TH.Group();orbs.position.set(0,1.3,0);g.add(orbs);
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2,x=Math.cos(a)*1.5,z=Math.sin(a)*1.5;Pp(new TH.SphereGeometry(.16,12,12),MT(0x050508,0x6622aa),x,0,z,orbs);Pp(new TH.SphereGeometry(.26,12,12),AB(0x8844ff,.35),x,0,z,orbs)}
  arms[0].rotation.set(-.3,0,-.7);arms[1].rotation.set(-.5,0,.7);
  return{g,col:0x9900ff,anim:t=>{orbs.rotation.y=t*1.2;rib.rotation.y=-t*.5;rib.scale.setScalar(1+Math.sin(t*2)*.05)}};
}

/* ----- KAGUYA: kimono putih, rambut panjang, dua tanduk, mata ketiga, halo emas, Truth-Seeking Orbs ----- */
function mkKaguya(en){
  const {g,head,arms}=humanoid({cloth:0xf4f4ff,cE:0x222233});
  const wh=MT(0xf4f4ff,0x333344,{side:TH.DoubleSide});
  Pp(new TH.ConeGeometry(1.05,1.8,28,1,true),wh,0,.5,0,g);Pp(new TH.ConeGeometry(.85,1.5,28,1,true),MT(0xe0e0f8,0x222244,{side:TH.DoubleSide}),0,.6,0,g);
  Pp(new TH.TorusGeometry(.33,.04,8,24),MT(0xd4af37,0x664400),0,1.0,0,g,Math.PI/2);
  arms.forEach(a=>Pp(new TH.ConeGeometry(.38,1.1,14,1,true),wh,0,-.55,0,a));
  const hair=Pp(new TH.ConeGeometry(.55,2.8,16),MT(0xffffff,0x888899),0,.9,-.32,g);
  [-1,1].forEach(s=>Pp(new TH.ConeGeometry(.12,1.6,8),MT(0xffffff,0x888899),s*.3,1.4,.05,g,0,0,s*.05));
  [-1,1].forEach(s=>Pp(new TH.ConeGeometry(.06,.75,8),MT(0xffffff,0xaaaacc),s*.16,.36,.1,head,0,0,-s*.4));
  Pp(new TH.SphereGeometry(.06,12,12),MT(en?0xff2244:0xcc0000,en?0xff2244:0xaa0000),0,.18,.26,head).scale.z=.5;
  Pp(new TH.TorusGeometry(.09,.012,8,20),MT(0x222222),0,.18,.262,head);
  eyes(head,en?'col':'rinne',en?0xff4488:0xccccff,.03,.235,.095);
  const halo=Pp(new TH.TorusGeometry(1.1,.05,8,48),MT(0xd4af37,0xaa7700),0,2.0,-.5,g);
  const orbs=new TH.Group();orbs.position.set(0,1.6,-.9);g.add(orbs);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2,x=Math.cos(a)*1.8,y=Math.sin(a)*1.8;Pp(new TH.SphereGeometry(.2,12,12),MT(0x050508,0x442266),x,y,0,orbs);Pp(new TH.SphereGeometry(.32,12,12),AB(en?0xff66cc:0xaaaaff,.35),x,y,0,orbs)}
  let extra=null;
  if(en){extra=new TH.Group();extra.position.set(0,1.5,-.3);g.add(extra);for(let i=0;i<4;i++)Pp(new TH.ConeGeometry(.28,1.5,10,1,true),AB(0xff88dd,.7),(i-1.5)*.5,-.6,-.1,extra,0,0,(i-1.5)*.5)}
  arms[0].rotation.set(-.6,0,-.8);arms[1].rotation.set(-.6,0,.8);
  return{g,col:en?0xff66cc:0xaaccff,anim:t=>{orbs.rotation.z=t*.8;halo.rotation.z=t*.6;hair.rotation.z=Math.sin(t*1.5)*.05;if(extra)extra.rotation.z=Math.sin(t*2)*.15}};
}

function spawnBoss(){
  const d=BOSSES[bossIdx],m={pain:mkPain,obito:mkObito,madara:mkMadara,kaguya:()=>mkKaguya(!!d.fast)}[d.id]();
  const g=m.g,{au,ring}=auraOf(g,m.col,1.4);
  g.scale.setScalar(2.3*(d.fast?1.25:1));g.position.set(0,5,-90);scene.add(g);
  boss={g,x:0,tx:0,y:5,z:-90,hp:d.hp,max:d.hp,d,dodgeCD:0,dodgeIn:-1,laneT:2,flash:0,au,ring,enter:true,anim:m.anim};
  bossActive=true;hazards.length=0;bossAtkT=3;
  showSkillToast({skillName:'BOS: '+d.name,desc:'Kalahkan dengan skill & perisai! Hindari serangannya.'});
  playVoice('boss-'+d.id+'-intro',d.name);
}
{const _ub=updateBoss;updateBoss=function(dt){_ub(dt);if(boss&&boss.anim)boss.anim(performance.now()*.001)}}
