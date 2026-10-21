'use strict';
// Chunky arcade lettering ("ROUND 1", "K.O.", "PERFECT"): the 5x7 font made bold and italic,
// filled with a vertical metal/fire gradient, double outlined, cached as canvases.
(function (KF) {
  const STYLES = {
    fire: { ramp: ['#fffbd0', '#ffe060', '#ffb020', '#ff7010', '#e03810'], out: '#2a0808', out2: '#ffffff' },
    steel: { ramp: ['#ffffff', '#e0ecff', '#a8c4ec', '#6a8ac8', '#3a5aa0'], out: '#0a1030', out2: '#ffffff' },
    blood: { ramp: ['#ffe0d0', '#ff7a60', '#ff3020', '#c01010', '#700808'], out: '#1a0000', out2: '#ffe060' },
    gold: { ramp: ['#ffffff', '#fff2a0', '#ffd040', '#e09a10', '#a05a08'], out: '#2a1400', out2: '#ffffff' },
    neon: { ramp: ['#ffffff', '#ffc8f0', '#ff6ad0', '#c030b0', '#7a1878'], out: '#1a0420', out2: '#ffffff' },
    mint: { ramp: ['#ffffff', '#d8fff0', '#7ef0c8', '#22b890', '#0a6a5a'], out: '#02201a', out2: '#ffffff' },
  };
  const cache = new Map();

  function glyphGrid(text) {
    // Rasterise the bitmap font into a boolean grid, each glyph emboldened by 1 column,
    // with a 2px gap so letters never merge.
    const ADV = 8;
    const c = KF.makeCanvas(text.length * ADV + 2, 9), x = c.getContext('2d');
    for (let i = 0; i < text.length; i++) {
      const narrow = '.,:!\'()'.includes(text[i]);
      const gx = 1 + i * ADV - (narrow ? 2 : 0);
      KF.Font.draw(x, text[i], gx, 1, '#fff');
      KF.Font.draw(x, text[i], gx + 1, 1, '#fff');
    }
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const g = [];
    for (let y = 0; y < c.height; y++) { g.push([]); for (let xx = 0; xx < c.width; xx++) g[y].push(d[(y * c.width + xx) * 4 + 3] > 0); }
    return g;
  }

  function render(text, scale, styleName) {
    const key = text + '|' + scale + '|' + styleName;
    if (cache.has(key)) return cache.get(key);
    const st = STYLES[styleName] || STYLES.fire;
    const g = glyphGrid(text.toUpperCase());
    const gh = g.length, gw = g[0].length;
    const shear = Math.max(1, Math.round(scale * 0.25)); // italic slant per glyph row
    const pad = 4, w = gw * scale + gh * shear + pad * 2 + 4, h = gh * scale + pad * 2 + 4;
    const c = KF.makeCanvas(w, h), x = c.getContext('2d');
    const cell = (cx, cy, ox, oy) => [pad + cx * scale + (gh - cy) * shear + ox, pad + cy * scale + oy];
    const fillAll = (color, grow, ox = 0, oy = 0) => {
      x.fillStyle = color;
      for (let cy = 0; cy < gh; cy++) for (let cx = 0; cx < gw; cx++) if (g[cy][cx]) {
        const [px, py] = cell(cx, cy, ox, oy);
        x.fillRect(px - grow, py - grow, scale + grow * 2, scale + grow * 2);
      }
    };
    fillAll('#000000', 2, 3, 3);       // drop shadow
    fillAll(st.out2, 2);               // outer light rim
    fillAll(st.out, 1);                // dark outline
    // Gradient fill, banded per pixel row for a hand-shaded look.
    const top = pad + scale, bottom = pad + (gh - 1) * scale;
    for (let cy = 0; cy < gh; cy++) for (let cx = 0; cx < gw; cx++) if (g[cy][cx]) {
      const [px, py] = cell(cx, cy, 0, 0);
      for (let r = 0; r < scale; r++) {
        const f = (py + r - top) / Math.max(1, bottom - top);
        x.fillStyle = st.ramp[Math.max(0, Math.min(st.ramp.length - 1, Math.floor(f * st.ramp.length)))];
        x.fillRect(px, py + r, scale, 1);
      }
    }
    cache.set(key, c);
    return c;
  }

  KF.BigText = {
    STYLES,
    render,
    // Largest scale (up to `max`) at which `text` fits in `maxW` px.
    fit(text, maxW, max = 4) { let s = max; while (s > 1 && render(text, s, 'steel').width > maxW) s--; return s; },
    // Draw centred at (cx, cy). zoom stretches it (for slam-in), alpha fades.
    draw(ctx, text, cx, cy, scale, style, zoom = 1, alpha = 1) {
      const img = render(text, scale, style);
      const w = Math.round(img.width * zoom), h = Math.round(img.height * zoom);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
      ctx.restore();
    },
  };
})(window.KF);
