'use strict';
// A single, continuous ascent. The staff is a physical tool: aim it with the mouse and
// push against stone to launch. There are no checkpoints; every shelf can catch a fall.
(function (KF) {
  const W = KF.VIEW_W, H = KF.VIEW_H, WORLD = 6280, R = 9;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const FLOOR = WORLD - 50;
  const ledges = [{ x: 0, y: FLOOR, w: W, h: 50, kind: 'ground' }];
  const routeX = [68, 196, 82, 224, 78, 205, 45, 175, 258, 125, 27, 170, 253, 118, 28, 165];
  for (let i = 0; i < 88; i++) {
    const act = Math.floor(i / 22), x = routeX[(i + act * 3) % routeX.length] + (act % 2 ? -5 : 0);
    const width = 98 - act * 7 + (i * 13) % 17;
    ledges.push({ x, y: WORLD - 113 - i * 70, w: width,
      h: i > 66 ? 17 : 19, kind: i > 66 ? 'summit' : i > 43 ? 'ruin' : 'stone' });
  }
  // Broad shelves interrupt long falls without providing checkpoints.
  for (let i = 16; i < 85; i += 17) ledges.push({ x: i % 2 ? 0 : 305, y: WORLD - 108 - i * 70, w: 79, h: 17, kind: 'ruin' });
  const near = (x,y,b) => ({ x: clamp(x,b.x,b.x+b.w), y: clamp(y,b.y,b.y+b.h) });
  const hash = (a, b) => { let n = Math.imul(a + 79, 374761393) ^ Math.imul(b + 191, 668265263); n = Math.imul(n ^ n >>> 13, 1274126177); return (n ^ n >>> 16) >>> 0; };
  const rect = (ctx, color, x, y, w, h) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const wall = [344, 311, 327, 292, 319, 282, 309, 298, 329, 302, 321, 342];
  const rockEdge = (worldY) => wall[((Math.floor(worldY / 20) % wall.length) + wall.length) % wall.length];
  function drawVista(ctx, cam) {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#6685bf'); sky.addColorStop(.34, '#d18caa');
    sky.addColorStop(.59, '#ffc486'); sky.addColorStop(1, '#efb8aa');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // Wide, broken bands of gold and coral light: all shapes snap to whole pixels.
    for (let i = 0; i < 56; i++) {
      const x = (hash(i, 2) % 455) - 40, y = 16 + hash(i, 3) % 82;
      const drift = Math.floor(cam * (i % 3 + 1) * .008) % 34;
      const width = 7 + hash(i, 5) % 27;
      rect(ctx, i % 4 ? '#f7ad9c' : '#ffe6a7', x - drift, y, width, 2 + i % 3);
      if (i % 3 === 0) rect(ctx, '#ffe0a4', x + 4 - drift, y - 3, width / 2, 2);
    }
    const sunY = 67 + Math.floor(cam * .004) % 12;
    ctx.fillStyle = '#ffe8a6';
    for (let y = -18; y <= 18; y += 2) {
      const span = Math.floor(Math.sqrt(18 * 18 - y * y));
      ctx.fillRect(57 - span, sunY + y, span * 2, 2);
    }
    rect(ctx, '#ffd9a1', 16, sunY + 21, 85, 2);
    // Distant mountains use short stepped edges and three parallax speeds.
    for (let layer = 0; layer < 4; layer++) {
      const base = 100 + layer * 27 + Math.floor(cam * (.008 + layer * .004)) % 19;
      const colors = ['#9e8bb1', '#777fa8', '#64789b', '#526b88'];
      ctx.fillStyle = colors[layer]; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W + 4; x += 4) {
        const peak = Math.abs(Math.sin(x * (.018 + layer * .006) + layer * 1.7) * (20 + layer * 5));
        const grain = (hash(x >> 2, layer) % 8) - 4;
        ctx.lineTo(x, Math.round(base - peak + grain));
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 70; i++) {
        const x = hash(i, layer + 41) % W, y = base + hash(i, layer + 42) % 35;
        rect(ctx, layer < 2 ? '#c7a3ae' : '#8c9db2', x, y, 1 + i % 3, 1);
      }
    }
    for (let i = 0; i < 160; i++) {
      const x = hash(i, 51) % W, y = 91 + hash(i, 52) % 117;
      rect(ctx, i % 3 ? '#a18fac' : '#dbc0c0', x, y, 1 + i % 2, 1);
    }
    for (let i = 0; i < 31; i++) { // pixel pines punctuate the misty ridge
      const x = (hash(i, 62) % 325), base = 164 + hash(i, 63) % 50;
      const h = 9 + hash(i, 64) % 17;
      rect(ctx, '#394f68', x, base - h, 2, h);
      for (let j = 0; j < 4; j++) rect(ctx, '#405672', x - 2 - j, base - h + 3 + j * 4, 6 + j * 2, 2);
    }
    // A ruined castle on its own distant peak and a row of broken viaduct arches.
    const drift = Math.floor(cam * .015) % 19;
    const cy = 88 + drift;
    rect(ctx, '#54698c', 205, cy, 45, 49);
    rect(ctx, '#4b6084', 213, cy - 13, 8, 27); rect(ctx, '#4b6084', 237, cy - 19, 9, 34);
    rect(ctx, '#4b6084', 226, cy - 24, 6, 29); rect(ctx, '#415878', 229, cy - 30, 1, 9);
    for (let i = 0; i < 4; i++) rect(ctx, '#334d73', 210 + i * 10, cy + 10, 3, 6);
    for (let i = 0; i < 6; i++) {
      const x = 17 + i * 27, y = 159 + Math.floor(cam * .01) % 12;
      rect(ctx, '#627a9d', x, y, 6, 55);
      rect(ctx, '#7186a5', x - 2, y - 3, 10, 4);
      rect(ctx, '#7186a5', x + 6, y + 10, 21, 4);
      rect(ctx, '#4c678b', x + 10, y + 14, 3, 21);
    }
    ctx.strokeStyle = '#566e91'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(25, 174); ctx.lineTo(168, 157); ctx.stroke();
    rect(ctx, '#465d7d', 96, 167, 2, 7); rect(ctx, '#4c5e7b', 90, 174, 14, 9);
    rect(ctx, '#8290a6', 92, 176, 10, 2);
    // Mist hides the bridge foundations and separates the depth planes.
    for (let i = 0; i < 22; i++) {
      const x = (hash(i, 77) % 440) - 40, y = 151 + hash(i, 78) % 72;
      rect(ctx, i % 2 ? 'rgba(236,204,205,.50)' : 'rgba(238,215,207,.63)', x, y, 24 + hash(i, 79) % 49, 4 + i % 4);
    }
    // The playable rock wall is darker, rougher and much closer than the pastel distance.
    ctx.fillStyle = '#302e39'; ctx.beginPath(); ctx.moveTo(W, 0);
    for (let y = 0; y <= H; y += 20) ctx.lineTo(rockEdge(y + cam), y);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 460; i++) {
      const x = 281 + hash(i, 93) % 103, y = hash(i, 94) % H;
      const edge = rockEdge(y + cam);
      if (x < edge) continue;
      const colors = ['#41404a', '#55515a', '#786c68', '#a38a77', '#252931', '#c4a48a'];
      rect(ctx, colors[hash(i, 95) % colors.length], x, y, 2 + hash(i, 96) % 7, 1 + hash(i, 97) % 4);
    }
    for (let i = 0; i < 19; i++) {
      const x = 308 + hash(i, 107) % 71, y = hash(i, 108) % H;
      rect(ctx, '#384838', x, y, 5, 2); rect(ctx, '#71865a', x + 1, y - 2, 2, 2);
      if (i % 3 === 0) rect(ctx, '#e9e3c2', x + 3, y - 3, 2, 2);
    }
    // Objects lodged in the cliff echo the reference's unlikely pile of furniture,
    // rusted metal, rough timber and warm lanterns. Their parallax stays behind play.
    for (let i = 0; i < 5; i++) {
      const y = ((i * 93 + Math.floor(cam * .13)) % 370) - 65;
      if (y < -45 || y > H + 35) continue;
      const x = 312 + (i % 2) * 16;
      rect(ctx, '#241f24', x-5, y+17, 83, 7);
      rect(ctx, '#88654a', x-5, y+15, 83, 5);
      for(let j=0;j<5;j++) rect(ctx, j%2?'#c39762':'#4d3631', x+j*13, y+16, 9, 2);
      if (i % 3 === 0) { // cabinet and crates
        rect(ctx, '#292127', x+14, y-21, 42, 36);
        rect(ctx, '#744b3b', x+16, y-19, 38, 32);
        rect(ctx, '#a56b47', x+18, y-17, 34, 4);
        rect(ctx, '#3c2a29', x+19, y-7, 30, 2);
        rect(ctx, '#d3a066', x+32, y+1, 3, 2);
        rect(ctx, '#5c4235', x+45, y-29, 20, 10);
        rect(ctx, '#b3895f', x+47, y-27, 16, 3);
      } else if (i % 3 === 1) { // rusty pipe and hanging oil lamp
        rect(ctx, '#282b32', x-13, y-7, 45, 20);
        rect(ctx, '#6f5350', x-9, y-5, 38, 16);
        rect(ctx, '#9b7771', x-8, y-4, 36, 3);
        rect(ctx, '#25252b', x-15, y-9, 9, 24);
        rect(ctx, '#bd8a59', x-13, y-8, 2, 22);
        rect(ctx, '#3a2a28', x+41, y+19, 2, 23);
        rect(ctx, '#ffc774', x+37, y+35, 9, 9);
        rect(ctx, '#533d31', x+35, y+33, 13, 2);
      } else { // iron bed frame and patched blanket
        rect(ctx, '#283037', x-12, y-25, 3, 40);
        rect(ctx, '#76838a', x-11, y-24, 2, 38);
        rect(ctx, '#283037', x+58, y-23, 3, 38);
        rect(ctx, '#76838a', x+59, y-22, 2, 36);
        rect(ctx, '#c1ab9a', x-10, y-8, 67, 14);
        rect(ctx, '#756c8d', x+14, y-7, 43, 13);
        for(let j=0;j<5;j++) rect(ctx, '#d4b7ab', x+15+j*9, y-6, 4, 3);
      }
      for(let j=0;j<7;j++) {
        const sx=x+(hash(i,j)%69), sy=y+20+hash(j,i)%12;
        rect(ctx, j%2?'#777c5c':'#364537', sx, sy, 3, 2);
      }
    }
  }
  class ClimbScene {
    constructor(engine) {
      this.engine = engine;
      this.x = 52; this.y = FLOOR - 20; this.vx = 0; this.vy = 0;
      this.cam = WORLD-H; this.angle = -Math.PI / 4; this.tip = { x: this.x+30, y: this.y-30 };
      this.best = KF.Save.realm('ascent').bestHeight || 0;
      this.falls = 0; this.lastHigh = this.y; this.pushFlash = 0; this.t = 0; this.won = false;
      this.cursor = 'crosshair';
      KF.Audio.music('viking');
    }
    reset() {
      this.x = 52; this.y = FLOOR - 20; this.vx = this.vy = 0; this.cam = WORLD-H;
      this.lastHigh = this.y; this.falls = 0; this.t = 0; this.won = false;
    }
    update(dt) {
      const input = this.engine.input;
      this.t += dt; this.pushFlash = Math.max(0, this.pushFlash-dt);
      if (input.back) { this.engine.go(() => new KF.MapScene(this.engine)); return; }
      if (input.wasPressed('KeyR')) { this.reset(); return; }
      if (this.won) {
        if (input.confirm || input.clicked) this.engine.go(() => new KF.MapScene(this.engine, { cleared: KF.Doors.findIndex(d => d.id === 'ascent') }));
        return;
      }
      const mouse = input.mouse;
      let ax, ay;
      if (mouse.seen) { ax = mouse.x - this.x; ay = mouse.y + this.cam - this.y; }
      else { ax = Math.cos(this.angle); ay = Math.sin(this.angle); }
      if (Math.hypot(ax,ay) > 3) this.angle = Math.atan2(ay,ax);
      const ux = Math.cos(this.angle), uy = Math.sin(this.angle);
      const reach = 43;
      this.tip.x = this.x + ux*reach; this.tip.y = this.y + uy*reach;
      // The head grips nearby surfaces. Holding the button pushes the climber away from
      // the contact point, so pointing down at a ledge gives an upward launch.
      let touching = false;
      for (const b of ledges) {
        const p = near(this.tip.x,this.tip.y,b);
        if (Math.hypot(this.tip.x-p.x,this.tip.y-p.y) < 7) { touching = true; break; }
      }
      if (this.tip.x >= rockEdge(this.tip.y) - 5) touching = true;
      if (mouse.down && touching) {
        this.vx -= ux*1500*dt; this.vy -= uy*1500*dt;
        this.pushFlash = 0.09;
      }
      // A small sideways shuffle helps line up the next shelf; it cannot replace the staff.
      this.vx += ((input.right ? 1 : 0)-(input.left ? 1 : 0))*180*dt;
      this.vy += 430*dt;
      this.vx *= Math.pow(0.992, dt*120);
      this.vx = clamp(this.vx,-185,185); this.vy = clamp(this.vy,-310,250);
      const oldY = this.y;
      this.x = clamp(this.x+this.vx*dt,R,W-R);
      this.y = clamp(this.y+this.vy*dt,R,WORLD-R);
      const edge = rockEdge(this.y) - R;
      if (this.x > edge) { this.x = edge; this.vx = Math.min(0, this.vx); }
      if (this.x === R || this.x === W-R) this.vx *= -0.18;
      // Circle/rectangle collision resolves to the closest open face. A falling body
      // can land; a rising body can glance off the underside of an overhang.
      for (const b of ledges) {
        if (this.x+R <= b.x || this.x-R >= b.x+b.w || this.y+R <= b.y || this.y-R >= b.y+b.h) continue;
        if (oldY+R <= b.y+3 && this.vy >= 0) { this.y=b.y-R; this.vy=0; this.vx*=0.93; }
        else if (oldY-R >= b.y+b.h-3 && this.vy < 0) { this.y=b.y+b.h+R; this.vy=25; }
        else if (this.x < b.x+b.w/2) { this.x=b.x-R; this.vx=Math.min(0,this.vx); }
        else { this.x=b.x+b.w+R; this.vx=Math.max(0,this.vx); }
      }
      this.y = clamp(this.y,R,WORLD-R);
      this.tip.x = this.x+ux*reach; this.tip.y = this.y+uy*reach;
      const height = Math.max(0,Math.floor((FLOOR-9-this.y)/26));
      if (height > this.best) { this.best=height; const save=KF.Save.realm('ascent'); save.bestHeight=height; if (height%5===0) KF.Save.write(); }
      if (this.y < this.lastHigh) this.lastHigh=this.y;
      if (this.y > this.lastHigh+175) { this.falls++; this.lastHigh=this.y; }
      const targetCam=clamp(this.y-H*0.6,0,WORLD-H);
      this.cam += (targetCam-this.cam)*Math.min(1,dt*7);
      if (this.y < 108) {
        this.won=true; KF.Save.completeNode('ascent',0,{deaths:this.falls});
        KF.Save.realm('ascent').cleared=true; KF.Save.write(); KF.Audio.sfx('win');
      }
    }
    render(ctx) {
      const cam=this.cam;
      drawVista(ctx, cam);
      for (const [wy, label] of [[WORLD-1430,'THE QUARRY'],[WORLD-2830,'THE OLD FORT'],
        [WORLD-4230,'THE HIGH BRIDGE'],[WORLD-5630,'THE SUMMIT']]) {
        const y = wy - cam;
        if (y < -15 || y > H + 15) continue;
        rect(ctx, '#2c3039', 122, y-2, 140, 12);
        rect(ctx, '#9e7658', 125, y, 134, 8);
        KF.Font.draw(ctx, label, W/2, y+1, '#ffe6b0', 1, 'center');
      }
      for (let i=0;i<ledges.length;i++) {
        const b=ledges[i], y=Math.round(b.y-cam);
        if(y>H+30||y+b.h<-30) continue;
        rect(ctx, '#1c222d', b.x+4, y+5, b.w, b.h+6);
        rect(ctx, b.kind==='summit'?'#737c88':b.kind==='ruin'?'#595966':'#514c50', b.x, y, b.w, b.h);
        rect(ctx, b.kind==='summit'?'#ddc7a3':'#b8a08a', b.x, y, b.w, 3);
        for (let j=0; j<b.w/4; j++) {
          const h=hash(i,j), px=b.x+(h%b.w), py=y+4+(h>>>5)%Math.max(4,b.h-4);
          rect(ctx, ['#292b35','#a78d78','#756a66','#c1a38a'][h%4], px, py, 2+h%4, 1+h%2);
          if (j%9===0) rect(ctx, '#3a4839', b.x+j*4, y-2, 3, 3);
        }
        for(let j=16;j<b.w;j+=27) {
          rect(ctx, '#2b2b33', b.x+j, y+6, 2, b.h-7);
          rect(ctx, '#a58e7c', b.x+j+2, y+7, 1, 5);
        }
        if (i && i%6===0) { // a splintered ladder and rail cling to the rock
          const px=b.x+b.w-17;
          rect(ctx, '#312b2d', px, y-27, 3, 27); rect(ctx, '#956d4b', px+1, y-27, 2, 26);
          rect(ctx, '#312b2d', px+12, y-25, 3, 25); rect(ctx, '#956d4b', px+13, y-25, 2, 24);
          for(let k=0;k<3;k++) rect(ctx, '#bd8a54', px+3, y-21+k*7, 11, 2);
        }
        if (i && i%7===3) { // hanging lantern with a halo against the cold stone
          const px=b.x+12;
          rect(ctx, '#352b2d', px, y-29, 2, 13);
          ctx.fillStyle='rgba(255,185,92,.22)'; ctx.beginPath();ctx.arc(px+1,y-12,12,0,7);ctx.fill();
          rect(ctx, '#352b2d', px-4, y-17, 10, 11); rect(ctx, '#ffcb78', px-2, y-15, 6, 7);
          rect(ctx, '#fff2bb', px, y-14, 2, 4);
        }
        if (i && i%11===5) { // a misplaced cabinet, like the objects in the reference cliff
          const px=b.x+22;
          rect(ctx, '#281f25', px-1, y-25, 27, 26);
          rect(ctx, '#795348', px, y-24, 25, 22);
          rect(ctx, '#9b6a53', px+2, y-22, 21, 5);
          rect(ctx, '#513a38', px+2, y-15, 21, 1); rect(ctx, '#513a38', px+2, y-8, 21, 1);
          rect(ctx, '#deb77f', px+12, y-12, 2, 2);
        }
        if (i && i%13===8) { // an abandoned white basin on the mountain face
          const px=b.x+30;
          rect(ctx, '#3c424b', px-2, y-16, 30, 4);
          rect(ctx, '#dfddd0', px, y-15, 26, 7);
          rect(ctx, '#b8bfbd', px+5, y-8, 16, 5);
          rect(ctx, '#ecdfd1', px+9, y-3, 8, 3);
        }
      }
      const sy=this.y-cam, tipY=this.tip.y-cam;
      // Bare-headed climber in a dark cauldron, holding the broad steel hammer.
      rect(ctx, '#171b24', this.x-12, sy-1, 24, 4);
      rect(ctx, '#3c3d45', this.x-11, sy+3, 22, 5);
      rect(ctx, '#35363e', this.x-9, sy+8, 18, 4);
      rect(ctx, '#252831', this.x-6, sy+12, 12, 2);
      rect(ctx, '#7b7b7e', this.x-9, sy+3, 3, 7);
      rect(ctx, '#9a9896', this.x-7, sy+4, 1, 3);
      rect(ctx, '#171b24', this.x-13, sy-2, 26, 3);
      rect(ctx, '#c98a69', this.x-6, sy-14, 12, 12);
      rect(ctx, '#edb08b', this.x-4, sy-13, 8, 7);
      rect(ctx, '#3b2a2a', this.x+2, sy-8, 5, 5);
      rect(ctx, '#221f26', this.x+3, sy-11, 2, 1);
      ctx.lineCap='butt'; ctx.strokeStyle='#241e23'; ctx.lineWidth=5;
      ctx.beginPath(); ctx.moveTo(this.x+1,sy-6);ctx.lineTo(this.tip.x,tipY);ctx.stroke();
      ctx.strokeStyle='#b77a3d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(this.x+1,sy-6);ctx.lineTo(this.tip.x,tipY);ctx.stroke();
      rect(ctx, '#e7ad86', this.x+1, sy-9, 5, 4);
      ctx.save();ctx.translate(this.tip.x,tipY);ctx.rotate(this.angle+Math.PI/2);
      rect(ctx, '#23252e', -9,-4,18,8);
      rect(ctx, this.pushFlash?'#fff5c8':'#aab2bd', -8,-3,16,6);
      rect(ctx, '#e3e7e5', -8,-3,16,2);
      rect(ctx, '#707c8b', -8,2,16,1);
      ctx.restore();
      ctx.fillStyle='rgba(10,15,24,.78)';ctx.fillRect(0,0,W,27);
      KF.Font.draw(ctx,'THE ASCENT',8,5,'#fff2d1',1);
      KF.Font.draw(ctx,`TIME ${Math.floor(this.t/60)}:${String(Math.floor(this.t%60)).padStart(2,'0')}`,8,16,'#d1e8e8',1);
      KF.Font.draw(ctx,`${Math.max(0,Math.floor((FLOOR-9-this.y)/26))}m  BEST ${this.best}m`,W-8,5,'#f6cf75',1,'right');
      KF.Font.draw(ctx,`FALLS ${this.falls}`,W-8,16,'#d1e8e8',1,'right');
      ctx.fillStyle='#344153';ctx.fillRect(4,34,3,H-42);
      ctx.fillStyle='#e8bd75';ctx.fillRect(4,34,3,(H-42)*clamp((FLOOR-9-this.y)/(FLOOR-117),0,1));
      if (this.t<15 && !this.won) {
        ctx.fillStyle='rgba(9,14,22,.84)';ctx.fillRect(13,H-42,W-26,34);
        KF.Font.draw(ctx,'AIM MOUSE AT STONE + HOLD CLICK TO PUSH',W/2,H-37,'#fff2d1',1,'center');
        KF.Font.draw(ctx,'A/D STEER   R RESTART   ESC MAP',W/2,H-23,'#b8dbe3',1,'center');
      }
      if (this.won) {
        ctx.fillStyle='rgba(5,12,22,.88)';ctx.fillRect(0,0,W,H);
        KF.Font.draw(ctx,'SUMMIT REACHED!',W/2,72,'#fff0bd',2,'center','#24140a');
        KF.Font.draw(ctx,`FALLS ${this.falls}  BEST ${this.best}m`,W/2,120,'#cbe9ed',1,'center');
        KF.Font.draw(ctx,'ENTER OR CLICK: REALM MAP',W/2,145,'#f6cf75',1,'center');
      }
    }
  }
  KF.ClimbScene=ClimbScene;
})(window.KF);
