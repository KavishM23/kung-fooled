'use strict';
// A single, continuous ascent. The staff is a physical tool: aim it with the mouse and
// push against stone to launch. There are no checkpoints; every shelf can catch a fall.
(function (KF) {
  const W = KF.VIEW_W, H = KF.VIEW_H, WORLD = 2760, R = 9;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ledges = [{ x: 0, y: 2710, w: W, h: 50, kind: 'ground' }];
  const route = [
    [68,2647,111],[201,2581,110],[82,2514,99],[225,2447,104],
    [80,2381,101],[210,2314,113],[48,2246,96],[175,2178,105],
    [263,2110,97],[127,2041,101],[28,1972,100],[175,1904,114],
    [259,1833,91],[121,1765,104],[26,1697,99],[168,1629,111],
    [260,1560,96],[118,1490,105],[29,1420,95],[167,1351,107],
    [256,1281,91],[112,1212,100],[24,1143,96],[164,1074,110],
    [250,1004,98],[111,935,105],[24,866,92],[165,796,110],
    [254,726,97],[116,656,106],[28,586,94],[170,516,108],
    [255,446,99],[110,375,107],[29,305,96],[170,235,110],
    [248,165,100],[130,99,126],
  ];
  route.forEach(([x,y,w], i) => ledges.push({ x,y,w,h: i > 25 ? 15 : 19, kind: i > 25 ? 'cloud' : i > 13 ? 'ruin' : 'stone' }));
  // Longer shelves are intentional safety nets, while ledges at their edges demand aiming.
  ledges.push({ x: 0, y: 1850, w: 67, h: 17, kind: 'ruin' }, { x: 303, y: 1110, w: 81, h: 18, kind: 'ruin' });
  const near = (x,y,b) => ({ x: clamp(x,b.x,b.x+b.w), y: clamp(y,b.y,b.y+b.h) });
  class ClimbScene {
    constructor(engine) {
      this.engine = engine;
      this.x = 52; this.y = 2690; this.vx = 0; this.vy = 0;
      this.cam = WORLD-H; this.angle = Math.PI / 2; this.tip = { x: this.x, y: this.y+39 };
      this.best = KF.Save.realm('ascent').bestHeight || 0;
      this.falls = 0; this.lastHigh = this.y; this.pushFlash = 0; this.t = 0; this.won = false;
      this.cursor = 'crosshair';
      KF.Audio.music('viking');
    }
    reset() {
      this.x = 52; this.y = 2690; this.vx = this.vy = 0; this.cam = WORLD-H;
      this.lastHigh = this.y; this.falls = 0; this.won = false;
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
      const height = Math.max(0,Math.floor((2701-this.y)/26));
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
      const cam=this.cam, sky=clamp((WORLD-cam)/WORLD,0,1);
      const grad=ctx.createLinearGradient(0,0,0,H);
      grad.addColorStop(0,sky>.65?'#111b30':'#293d58'); grad.addColorStop(1,sky>.65?'#24344d':'#506a7c');
      ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
      // Landmark silhouettes distinguish the four long stretches of the climb.
      const markers=[
        [2450,'QUARRY', '#7a5c53'],[1820,'BELL TOWER','#786969'],
        [1190,'BROKEN FORT','#58677b'],[530,'SKY GARDEN','#8ba2ae']
      ];
      for(const [wy,label,col] of markers) {
        const y=wy-cam*0.95-80;
        if(y<-170||y>H+170) continue;
        ctx.fillStyle=col;ctx.globalAlpha=.42;
        ctx.fillRect(18,y+54,58,115);ctx.fillRect(27,y+35,40,20);
        ctx.fillRect(296,y+38,60,128);ctx.fillRect(309,y+22,34,18);
        ctx.fillRect(34,y+69,11,24);ctx.fillRect(322,y+55,12,29);
        ctx.globalAlpha=1;
        KF.Font.draw(ctx,label,192,y+54,'#e5d8b6',1,'center');
      }
      for(let n=0;n<32;n++) {
        const x=(n*137+29)%W, wy=(n*271)%WORLD, y=wy-cam*.23;
        if(y<5||y>H) continue;
        ctx.fillStyle=n%3?'rgba(255,240,204,.22)':'rgba(255,240,204,.4)';
        ctx.fillRect(x,y,n%4?1:2,n%4?1:2);
      }
      // Distant ridges scroll slowly, giving the towering level a sense of depth.
      for (let layer=0;layer<3;layer++) {
        ctx.fillStyle=['#192438','#26374a','#34485b'][layer];
        const offset=(cam*(0.04+layer*0.05))%78;
        ctx.beginPath(); ctx.moveTo(0,H);
        for(let x=-55;x<W+70;x+=55) { ctx.lineTo(x,H-48-layer*16+Math.sin(x*0.037+layer)*18+offset*.18); ctx.lineTo(x+30,H-75-layer*15+offset*.18); }
        ctx.lineTo(W,H); ctx.fill();
      }
      for (let i=0;i<ledges.length;i++) {
        const b=ledges[i], y=Math.round(b.y-cam);
        if(y>H+30||y+b.h<-30) continue;
        ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(b.x+4,y+5,b.w,b.h);
        ctx.fillStyle=b.kind==='cloud'?'#e8e3d5':b.kind==='ruin'?'#777d78':'#74695e'; ctx.fillRect(b.x,y,b.w,b.h);
        ctx.fillStyle=b.kind==='cloud'?'#fff9e8':b.kind==='ruin'?'#b7ae98':'#c3aa7b'; ctx.fillRect(b.x,y,b.w,4);
        ctx.fillStyle=b.kind==='cloud'?'#babfbe':'#403e3e';
        for(let j=16;j<b.w;j+=23) ctx.fillRect(b.x+j,y+7,2,Math.max(3,b.h-8));
        if(i && i%5===0) {
          ctx.fillStyle='#3c2c2a';ctx.fillRect(b.x+10,y-22,2,22);
          ctx.fillStyle=i>25?'#e4debc':'#b54837';
          ctx.beginPath();ctx.moveTo(b.x+12,y-21);ctx.lineTo(b.x+31,y-17);ctx.lineTo(b.x+12,y-12);ctx.fill();
        }
        if(i && i%7===3) {
          ctx.fillStyle='#2c3536';ctx.fillRect(b.x+b.w-25,y-16,13,16);
          ctx.fillStyle='#ffd385';ctx.fillRect(b.x+b.w-22,y-13,7,8);
        }
      }
      const sy=this.y-cam, tipY=this.tip.y-cam;
      // A pixel-sized mountain climber with a bright training scarf and steel staff.
      ctx.lineCap='round'; ctx.strokeStyle='#221e24'; ctx.lineWidth=5;
      ctx.beginPath(); ctx.moveTo(this.x,sy-4);ctx.lineTo(this.tip.x,tipY);ctx.stroke();
      ctx.strokeStyle='#d8c6a1';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(this.x,sy-4);ctx.lineTo(this.tip.x,tipY);ctx.stroke();
      ctx.fillStyle=this.pushFlash?'#fff7ad':'#d7e2df';ctx.beginPath();ctx.arc(this.tip.x,tipY,5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#172129';ctx.fillRect(this.x-8,sy-5,16,15);
      ctx.fillStyle='#e88938';ctx.fillRect(this.x-7,sy-3,14,8);
      ctx.fillStyle='#e8bd8e';ctx.fillRect(this.x-6,sy-14,12,11);
      ctx.fillStyle='#f2b93b';ctx.fillRect(this.x-8,sy-17,16,5);
      ctx.fillStyle='#1b2832';ctx.fillRect(this.x+2,sy-10,2,2);
      ctx.fillStyle='#f5dfb8';ctx.fillRect(this.x-12,sy+8,7,3);ctx.fillRect(this.x+5,sy+8,7,3);
      ctx.fillStyle='#e34a38';ctx.fillRect(this.x-7,sy,5,10);
      ctx.fillStyle='rgba(10,15,24,.78)';ctx.fillRect(0,0,W,27);
      KF.Font.draw(ctx,'THE ASCENT',8,5,'#fff2d1',1);
      KF.Font.draw(ctx,`${Math.max(0,Math.floor((2701-this.y)/26))}m  BEST ${this.best}m`,W-8,5,'#f6cf75',1,'right');
      KF.Font.draw(ctx,`FALLS ${this.falls}`,W-8,16,'#d1e8e8',1,'right');
      ctx.fillStyle='#344153';ctx.fillRect(4,34,3,H-42);
      ctx.fillStyle='#e8bd75';ctx.fillRect(4,34,3,(H-42)*clamp((2701-this.y)/2610,0,1));
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
