// EMBER v2 — сцена «Огонь и время». Система шаблона GetLayers «Laocoön — Bronze and Time»:
// облёт камеры по прокрутке, искры кузни, фоновые волны расплавленного металла, побуквенные титры.
// Вместо бронзовой статуи — процедурная «подушка» раскалённых углей (шейдер), без 3D-модели.
// Three.js грузится лениво после load; при «уменьшить движение» сцены нет — статичный постер.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const stage = document.querySelector('.stage');
const root = document.documentElement;

// --- 1. оверлей: побуквенные титры, слайды, точки сетки, «истории» (работает без WebGL) ---
document.querySelectorAll('.slide-title').forEach(t => {
  let n = 0;
  t.innerHTML = t.innerHTML.split(/(<br\s*\/?>)/i).map(part => /^<br/i.test(part) ? part
    : [...part].map(ch => ch === ' ' ? ' ' : `<span class="char" style="transition-delay:${(n++ * 0.035).toFixed(3)}s">${ch}</span>`).join('')).join('');
});
const slides = [...document.querySelectorAll('.slide')];
const masks = { 1: document.getElementById('mask-2'), 2: document.getElementById('mask-3') };
const RANGES = [[-0.10, 0.12], [0.28, 0.40], [0.56, 0.68], [0.84, 1.05]];
const fills = [...document.querySelectorAll('.story-dash i')];
const dots = [...document.querySelectorAll('.grid-dot')];

const stageProgress = () => {
  const max = stage.offsetHeight - innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
};
const armVideo = v => {
  if (reduce || v.dataset.armed) return;
  v.dataset.armed = 1;
  const base = v.dataset.src + (v.getBoundingClientRect().width * (devicePixelRatio || 1) <= 1000 ? '-sm' : '');
  v.innerHTML = `<source src="${base}.av1.mp4" type='video/mp4; codecs="av01.0.08M.10"'><source src="${base}.mp4" type="video/mp4">`;
  v.load();
};
const updateOverlay = p => {
  slides.forEach((s, i) => {
    const on = p >= RANGES[i][0] && p <= RANGES[i][1];
    s.classList.toggle('active', on);
    const m = masks[i];
    if (m) {
      m.classList.toggle('active', on);
      const v = m.querySelector('video');
      if (on) { armVideo(v); if (!reduce) v.play().catch(() => {}); } else v.pause();
    }
  });
  fills.forEach((f, i) => f.style.setProperty('--f', (Math.min(1, Math.max(0, p * 4 - i)) * 100).toFixed(1) + '%'));
  dots.forEach((d, i) => d.style.setProperty('--d', (18 + ((p * 60 + i * 13) % 64)).toFixed(1) + '%'));
  document.body.classList.toggle('on-stage', stage.getBoundingClientRect().bottom > innerHeight * 0.5);
  root.style.setProperty('--fade', Math.min(1, Math.max(0, (p - 0.9) / 0.1)).toFixed(3));
};
if (!reduce) {
  let raf = 0;
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; updateOverlay(stageProgress()); }); }, { passive: true });
  updateOverlay(stageProgress());
} else slides.forEach(s => s.classList.add('active'));

// активный пункт меню
const navLinks = [...document.querySelectorAll('.nav-link')];
const navIo = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  navLinks.forEach(a => a.getAttribute('href') === '#' + e.target.id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
}), { rootMargin: '-45% 0px -50% 0px' });
navLinks.forEach(a => { const t = document.querySelector(a.getAttribute('href')); if (t) navIo.observe(t); });

// --- 2. двойной курсор: только мышь, только над сценой ---
let cx = innerWidth / 2, cy = innerHeight / 2, ox = cx, oy = cy, tmx = 0, tmy = 0;
const cin = document.querySelector('.cursor-inner'), cout = document.querySelector('.cursor-outer');
addEventListener('pointermove', e => {
  cx = e.clientX; cy = e.clientY;
  tmx = e.clientX / innerWidth * 2 - 1; tmy = e.clientY / innerHeight * 2 - 1;
  if (fine) { cin.style.left = cx + 'px'; cin.style.top = cy + 'px'; }
}, { passive: true });

// --- 3. WebGL-сцена: лениво, только если есть WebGL и движение разрешено ---
const hasGL = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; } })();
if (!reduce && hasGL) {
  const start = () => Promise.all([import('three'), import('three/addons/postprocessing/EffectComposer.js'), import('three/addons/postprocessing/RenderPass.js'), import('three/addons/postprocessing/UnrealBloomPass.js')])
    .then(([THREE, a, b, c]) => initScene(THREE, { ...a, ...b, ...c })).catch(() => {});
  const idle = window.requestIdleCallback || (f => setTimeout(f, 200));
  document.readyState === 'complete' ? idle(start) : addEventListener('load', () => idle(start), { once: true });
}

