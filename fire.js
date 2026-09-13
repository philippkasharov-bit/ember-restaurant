// Живой огонь первого экрана: WebGL-шейдер тлеющих углей и искр.
// Прогрессивное улучшение: без WebGL или при «уменьшить движение» остаётся фото.
(() => {
  const hero = document.querySelector('.hero');
  if (!hero || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'fire';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false, alpha: true });
  if (!gl) return;
  hero.prepend(canvas);

  const vert = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  // Фрактальный шум даёт языки пламени у нижнего края, отдельный слой — поднимающиеся искры.
  const frag = `
  precision mediump float;
  uniform vec2 res; uniform float t; uniform vec2 m; uniform float cool;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.02;a*=.5;}return v;}
  void main(){
    vec2 uv=gl_FragCoord.xy/res; float ar=res.x/res.y;
    vec2 q=vec2(uv.x*ar,uv.y);
    // тепло тянется к курсору
    float pull=exp(-6.*length((uv-m)*vec2(ar,1.)))*.35;
    float base=fbm(vec2(q.x*2.2,q.y*3.-t*1.1))+fbm(vec2(q.x*4.5+t*.2,q.y*6.-t*2.));
    float heat=clamp((1.05-uv.y*1.9)+base*.55-.55+pull,0.,1.);
    heat*=1.-cool*.8;
    vec3 col=mix(vec3(.05,.02,.01),vec3(.62,.16,.03),smoothstep(.15,.55,heat));
    col=mix(col,vec3(.95,.48,.12),smoothstep(.5,.8,heat));
    col=mix(col,vec3(1.,.82,.5),smoothstep(.8,.98,heat));
    float a=smoothstep(.12,.6,heat)*.9;
    // искры
    float sp=0.;
    for(int i=0;i<3;i++){
      float fi=float(i); vec2 g=vec2(q.x*(18.+fi*9.),uv.y*(10.+fi*5.)-t*(1.2+fi*.5));
      vec2 id=floor(g), f=fract(g)-.5; float r=h(id+fi);
      f.x+=sin(t*2.+r*6.28)*.25;
      sp+=step(.93,r)*smoothstep(.09,0.,length(f))*(1.-uv.y)*(1.-cool);
    }
    col+=vec3(1.,.6,.2)*sp; a=max(a,sp);
    gl_FragColor=vec4(col,a);
  }`;

  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vert));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const U = k => gl.getUniformLocation(prog, k);
  const uRes = U('res'), uT = U('t'), uM = U('m'), uCool = U('cool');

  // рендер в половинном разрешении — огонь мягкий, а GPU не нагружается
  const resize = () => {
    const s = Math.min(devicePixelRatio, 1.5) * .5;
    canvas.width = hero.clientWidth * s; canvas.height = hero.clientHeight * s;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  };
  addEventListener('resize', resize); resize();

  let mx = .5, my = .2, tx = .5, ty = .2;
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width; ty = 1 - (e.clientY - r.top) / r.height;
  });

  let visible = true, raf = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop); }).observe(hero);
  const t0 = performance.now();
  function loop(now) {
    raf = 0; if (!visible || document.hidden) return;
    mx += (tx - mx) * .06; my += (ty - my) * .06;
    const cool = Math.min(1, Math.max(0, scrollY / hero.clientHeight));
    gl.uniform1f(uT, (now - t0) / 1000);
    gl.uniform2f(uM, mx, my);
    gl.uniform1f(uCool, cool);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !raf) raf = requestAnimationFrame(loop); });
  raf = requestAnimationFrame(loop);
})();
