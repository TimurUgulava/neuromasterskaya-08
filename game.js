// =====================================================================
// CONTEXT CATCHER · original arcade mini-game
// Theme: catch "CTX" context tokens, dodge water droplets "H₂O"
// Pixel-art rendering on a 480x360 canvas. 8-bit beeps via WebAudio.
// =====================================================================

(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const W = canvas.width, H = canvas.height;

  // -------- Audio (original 8-bit style beeps) --------
  let audioCtx = null;
  let soundOn = true;
  function initAudio(){
    if(audioCtx) return;
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ audioCtx=null; }
  }
  function beep(freq=440, dur=0.08, type='square', vol=0.08, sweep=0){
    if(!soundOn || !audioCtx) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if(sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq+sweep), t+dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t); osc.stop(t+dur+0.02);
  }
  function sfxCatch(){ beep(880,.06,'square',.1); setTimeout(()=>beep(1320,.08,'square',.09),50); }
  function sfxBad(){   beep(180,.18,'sawtooth',.12,-120); }
  function sfxStart(){ [523,659,784,1047].forEach((f,i)=> setTimeout(()=>beep(f,.08,'square',.09), i*90)); }
  function sfxGameOver(){ [392,330,262,196,130].forEach((f,i)=> setTimeout(()=>beep(f,.14,'square',.1), i*120)); }
  function sfxLevel(){ [659,784,988].forEach((f,i)=> setTimeout(()=>beep(f,.07,'square',.1), i*70));}
  function sfxCoin(){ beep(1760,.05,'square',.08); setTimeout(()=>beep(1320,.08,'square',.08),60); }
  function sfxBlip(){ beep(660,.03,'square',.05); }
  function sfxShoot(){ beep(980,.04,'square',.06,-400); }
  function sfxHitBad(){ beep(240,.08,'sawtooth',.1,-120); setTimeout(()=>beep(140,.08,'sawtooth',.08,-80),40); }

  // -------- Sprites (pixel drawing helpers) --------
  // A small 'pixel letter' routine, using 3x5 font for HUD labels in-game.
  const FONT3x5 = {
    'A':['010','101','111','101','101'],'B':['110','101','110','101','110'],
    'C':['011','100','100','100','011'],'D':['110','101','101','101','110'],
    'E':['111','100','110','100','111'],'F':['111','100','110','100','100'],
    'G':['011','100','101','101','011'],'H':['101','101','111','101','101'],
    'I':['111','010','010','010','111'],'J':['001','001','001','101','010'],
    'K':['101','110','100','110','101'],'L':['100','100','100','100','111'],
    'M':['101','111','111','101','101'],'N':['101','111','111','111','101'],
    'O':['010','101','101','101','010'],'P':['110','101','110','100','100'],
    'Q':['010','101','101','111','011'],'R':['110','101','110','101','101'],
    'S':['011','100','010','001','110'],'T':['111','010','010','010','010'],
    'U':['101','101','101','101','011'],'V':['101','101','101','101','010'],
    'W':['101','101','111','111','101'],'X':['101','101','010','101','101'],
    'Y':['101','101','010','010','010'],'Z':['111','001','010','100','111'],
    '0':['010','101','101','101','010'],'1':['010','110','010','010','111'],
    '2':['110','001','010','100','111'],'3':['110','001','010','001','110'],
    '4':['101','101','111','001','001'],'5':['111','100','110','001','110'],
    '6':['011','100','110','101','010'],'7':['111','001','010','010','010'],
    '8':['010','101','010','101','010'],'9':['010','101','011','001','110'],
    ' ':['000','000','000','000','000'],':':['000','010','000','010','000'],
    '!':['010','010','010','000','010'],'.':['000','000','000','000','010'],
    '-':['000','000','111','000','000'],'+':['000','010','111','010','000'],
    ',':['000','000','000','010','100'],
    // Cyrillic (uppercase)
    'А':['010','101','111','101','101'],'Б':['111','100','110','101','110'],
    'В':['110','101','110','101','110'],'Г':['111','100','100','100','100'],
    'Д':['011','101','101','101','111'],'Е':['111','100','110','100','111'],
    'Ё':['111','100','110','100','111'],'Ж':['101','111','010','111','101'],
    'З':['110','001','010','001','110'],'И':['101','101','111','111','101'],
    'Й':['101','111','111','111','101'],'К':['101','110','100','110','101'],
    'Л':['011','101','101','101','101'],'М':['101','111','111','101','101'],
    'Н':['101','101','111','101','101'],'О':['010','101','101','101','010'],
    'П':['111','101','101','101','101'],'Р':['110','101','110','100','100'],
    'С':['011','100','100','100','011'],'Т':['111','010','010','010','010'],
    'У':['101','101','011','001','110'],'Ф':['111','101','111','010','010'],
    'Х':['101','101','010','101','101'],'Ц':['101','101','101','111','001'],
    'Ч':['101','101','111','001','001'],'Ш':['101','101','101','101','111'],
    'Щ':['101','101','101','111','001'],'Ъ':['110','010','011','011','011'],
    'Ы':['101','101','111','101','101'],'Ь':['100','100','110','101','110'],
    'Э':['110','001','011','001','110'],'Ю':['101','101','111','101','101'],
    'Я':['011','101','011','011','101'],
  };
  function pxText(str, x, y, color='#FFF4E0', scale=1){
    str = str.toUpperCase();
    ctx.fillStyle = color;
    for(let i=0;i<str.length;i++){
      const ch = FONT3x5[str[i]] || FONT3x5[' '];
      for(let r=0;r<5;r++){
        for(let c=0;c<3;c++){
          if(ch[r][c]==='1'){
            ctx.fillRect(x + (i*4 + c)*scale, y + r*scale, scale, scale);
          }
        }
      }
    }
  }

  // Player: retro "brain" lander / robot sprite (original pixel art)
  function drawPlayer(px, py, t){
    // body
    const x = Math.round(px), y = Math.round(py);
    // antenna blink
    const blink = Math.floor(t/200)%2===0;
    // shadow
    ctx.fillStyle='rgba(0,240,255,0.25)'; ctx.fillRect(x-1, y+22, 28, 3);

    // ship body (orange)
    ctx.fillStyle = '#FE9901';
    const body = [
      '..XXXXXX..',
      '.XXXXXXXX.',
      'XXXXXXXXXX',
      'XX.XXXX.XX',
      'XXXXXXXXXX',
      '.XX.XX.XX.',
    ];
    body.forEach((row,r)=>{
      for(let c=0;c<row.length;c++){
        if(row[c]==='X'){
          // highlight top
          ctx.fillStyle = r<2 ? '#FFB43A' : (r>4? '#a15c00' : '#FE9901');
          ctx.fillRect(x + c*2.6, y + 6 + r*3, 3, 3);
        }
      }
    });
    // cockpit (cyan)
    ctx.fillStyle = '#00F0FF';
    ctx.fillRect(x+9, y+10, 8, 5);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x+10, y+10, 3, 2);
    // antenna
    ctx.fillStyle = '#fff4e0'; ctx.fillRect(x+12, y+2, 2, 6);
    if(blink){ ctx.fillStyle='#FE9901'; ctx.fillRect(x+11, y, 4, 3); }
    // thrusters
    ctx.fillStyle = Math.floor(t/80)%2===0 ? '#ff2e88' : '#FFB43A';
    ctx.fillRect(x+4, y+24, 3, 3);
    ctx.fillRect(x+18, y+24, 3, 3);
  }

  // Context pellet: cyan block with "КОНТЕКСТ" label
  function drawGood(g, t){
    const x = Math.round(g.x), y = Math.round(g.y);
    const pulse = Math.floor(t/120)%2===0;
    // core (wider to fit cyrillic label)
    const w = 40, h = 16;
    ctx.fillStyle = pulse ? '#00F0FF' : '#6ef6ff';
    ctx.fillRect(x - w/2, y - h/2, w, h);
    // bevel
    ctx.fillStyle = '#aefcff'; ctx.fillRect(x - w/2, y - h/2, w, 2);
    ctx.fillStyle = '#005e66'; ctx.fillRect(x - w/2, y + h/2 - 2, w, 2);
    // label КОНТЕКСТ (8 chars × 4px at scale 1 = 32px)
    pxText('КОНТЕКСТ', x - 16, y - 2, '#0a0a0f', 1);
    // sparks
    ctx.fillStyle = '#fff';
    const sx = Math.sin(t/200 + g.seed)*6;
    ctx.fillRect(x+sx, y-13, 1, 1);
    ctx.fillRect(x-sx, y+12, 1, 1);
  }

  // H2O drop: pink/red water droplet — BAD
  function drawBad(b, t){
    const x = Math.round(b.x), y = Math.round(b.y);
    const s = 3; // pixel scale
    // drop shape
    const drop = [
      '..X..',
      '.XXX.',
      'XXXXX',
      'XXXXX',
      '.XXX.',
    ];
    drop.forEach((row,r)=>{
      for(let c=0;c<row.length;c++){
        if(row[c]==='X'){
          ctx.fillStyle = r<2 ? '#ff77ae' : (r>3 ? '#8a0d41' : '#ff2e88');
          ctx.fillRect(x - 2.5*s + c*s, y - 2.5*s + r*s, s, s);
        }
      }
    });
    // wobble highlight
    const hi = Math.floor(t/150)%2===0;
    if(hi){ ctx.fillStyle='#fff'; ctx.fillRect(x-3, y-3, 3, 3); }
    // ВОДА label
    pxText('ВОДА', x-8, y+10, '#ff77ae', 1);
  }

  // Bonus star (rare)
  function drawStar(s, t){
    const x=Math.round(s.x), y=Math.round(s.y);
    const pulse = Math.floor(t/80)%2===0 ? '#FFB43A' : '#FE9901';
    ctx.fillStyle = pulse;
    const scale = 3;
    const star = [
      '..X..','.XXX.','XXXXX','.XXX.','X.X.X'
    ];
    star.forEach((row,r)=>{
      for(let c=0;c<row.length;c++){
        if(row[c]==='X'){ ctx.fillRect(x - 2.5*scale + c*scale, y - 2.5*scale + r*scale, scale, scale); }
      }
    });
    pxText('500', x-6, y+10, '#FFB43A', 1);
  }

  // Particle pop
  const particles = [];
  function pop(x,y,color='#00F0FF'){
    for(let i=0;i<10;i++){
      particles.push({
        x,y,
        vx:(Math.random()-0.5)*3,
        vy:(Math.random()-0.8)*3,
        life:24 + Math.random()*10,
        color
      });
    }
  }

  // -------- Game state --------
  const STATE = { MENU:'menu', PLAY:'play', PAUSE:'pause', OVER:'over'};
  let state = STATE.MENU;

  const player = { x: W/2-13, y: H-44, w:26, h:22, vx:0, speed: 3.2};
  const keys = {};
  let goods = []; // {x,y,vy,seed}
  let bads  = [];
  let stars = [];
  let bullets = [];
  let shootCooldown = 0;
  let score = 0;
  let hi = +(localStorage.getItem('nm_hi')||0);
  let lives = 3;
  let level = 1;
  let spawnTimer = 0;
  let badTimer = 0;
  let starTimer = 600;
  let t = 0;
  let combo = 0;
  let flash = 0;
  let levelProgress = 0; // goods caught in current level
  let goal = 8;

  document.getElementById('ui-hi').textContent = String(hi).padStart(6,'0');

  function resetRun(){
    goods.length=0; bads.length=0; stars.length=0; bullets.length=0; particles.length=0;
    score=0; lives=3; level=1; combo=0; levelProgress=0; goal=8; shootCooldown=0;
    updateHUD();
  }

  function updateHUD(){
    document.getElementById('ui-score').textContent = String(score).padStart(6,'0');
    document.getElementById('ui-hi').textContent = String(hi).padStart(6,'0');
    document.getElementById('ui-lives').textContent = '♥ '.repeat(Math.max(0,lives)).trim() || '—';
    document.getElementById('ui-level').textContent = String(level);
  }

  // -------- Input --------
  document.addEventListener('keydown', (e)=>{
    if(['ArrowLeft','ArrowRight','a','A','d','D',' '].includes(e.key)) e.preventDefault();
    keys[e.key]=true;
    if(e.key===' '){
      if(state===STATE.PLAY){ state=STATE.PAUSE; sfxBlip(); }
      else if(state===STATE.PAUSE){ state=STATE.PLAY; sfxBlip(); }
      else if(state===STATE.MENU || state===STATE.OVER){ startGame(); }
    }
  });
  document.addEventListener('keyup', (e)=>{ keys[e.key]=false; });

  // Touch / click on canvas left/right
  let touchSide = 0;
  canvas.addEventListener('pointerdown', (e)=>{
    initAudio();
    if(state===STATE.MENU || state===STATE.OVER){ startGame(); return; }
    const r = canvas.getBoundingClientRect();
    const rx = (e.clientX - r.left) / r.width;
    touchSide = rx < 0.5 ? -1 : 1;
  });
  canvas.addEventListener('pointerup', ()=> touchSide = 0);
  canvas.addEventListener('pointerleave', ()=> touchSide = 0);

  // Coin button
  document.getElementById('coin-btn').addEventListener('click', ()=>{
    initAudio();
    sfxCoin();
    if(state!==STATE.PLAY) startGame();
  });

  // Sound toggle
  const soundBtn = document.getElementById('sound-toggle');
  soundBtn.addEventListener('click', ()=>{
    initAudio();
    soundOn = !soundOn;
    soundBtn.textContent = '♪ ЗВУК : ' + (soundOn?'ВКЛ':'ВЫКЛ');
    soundBtn.classList.toggle('off', !soundOn);
    if(soundOn) sfxBlip();
  });

  function startGame(){
    initAudio();
    resetRun();
    state = STATE.PLAY;
    sfxStart();
  }

  // -------- Spawning --------
  function spawnGood(){
    const x = 20 + Math.random()*(W-40);
    const vy = 1.2 + Math.random()*0.8 + level*0.25;
    goods.push({x, y:-12, vy, seed: Math.random()*6.28});
  }
  function spawnBad(){
    const x = 20 + Math.random()*(W-40);
    const vy = 1.6 + Math.random()*1.2 + level*0.3;
    bads.push({x, y:-12, vy, sway: Math.random()*6.28});
  }
  function spawnStar(){
    const x = 40 + Math.random()*(W-80);
    stars.push({x, y:-12, vy: 1.6});
  }

  // -------- Main loop --------
  let last = performance.now();
  function loop(now){
    const dt = now - last; last = now; t += dt;
    draw(dt);
    requestAnimationFrame(loop);
  }

  function update(dt){
    if(state !== STATE.PLAY) return;
    dt *= (window.__gameSpeed ?? 1);
    // move player
    let dir = 0;
    if(keys['ArrowLeft']||keys['a']||keys['A']) dir -= 1;
    if(keys['ArrowRight']||keys['d']||keys['D']) dir += 1;
    dir += touchSide;
    player.vx = dir * player.speed;
    player.x += player.vx * (dt/16);
    player.x = Math.max(4, Math.min(W - player.w - 4, player.x));

    // spawn
    spawnTimer -= dt;
    if(spawnTimer<=0){
      spawnGood();
      spawnTimer = Math.max(350, 900 - level*70) + Math.random()*250;
    }
    badTimer -= dt;
    if(badTimer<=0){
      spawnBad();
      badTimer = Math.max(500, 1400 - level*100) + Math.random()*350;
    }
    starTimer -= dt;
    if(starTimer<=0){
      spawnStar();
      starTimer = 8000 + Math.random()*6000;
    }

    // update entities
    const pbox = {x:player.x, y:player.y, w:player.w, h:player.h};
    function hit(e, radius){
      return (e.x > pbox.x-radius && e.x < pbox.x+pbox.w+radius &&
              e.y > pbox.y-radius && e.y < pbox.y+pbox.h+radius);
    }

    for(let i=goods.length-1;i>=0;i--){
      const g = goods[i];
      g.y += g.vy * (dt/16);
      if(hit(g, 4)){
        goods.splice(i,1);
        combo += 1;
        const gain = 100 + Math.min(combo-1,9)*20;
        score += gain;
        levelProgress += 1;
        pop(g.x, g.y, '#00F0FF');
        flash = 6;
        sfxCatch();
        if(levelProgress >= goal){
          level += 1;
          levelProgress = 0;
          goal = 8 + level*2;
          sfxLevel();
        }
        updateHUD();
      } else if(g.y > H+12){
        goods.splice(i,1);
        combo = 0;
      }
    }

    for(let i=bads.length-1;i>=0;i--){
      const b = bads[i];
      b.y += b.vy * (dt/16);
      b.x += Math.sin((b.y+b.sway)/28) * 0.6;
      if(hit(b, 2)){
        bads.splice(i,1);
        lives -= 1;
        combo = 0;
        pop(b.x, b.y, '#ff2e88');
        flash = 12;
        sfxBad();
        updateHUD();
        if(lives<=0){
          state = STATE.OVER;
          if(score > hi){ hi = score; localStorage.setItem('nm_hi', hi); }
          sfxGameOver();
          updateHUD();
        }
      } else if(b.y > H+12){
        bads.splice(i,1);
      }
    }

    for(let i=stars.length-1;i>=0;i--){
      const s = stars[i];
      s.y += s.vy * (dt/16);
      if(hit(s,4)){
        stars.splice(i,1);
        score += 500;
        pop(s.x, s.y, '#FFB43A');
        flash = 8;
        sfxLevel();
        updateHUD();
      } else if(s.y > H+12){ stars.splice(i,1); }
    }

    // particles
    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life -= 1;
      if(p.life<=0) particles.splice(i,1);
    }

    if(flash>0) flash--;
  }

  // -------- Rendering --------
  function drawBackdrop(t){
    // void
    ctx.fillStyle = '#050307';
    ctx.fillRect(0,0,W,H);

    // starfield
    const n = 40;
    for(let i=0;i<n;i++){
      const sx = (i*71 + (t*0.03)) % W;
      const sy = (i*53 + (t*0.05)) % H;
      const bri = (i%7===0) ? '#fff' : (i%3===0?'#88aabb':'#334455');
      ctx.fillStyle = bri;
      ctx.fillRect(Math.floor(sx), Math.floor(sy), 1, 1);
    }

    // horizon
    ctx.fillStyle = '#12081a';
    ctx.fillRect(0, H*0.55, W, H*0.45);

    // grid floor
    ctx.strokeStyle = 'rgba(0,240,255,0.35)';
    ctx.lineWidth = 1;
    const horizonY = H*0.55;
    const offset = (t*0.06)%30;
    // horizontal lines
    for(let i=0;i<12;i++){
      const k = i/12;
      const y = horizonY + Math.pow(k,2) * (H - horizonY) + offset* (1-k);
      if(y > horizonY && y < H){
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    }
    // vanishing-point vertical lines
    const vx = W/2;
    for(let i=-8;i<=8;i++){
      const xb = vx + i*(W/10);
      ctx.beginPath();
      ctx.moveTo(vx, horizonY);
      ctx.lineTo(xb, H);
      ctx.stroke();
    }

    // sun / big orange arc
    ctx.fillStyle = '#FE9901';
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.arc(W/2, horizonY, 70, Math.PI, 0); ctx.fill();
    ctx.globalAlpha = 1;
    // sun scanlines
    ctx.fillStyle = '#050307';
    for(let i=0;i<5;i++){
      ctx.fillRect(W/2-70, horizonY - 8 - i*10, 140, 2+i);
    }

    // CRT scanlines overlay inside game
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for(let y=0;y<H;y+=3){
      ctx.fillRect(0,y,W,1);
    }
  }

  function drawHUD(){
    // top strip inside game
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0,0,W,16);
    pxText('ОЧКИ ' + String(score).padStart(6,'0'), 6, 5, '#FE9901', 2);
    pxText('УР ' + level, 200, 5, '#00F0FF', 2);
    pxText('РЕК ' + String(hi).padStart(6,'0'), 260, 5, '#00F0FF', 2);
    // lives
    for(let i=0;i<lives;i++){
      ctx.fillStyle = '#ff2e88';
      ctx.fillRect(W-16 - i*12, 5, 6, 6);
      ctx.fillStyle = '#fff'; ctx.fillRect(W-15 - i*12, 6, 2, 2);
    }
    // progress bar
    const pw = 100, px = 110, py = 7;
    ctx.fillStyle = '#1a1228'; ctx.fillRect(px, py, pw, 4);
    ctx.fillStyle = '#00F0FF'; ctx.fillRect(px, py, Math.min(pw, (levelProgress/goal)*pw), 4);

    // combo
    if(combo>1){
      pxText('Х' + combo + ' КОМБО!', W/2 - 24, 20, '#FFB43A', 2);
    }
  }

  function drawMenu(t){
    const pulse = Math.floor(t/400)%2===0;
    pxText('ЛОВИ', 180, 60, '#00F0FF', 4);
    pxText('КОНТЕКСТ', 120, 100, '#FE9901', 4);
    pxText('МИНИ-ИГРА НЕЙРОМАСТЕРСКОЙ', 80, 150, '#fff4e0', 1);
    pxText('ЛОВИ КОНТЕКСТ   БЕГИ ОТ ВОДЫ', 60, 180, '#6ef6ff', 2);

    if(pulse) pxText('ЖМИ SPACE ИЛИ КНОПКУ', 90, 240, '#FE9901', 2);

    pxText('СТРЕЛКИ ИЛИ A D     SPACE ПАУЗА', 80, 290, '#8a7a60', 1);
    pxText('РЕКОРД ' + String(hi).padStart(6,'0'), 130, 320, '#ff2e88', 2);
  }

  function drawOver(t){
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0,0,W,H);
    pxText('ИГРА ОКОНЧЕНА', 100, 100, '#ff2e88', 4);
    pxText('ОЧКИ ' + String(score).padStart(6,'0'), 150, 160, '#FE9901', 2);
    pxText('РЕКОРД ' + String(hi).padStart(6,'0'), 135, 185, '#00F0FF', 2);
    const pulse = Math.floor(t/400)%2===0;
    if(pulse) pxText('ЖМИ SPACE ЧТОБЫ ИГРАТЬ СНОВА', 50, 240, '#fff4e0', 2);
    pxText('НЕЙРОМАСТЕРСКАЯ 29 АПР 16 00 MSK', 70, 290, '#6ef6ff', 1);
    pxText('ДОБАВЬ В КАЛЕНДАРЬ   НЕ ПРОПУСТИ', 75, 305, '#6ef6ff', 1);
  }

  function drawPause(){
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0,0,W,H);
    pxText('ПАУЗА', 195, 160, '#FE9901', 4);
    pxText('SPACE — ПРОДОЛЖИТЬ', 115, 220, '#fff4e0', 2);
  }

  function draw(dt){
    update(dt);

    drawBackdrop(t);

    // game entities (behind HUD)
    if(state === STATE.PLAY || state === STATE.PAUSE){
      drawPlayer(player.x, player.y, t);
      goods.forEach(g => drawGood(g, t));
      bads.forEach(b => drawBad(b, t));
      stars.forEach(s => drawStar(s, t));
      // particles
      particles.forEach(p=>{
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
      });
    }

    if(flash>0){
      ctx.fillStyle = `rgba(255,255,255,${flash/20})`;
      ctx.fillRect(0,0,W,H);
    }

    if(state === STATE.MENU) drawMenu(t);
    else if(state === STATE.OVER) drawOver(t);
    else if(state === STATE.PAUSE){ drawHUD(); drawPause(); }
    else drawHUD();

    // vignette
    const grd = ctx.createRadialGradient(W/2,H/2,W*0.2, W/2,H/2,W*0.65);
    grd.addColorStop(0,'rgba(0,0,0,0)');
    grd.addColorStop(1,'rgba(0,0,0,0.55)');
    ctx.fillStyle = grd; ctx.fillRect(0,0,W,H);
  }

  updateHUD();
  requestAnimationFrame(loop);
})();
