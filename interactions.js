document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const body = document.body;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  function setSize(delta) {
    const cur = parseFloat(getComputedStyle(root).getPropertyValue('--base-size')) || 20;
    root.style.setProperty('--base-size', Math.max(15, Math.min(32, cur + delta)) + 'px');
  }

  $('#fontPlus')?.addEventListener('click', () => setSize(1));
  $('#fontMinus')?.addEventListener('click', () => setSize(-1));
  $('#themeToggle')?.addEventListener('click', () => {
    body.classList.toggle('dark');
    drawAllCanvases();
  });

  const tocButton = $('#tocToggle');
  tocButton?.addEventListener('click', () => {
    const isOpen = body.classList.toggle('toc-open');
    tocButton.setAttribute('aria-expanded', String(isOpen));
    tocButton.textContent = isOpen ? '目次×' : '目次';
  });

  $('#fullscreenToggle')?.addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
      else await document.exitFullscreen?.();
    } catch (error) {
      console.warn('全画面表示を開始できませんでした．', error);
    }
  });

  $('#detailsToggle')?.addEventListener('click', () => {
    const ds = $$('details');
    const shouldOpen = ds.some((d) => !d.open);
    ds.forEach((d) => { d.open = shouldOpen; });
  });

  const progress = $('#progress');
  const updateProgress = () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.width = (h > 0 ? 100 * scrollY / h : 0) + '%';
  };
  addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  const tocLinks = $$('nav#TOC a[href^="#"]');
  const sections = tocLinks
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      tocLinks.forEach((a) => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + visible.target.id);
      });
    }, { rootMargin: '-10% 0px -75% 0px', threshold: [0, 1] });
    sections.forEach((s) => obs.observe(s));
  }

  const canvas = $('#growthCanvas');
  const slider = $('#epsSlider');
  const readout = $('#epsReadout');

  function nNorm(K, eps) {
    const num = Math.cosh(K) - 1 + eps * (Math.sinh(K) - K);
    const den = Math.sinh(K) + K + 2 * eps * Math.cosh(K)
      + eps * eps * (Math.sinh(K) - K);
    return num / (K * den);
  }

  function drawGrowth() {
    if (!canvas || !slider || !readout) return;
    const ctx = canvas.getContext('2d');
    const dpr = devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width, 600);
    const plotHeight = Math.max(230, Math.min(300, Math.round(window.innerHeight * 0.28)));
    canvas.width = width * dpr;
    canvas.height = plotHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const W = width, H = plotHeight, L = 88, R = 24, T = 20, B = 46;
    const eps = Math.pow(10, parseFloat(slider.value));
    readout.textContent = eps.toExponential(2);
    const xs = Array.from({ length: 500 }, (_, i) => 0.03 + i * (8 - 0.03) / 499);
    const ys = xs.map((x) => nNorm(x, eps));
    const ymax = Math.max(...ys) * 1.12;
    const fg = getComputedStyle(body).color;
    const grid = getComputedStyle(root).getPropertyValue('--border').trim();
    const blue = getComputedStyle(root).getPropertyValue('--blue-2').trim();

    ctx.clearRect(0, 0, W, H);
    ctx.font = '14px sans-serif';
    ctx.strokeStyle = grid;
    ctx.fillStyle = fg;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = T + (H - T - B) * i / 4;
      ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(W - R, y); ctx.stroke();
      const val = ymax * (1 - i / 4); ctx.fillText(val.toFixed(3), 8, y + 5);
    }
    for (let i = 0; i <= 8; i += 2) {
      const x = L + (W - L - R) * i / 8;
      ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, H - B); ctx.stroke();
      ctx.fillText(String(i), x - 4, H - B + 24);
    }
    ctx.strokeStyle = blue;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ys.forEach((y, i) => {
      const px = L + (W - L - R) * (xs[i] / 8);
      const py = H - B - (H - T - B) * (y / ymax);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();

    const im = ys.indexOf(Math.max(...ys));
    const km = xs[im], nm = ys[im];
    const px = L + (W - L - R) * (km / 8);
    const py = H - B - (H - T - B) * (nm / ymax);
    ctx.fillStyle = blue;
    ctx.beginPath(); ctx.arc(px, py, 6, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = fg;
    ctx.fillText(`K_m ≈ ${km.toFixed(2)}`, Math.min(px + 10, W - 125), Math.max(py - 10, 20));
    ctx.fillText('K = 2kh', W / 2 - 25, H - 12);
    ctx.save(); ctx.translate(26, H / 2 + 36); ctx.rotate(-Math.PI / 2);
    ctx.fillText('n μ₁/(g Δρ h)', 0, 0); ctx.restore();
  }

  function themeColors() {
    return {
      fg: getComputedStyle(body).color,
      muted: getComputedStyle(root).getPropertyValue('--muted').trim(),
      grid: getComputedStyle(root).getPropertyValue('--border').trim(),
      blue: getComputedStyle(root).getPropertyValue('--blue-2').trim(),
      accent: getComputedStyle(root).getPropertyValue('--accent').trim(),
      paper: getComputedStyle(root).getPropertyValue('--paper').trim(),
    };
  }

  function setupCanvas(target, minWidth = 620, minHeight = 300) {
    if (!target) return null;
    const ctx = target.getContext('2d');
    const dpr = devicePixelRatio || 1;
    const rect = target.getBoundingClientRect();
    const width = Math.max(rect.width, minWidth);
    const height = Math.max(rect.height, minHeight);
    target.width = Math.round(width * dpr);
    target.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return { ctx, width, height };
  }

  const waveCanvas = $('#waveCanvas');
  const waveKSlider = $('#waveKSlider');
  const waveKReadout = $('#waveKReadout');
  const wavePlay = $('#wavePlay');
  const waveReset = $('#waveReset');
  const waveStatus = $('#waveStatus');
  let waveTime = 0;
  let waveRunning = false;
  let waveLast = 0;
  let waveFrame = null;

  function kmForEps(eps = 1) {
    let bestK = 1, bestN = -Infinity;
    for (let i = 0; i < 900; i++) {
      const K = 0.03 + i * (8 - 0.03) / 899;
      const n = nNorm(K, eps);
      if (n > bestN) { bestN = n; bestK = K; }
    }
    return { K: bestK, n: bestN };
  }

  function drawWaveGrowth() {
    if (!waveCanvas || !waveKSlider) return;
    const setup = setupCanvas(waveCanvas, 640, 320);
    if (!setup) return;
    const { ctx, width: W, height: H } = setup;
    const c = themeColors();
    const eps = 1;
    const km = kmForEps(eps).K;
    const selectedK = parseFloat(waveKSlider.value);
    if (waveKReadout) waveKReadout.textContent = selectedK.toFixed(2);

    const cases = [
      { label: 'K < K_m', K: 0.58 * km, color: c.muted },
      { label: 'K = K_m ≈ 1.79', K: km, color: c.blue },
      { label: 'K > K_m', K: 1.85 * km, color: c.accent },
      { label: 'slider K', K: selectedK, color: '#4d8f5a' },
    ];
    const A0 = 8;
    const maxAmp = 72;
    const growthScale = 13;
    const amps = cases.map((d) => A0 * Math.exp(nNorm(d.K, eps) * waveTime * growthScale));
    const outside = amps.some((a) => a > maxAmp);
    if (outside) {
      waveRunning = false;
      if (wavePlay) wavePlay.textContent = '再生';
    }

    ctx.fillStyle = c.paper;
    ctx.fillRect(0, 0, W, H);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = c.fg;
    ctx.strokeStyle = c.grid;
    ctx.lineWidth = 1;
    const left = 76, right = 116, top = 30;
    const rowH = (H - 62) / cases.length;
    const maxFactor = maxAmp / A0;
    for (let r = 0; r < cases.length; r++) {
      const baseY = top + rowH * (r + 0.5);
      ctx.strokeStyle = c.grid;
      ctx.beginPath(); ctx.moveTo(left, baseY); ctx.lineTo(W - right, baseY); ctx.stroke();
      ctx.fillStyle = c.fg;
      ctx.fillText(`${cases[r].label}  K=${cases[r].K.toFixed(2)}`, 8, baseY - 10);
      ctx.fillText(`n=${nNorm(cases[r].K, eps).toFixed(3)}`, 8, baseY + 10);
      const amp = Math.min(amps[r], maxAmp);
      ctx.strokeStyle = cases[r].color;
      ctx.lineWidth = r === 1 ? 3 : 2;
      ctx.beginPath();
      for (let i = 0; i <= 420; i++) {
        const x = left + (W - left - right) * i / 420;
        const phaseX = 2 * Math.PI * i / 420;
        const y = baseY - amp * Math.cos(cases[r].K * phaseX / km);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      const factor = amps[r] / A0;
      const barX = W - right + 18;
      const barY = baseY - 16;
      const barW = 78;
      ctx.strokeStyle = c.grid;
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barW, 10);
      ctx.fillStyle = cases[r].color;
      ctx.fillRect(barX, barY, Math.min(barW, barW * factor / maxFactor), 10);
      ctx.fillStyle = r === 1 ? c.blue : c.fg;
      ctx.fillText(`${factor.toFixed(1)}x`, barX, baseY + 17);
    }
    ctx.fillStyle = outside ? c.accent : c.muted;
    const selectedN = nNorm(selectedK, eps);
    const msg = outside
      ? `t = ${waveTime.toFixed(2)}  n(K)=${selectedN.toFixed(3)}  線形理論の適用外`
      : `t = ${waveTime.toFixed(2)}  n(K)=${selectedN.toFixed(3)}`;
    if (waveStatus) waveStatus.textContent = msg;
    ctx.fillText(msg, left, H - 18);
    ctx.fillText(`最大は K_m ≈ ${km.toFixed(2)}（ε=1）`, W - 210, H - 18);
  }

  function animateWave(ts) {
    if (!waveRunning) return;
    if (!waveLast) waveLast = ts;
    const dt = Math.min(0.05, (ts - waveLast) / 1000);
    waveLast = ts;
    waveTime += dt;
    drawWaveGrowth();
    waveFrame = requestAnimationFrame(animateWave);
  }

  waveKSlider?.addEventListener('input', drawWaveGrowth);
  wavePlay?.addEventListener('click', () => {
    waveRunning = !waveRunning;
    wavePlay.textContent = waveRunning ? '停止' : '再生';
    waveLast = 0;
    if (waveRunning) waveFrame = requestAnimationFrame(animateWave);
    else if (waveFrame) cancelAnimationFrame(waveFrame);
  });
  waveReset?.addEventListener('click', () => {
    waveTime = 0;
    waveRunning = false;
    if (wavePlay) wavePlay.textContent = '再生';
    if (waveFrame) cancelAnimationFrame(waveFrame);
    drawWaveGrowth();
  });

  const qCanvas = $('#qLimitCanvas');
  const qDeltaSlider = $('#qDeltaSlider');
  const qDeltaReadout = $('#qDeltaReadout');

  function drawQLimit() {
    if (!qCanvas || !qDeltaSlider) return;
    const setup = setupCanvas(qCanvas, 640, 320);
    if (!setup) return;
    const { ctx, width: W, height: H } = setup;
    const c = themeColors();
    const k = 1;
    const delta = Math.pow(10, parseFloat(qDeltaSlider.value));
    const q = k + delta;
    if (qDeltaReadout) qDeltaReadout.textContent = delta.toFixed(3);
    ctx.fillStyle = c.paper;
    ctx.fillRect(0, 0, W, H);
    ctx.font = '14px sans-serif';
    const L = 58, R = 20, T = 18, mid = H * 0.49, B = 30;

    function drawAxes(y0, h, ymax, label) {
      ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(L, y0 + h); ctx.lineTo(W - R, y0 + h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(L, y0); ctx.lineTo(L, y0 + h); ctx.stroke();
      ctx.fillStyle = c.fg; ctx.fillText(label, L, y0 + 14);
      ctx.fillStyle = c.muted; ctx.fillText('z', W - R - 8, y0 + h + 20);
      return (z, val) => ({
        x: L + (W - L - R) * z / 2,
        y: y0 + h - h * val / ymax,
      });
    }

    const topMap = drawAxes(T, mid - T - 18, Math.exp(2.15), '上段: e^{kz} と e^{qz}');
    const bottomMap = drawAxes(mid + 14, H - mid - B - 14, 2 * Math.exp(2), '下段: 差商と ze^{kz}');
    const series = Array.from({ length: 240 }, (_, i) => 2 * i / 239);

    function strokeSeries(map, fn, color, width = 2) {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
      series.forEach((z, i) => {
        const p = map(z, fn(z));
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }
    strokeSeries(topMap, (z) => Math.exp(k * z), c.blue, 3);
    strokeSeries(topMap, (z) => Math.exp(q * z), c.accent, 2);
    strokeSeries(bottomMap, (z) => (Math.exp(q * z) - Math.exp(k * z)) / (q - k), c.accent, 2);
    strokeSeries(bottomMap, (z) => z * Math.exp(k * z), c.blue, 3);
    ctx.fillStyle = c.fg;
    ctx.fillText(`k=1, q=${q.toFixed(3)}`, W - 130, T + 15);
    ctx.fillStyle = c.blue; ctx.fillText('青: 極限', W - 115, H - 46);
    ctx.fillStyle = c.accent; ctx.fillText('茶: q側', W - 115, H - 25);
  }

  qDeltaSlider?.addEventListener('input', drawQLimit);

  const triadCanvas = $('#triadCanvas');
  const triadAngleSlider = $('#triadAngleSlider');
  const triadAngleReadout = $('#triadAngleReadout');
  const triadSumReadout = $('#triadSumReadout');
  const triadReset = $('#triadReset');
  const triadChecks = ['#mode1Check', '#mode2Check', '#mode3Check', '#interactionCheck'].map($);

  function drawTriad() {
    if (!triadCanvas || !triadAngleSlider) return;
    const setup = setupCanvas(triadCanvas, 760, 430);
    if (!setup) return;
    const { ctx, width: W, height: H } = setup;
    const c = themeColors();
    const theta = parseFloat(triadAngleSlider.value) * Math.PI / 180;
    const angleDeg = Math.round(theta * 180 / Math.PI);
    if (triadAngleReadout) triadAngleReadout.textContent = `${angleDeg}°`;
    const modes = [
      $('#mode1Check')?.checked ?? true,
      $('#mode2Check')?.checked ?? true,
      $('#mode3Check')?.checked ?? true,
    ];
    const showInteraction = $('#interactionCheck')?.checked ?? false;
    const vectors = [
      [1, 0],
      [Math.cos(theta), Math.sin(theta)],
      [Math.cos(2 * theta), Math.sin(2 * theta)],
    ];
    const sum = vectors.reduce((a, v) => [a[0] + v[0], a[1] + v[1]], [0, 0]);
    const sumMag = Math.hypot(sum[0], sum[1]);
    if (triadSumReadout) triadSumReadout.textContent = `|k₁+k₂+k₃| = ${sumMag.toFixed(2)}`;

    ctx.fillStyle = c.paper;
    ctx.fillRect(0, 0, W, H);
    ctx.font = '14px sans-serif';
    const panelW = Math.min(280, W * 0.38);
    const cx = panelW / 2, cy = H / 2;
    const scale = Math.min(panelW, H) * 0.28;
    ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, scale, 0, 2 * Math.PI); ctx.stroke();
    const colors = [c.blue, c.accent, '#4d8f5a'];
    vectors.forEach((v, i) => {
      ctx.strokeStyle = colors[i]; ctx.fillStyle = colors[i]; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + scale * v[0], cy - scale * v[1]); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + scale * v[0], cy - scale * v[1], 4, 0, 2 * Math.PI); ctx.fill();
      ctx.fillText(`k${i + 1}`, cx + scale * v[0] + 6, cy - scale * v[1] + 4);
    });
    ctx.strokeStyle = sumMag < 0.08 ? c.blue : c.accent;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + scale * sum[0], cy - scale * sum[1]); ctx.stroke();
    ctx.fillStyle = c.fg;
    ctx.fillText('波数ベクトル', 18, 24);

    const x0 = Math.round(panelW + 18), y0 = 24;
    const size = Math.max(120, Math.floor(Math.min(W - x0 - 18, H - 70)));
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = size;
    patternCanvas.height = size;
    const patternCtx = patternCanvas.getContext('2d');
    const img = patternCtx.createImageData(size, size);
    const L = 5 * Math.PI;
    const values = new Float32Array(size * size);
    let maxAbs = 0;
    let idx = 0;
    for (let py = 0; py < size; py++) {
      const y = L * (py / size - 0.5);
      for (let px = 0; px < size; px++) {
        const x = L * (px / size - 0.5);
        let eta = 0;
        vectors.forEach((v, i) => {
          if (modes[i]) eta += Math.cos(v[0] * x + v[1] * y);
        });
        if (showInteraction) {
          const a = vectors[0][0] * x + vectors[0][1] * y;
          const b = vectors[1][0] * x + vectors[1][1] * y;
          eta += 0.65 * Math.cos(a) * Math.cos(b);
        }
        values[py * size + px] = eta;
        maxAbs = Math.max(maxAbs, Math.abs(eta));
      }
    }
    maxAbs = Math.max(maxAbs, 1);
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const raw = values[py * size + px] / maxAbs;
        const normalized = Math.max(-1, Math.min(1, raw));
        const pos = Math.max(0, normalized);
        const neg = Math.max(0, -normalized);
        const contour = Math.abs(raw) < 0.025 ? 32 : 0;
        img.data[idx++] = Math.max(0, Math.min(255, Math.round(244 - 38 * pos + 10 * neg - contour)));
        img.data[idx++] = Math.max(0, Math.min(255, Math.round(247 - 72 * pos - 28 * neg - contour)));
        img.data[idx++] = Math.max(0, Math.min(255, Math.round(250 - 112 * neg - 12 * pos - contour)));
        img.data[idx++] = 255;
      }
    }
    patternCtx.putImageData(img, 0, 0);
    ctx.drawImage(patternCanvas, x0, y0, size, size);
    ctx.fillStyle = 'rgba(36, 75, 116, 0.48)';
    for (let py = 0; py < size; py += 3) {
      for (let px = 0; px < size; px += 3) {
        if (values[py * size + px] > 0.88 * maxAbs) {
          ctx.fillRect(x0 + px, y0 + py, 2, 2);
        }
      }
    }
    ctx.strokeStyle = c.grid; ctx.lineWidth = 1; ctx.strokeRect(x0, y0, size, size);
    ctx.fillStyle = c.fg;
    ctx.fillText('平面パターン η(x,y)', x0, y0 + size + 24);
    if (showInteraction) {
      ctx.fillStyle = c.muted;
      ctx.fillText('二次項: 1/2 cos[(k₁+k₂)·x] + 1/2 cos[(k₁-k₂)·x]', x0, y0 + size + 44);
    }
    if (Math.abs(angleDeg - 120) <= 2) {
      ctx.fillStyle = c.blue;
      ctx.fillText('120°: 六角格子が閉じる', x0 + size - 155, y0 + 18);
    }
  }

  triadAngleSlider?.addEventListener('input', drawTriad);
  triadReset?.addEventListener('click', () => {
    if (!triadAngleSlider) return;
    triadAngleSlider.value = '120';
    drawTriad();
  });
  triadChecks.forEach((el) => el?.addEventListener('change', drawTriad));

  function drawAllCanvases() {
    drawGrowth();
    drawWaveGrowth();
    drawQLimit();
    drawTriad();
  }

  slider?.addEventListener('input', drawGrowth);
  addEventListener('resize', drawAllCanvases);
  drawAllCanvases();
});