function initScene(THREE, { EffectComposer, RenderPass, UnrealBloomPass }) {
  const canvas = document.getElementById('webgl');
  const small = innerWidth < 861;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#000000');
  scene.fog = new THREE.FogExp2('#000000', 0.01);
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0.2, 3.0);
  scene.add(camera);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: false, powerPreference: 'high-performance' });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // как при прямом рендере: композер иначе кодирует в sRGB и высвечивает тёмный фон
  renderer.toneMappingExposure = 2.2;

  const clock = new THREE.Clock();
  const U = { uTime: { value: 0 }, uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) }, uMouse: { value: new THREE.Vector2() }, uScroll: { value: 0 } };

  // фон: волны расплавленного металла шаблона; палитра медь → угольно-красный жар (вместо сапфира)
  const NOISE = 'float hash(float n){return fract(sin(n)*43758.5453123);}';
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShaderMaterial({
    uniforms: U, depthWrite: false, depthTest: false,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `uniform float uTime;uniform vec2 uResolution;uniform vec2 uMouse;uniform float uScroll;${NOISE}
    void main(){
      vec2 uv=(gl_FragCoord.xy-0.5*uResolution.xy)/uResolution.y;float aspect=uResolution.x/uResolution.y;
      float time=uTime*0.08;float scroll=uScroll;float sd=scroll*5.0;vec2 w=uv;
      w.x+=sin(uv.y*2.5+time*0.2+sd)*0.35;w.y+=cos(uv.x*2.5-time*0.15-sd*0.8)*0.35;
      w.x+=sin(uv.y*1.2-time*0.1-sd*1.5)*0.25;w.y+=cos(uv.x*1.2+time*0.18+sd*1.2)*0.25;
      w+=vec2(scroll*0.04,-scroll*0.02)+vec2(uMouse.x*aspect*0.05,uMouse.y*0.05);
      vec2 d1=vec2(cos(0.6),sin(0.6)),d2=vec2(cos(-0.7),sin(-0.7)),d3=vec2(cos(1.2),sin(1.2));
      float w1=sin(dot(w,d1)*2.4+time);float w2=cos(dot(w,d2)*3.2-time*1.4+w1*0.4);float w3=sin(dot(w,d3)*4.0+time*1.8+w2*0.5);
      float f=w1*0.50+w2*0.35+w3*0.15;
      float crest=pow(max(0.0,1.0-abs(f-0.1)),2.5)*0.5+pow(max(0.0,1.0-abs(f-0.15)),8.0)*0.9;
      float t=smoothstep(0.0,1.0,scroll);
      vec3 cs=mix(vec3(0.0010,0.0006,0.0004),vec3(0.0009,0.0003,0.0002),t);
      vec3 c1=mix(vec3(0.085,0.040,0.015),vec3(0.070,0.018,0.006),t);
      vec3 c2=mix(vec3(0.050,0.022,0.008),vec3(0.032,0.009,0.004),t);
      vec3 cc=mix(vec3(0.45,0.30,0.18),vec3(0.60,0.17,0.05),t);
      vec3 col=cs;col=mix(col,c2,smoothstep(-0.6,0.2,f));col=mix(col,c1,smoothstep(0.0,0.8,f));col+=cc*crest*1.4;
      col*=1.0-dot(uv,uv)*0.12;gl_FragColor=vec4(col,1.0);
    }`
  }));
  bg.position.set(0, 0, -8); bg.renderOrder = -10; camera.add(bg);

  // объект сцены: куча раскалённых углей в 3D — куски неправильной формы (икосаэдры со смещением),
  // трещины светятся изнутри и мерцают у каждого куска по-своему, снизу куча жарче; ореол даёт Bloom
  const lumpGeo = new THREE.IcosahedronGeometry(.16, small ? 1 : 2), lp = lumpGeo.attributes.position, tmp = new THREE.Vector3();
  for (let i = 0; i < lp.count; i++) { tmp.fromBufferAttribute(lp, i).multiplyScalar(.75 + Math.random() * .45); lp.setXYZ(i, tmp.x, tmp.y * .7, tmp.z); }
  lumpGeo.computeVertexNormals();
  const coalMat = new THREE.MeshStandardMaterial({ color: '#1a1412', roughness: .95, metalness: 0 });
  coalMat.onBeforeCompile = sh => {
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aSeed;varying vec3 vW;varying float vSeed;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvW=(modelMatrix*instanceMatrix*vec4(transformed,1.)).xyz;vSeed=aSeed;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uTime;varying vec3 vW;varying float vSeed;
float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+1.),f.x),f.y),f.z);}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
float cr=abs(n3(vW*9.+vSeed*10.)-.5);float crack=smoothstep(.07,.0,cr);
float fl=.55+.45*sin(uTime*(1.+vSeed*2.)+vSeed*40.);float under=smoothstep(-.35,-.8,vW.y);
float heat=(crack*.9+under*.35)*fl;
totalEmissiveRadiance+=mix(vec3(.7,.08,.0),vec3(1.,.55,.15),heat)*heat*2.2;`);
  };
  const N = small ? 90 : 140, seeds = new Float32Array(N);
  const coals = new THREE.InstancedMesh(lumpGeo, coalMat, N), mtx = new THREE.Matrix4(), qt = new THREE.Quaternion(), eu = new THREE.Euler();
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 1.15, s = .7 + Math.random() * .8;
    eu.set(Math.random() * 3, Math.random() * 3, Math.random() * 3); qt.setFromEuler(eu);
    mtx.compose(new THREE.Vector3(Math.cos(a) * r, (1.2 - r) * .18 + Math.random() * .12, Math.sin(a) * r), qt, new THREE.Vector3(s, s, s));
    coals.setMatrixAt(i, mtx); seeds[i] = Math.random();
  }
  lumpGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  coals.position.y = -.75; coals.scale.setScalar(1.25);
  const glow = new THREE.PointLight('#ff6a1f', 5, 5, 1.6); glow.position.set(0, -.3, 0);
  scene.add(new THREE.HemisphereLight('#3a2418', '#000000', .4));
  const pivot = new THREE.Group(); pivot.add(coals, glow); scene.add(pivot);

  // искры кузни: аддитивные точки, 70 % оранжевые, 30 % добела раскалённые (вместо ледяных голубых)
  const count = small ? 220 : 450, data = [];
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos.set([(Math.random() - .5) * 6.5, (Math.random() - .5) * 5 - .5, (Math.random() - .5) * 6.5], i * 3);
    col.set(Math.random() < .7 ? [1, .4 + Math.random() * .15, .05 + Math.random() * .1] : [1, .86 + Math.random() * .1, .62 + Math.random() * .15], i * 3);
    data.push({ sx: (Math.random() - .5) * .4, sy: .15 + Math.random() * .3, sz: (Math.random() - .5) * .4, sw: .5 + Math.random() * 1.5, sr: .05 + Math.random() * .15, ph: Math.random() * Math.PI * 2 });
  }
  const tex = (() => { const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'); const g = x.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.85)'); g.addColorStop(.6, 'rgba(255,255,255,.3)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 16, 16); return new THREE.CanvasTexture(c); })();
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const sparks = new THREE.Points(sg, new THREE.PointsMaterial({ size: .025, vertexColors: true, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, map: tex }));
  scene.add(sparks);

  // ореол только у ярких трещин и искр: порог выше фоновых волн
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth * (small ? .5 : 1), innerHeight * (small ? .5 : 1)),   .8, .45, .92));
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); U.uResolution.value.set(innerWidth, innerHeight);
  });

  // цикл: рисуем, только пока сцена на экране и вкладка видна
  let cur = 0, mx = 0, my = 0, running = false;
  const look = new THREE.Vector3(), target = new THREE.Vector3();
  const frame = () => {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
    const tp = stageProgress();
    cur += (tp - cur) * .025; mx += (tmx - mx) * .05; my += (tmy - my) * .05;
    ox += (cx - ox) * .2; oy += (cy - oy) * .2;
    if (fine) { cout.style.left = ox + 'px'; cout.style.top = oy + 'px'; }
    pivot.rotation.y = mx * .25; pivot.rotation.x = my * .15;
    const vel = Math.abs(tp - cur), sp = 1 + vel * 9, turb = vel * .8, a = sg.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const k = i * 3, d = data[i], sway = d.sr * (1 + turb * 4);
      a[k] += d.sx * dt * sp + Math.sin(t * d.sw + d.ph) * sway * dt;
      a[k + 1] += d.sy * dt * sp;
      a[k + 2] += d.sz * dt * sp + Math.cos(t * d.sw + d.ph) * sway * dt;
      if (a[k + 1] > 3 || Math.abs(a[k]) > 3.5 || Math.abs(a[k + 2]) > 3.5) { a[k + 1] = -2.5; a[k] = (Math.random() - .5) * 3; a[k + 2] = (Math.random() - .5) * 3; }
    }
    sg.attributes.position.needsUpdate = true;
    // облёт 360° по прокрутке; на первом экране кадр сдвинут влево под колонки текста
    const phi = cur * Math.PI * 2, s = Math.sin(cur * Math.PI);
    const rad = 4.2 - s * .6;
    target.set(rad * Math.sin(phi), .35 + s * .8, rad * Math.cos(phi));
    const ease = (Math.cos(Math.min(1, cur / .28) * Math.PI) + 1) * .5;
    look.set(-.9 * ease, -.15, 0);
    camera.position.lerp(target, .025); camera.lookAt(look);
    U.uTime.value = t; U.uMouse.value.set(mx, -my); U.uScroll.value = cur;
    glow.intensity = 4.5 + Math.sin(t * 3.1) * .8 + Math.sin(t * 7.3) * .5; // свет от углей «дышит»
    composer.render();
  };
  const setRun = on => { if (on === running) return; running = on; if (on) { clock.getDelta(); requestAnimationFrame(frame); } };
  new IntersectionObserver(([e]) => setRun(e.isIntersecting && !document.hidden)).observe(stage);
  document.addEventListener('visibilitychange', () => setRun(!document.hidden && stage.getBoundingClientRect().bottom > 0));
  setRun(stage.getBoundingClientRect().bottom > 0);
  requestAnimationFrame(() => canvas.classList.add('on'));
}
