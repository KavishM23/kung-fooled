'use strict';
// On-screen buttons for phones and tablets. Each button holds down the same key a keyboard player
// would press, so the game sees no difference. Only shown on touch screens. Menus already work by
// tapping, through the canvas's pointer events.
(function (KF) {
  const BUTTONS = [
    { id: 'left', label: '◀', key: 'KeyA', side: 'l' },
    { id: 'right', label: '▶', key: 'KeyD', side: 'l' },
    { id: 'block', label: 'BLOCK', key: 'KeyS', side: 'r', fight: true },
    { id: 'punch', label: 'PUNCH', key: 'KeyJ', side: 'r', fight: true },
    { id: 'kick', label: 'KICK', key: 'KeyK', side: 'r', fight: true },
    { id: 'special', label: 'SPECIAL', key: 'KeyL', side: 'r', fight: true },
    { id: 'jump', label: 'JUMP', key: 'KeyW', side: 'r', big: true },
  ];
  const CSS = `
    #kf-touch { position: fixed; inset: auto 0 0 0; display: flex; justify-content: space-between; align-items: flex-end;
      padding: 0 max(14px, env(safe-area-inset-right)) max(14px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));
      pointer-events: none; user-select: none; -webkit-user-select: none; touch-action: none; z-index: 5; }
    #kf-touch .grp { display: flex; gap: 10px; align-items: flex-end; pointer-events: none; }
    #kf-touch .grp.r { flex-wrap: wrap; justify-content: flex-end; max-width: 300px; }
    #kf-touch button { pointer-events: auto; touch-action: none; width: 64px; height: 64px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.35); background: rgba(20,12,36,0.45); color: #fff;
      font: bold 12px monospace; letter-spacing: 1px; }
    #kf-touch button.big { width: 84px; height: 84px; font-size: 14px; background: rgba(255,208,64,0.3); }
    #kf-touch button.on { background: rgba(255,208,64,0.75); color: #1a1020; }
    #kf-touch:not(.fight) button.fight { display: none; }
  `;
  KF.Touch = {
    attach(input) {
      const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      if (!coarse && !/[?&]touch=1/.test(window.location.search)) return; // ?touch=1 forces them on a desktop for testing
      const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
      const root = document.createElement('div'); root.id = 'kf-touch';
      const groups = { l: document.createElement('div'), r: document.createElement('div') };
      groups.l.className = 'grp l'; groups.r.className = 'grp r';
      root.append(groups.l, groups.r);
      for (const b of BUTTONS) {
        const el = document.createElement('button');
        el.textContent = b.label; el.setAttribute('aria-label', b.id);
        el.className = (b.big ? 'big ' : '') + (b.fight ? 'fight' : '');
        const press = (e) => {
          e.preventDefault(); el.setPointerCapture && el.setPointerCapture(e.pointerId);
          if (!input.down.has(b.key)) input.pressed.add(b.key);
          input.down.add(b.key); input.scheme = 'wasd'; el.classList.add('on');
          KF.Audio.unlock();
        };
        const release = (e) => { e.preventDefault(); input.down.delete(b.key); el.classList.remove('on'); };
        el.addEventListener('pointerdown', press);
        el.addEventListener('pointerup', release);
        el.addEventListener('pointercancel', release);
        el.addEventListener('contextmenu', (e) => e.preventDefault());
        groups[b.side].appendChild(el);
      }
      document.body.appendChild(root);
      // Fight buttons only during fights; nothing at all on menus, where you tap the screen.
      setInterval(() => {
        const sc = KF.engine && KF.engine.scene;
        const fight = !!(KF.FightScene && sc instanceof KF.FightScene), play = !!(KF.PlayScene && sc instanceof KF.PlayScene);
        root.classList.toggle('fight', fight);
        root.style.display = fight || play ? 'flex' : 'none';
      }, 200);
    },
  };
})(window.KF);
