// Fragment: a quiet reflective water surface / puddle. Uses an optional normal
// map (uNormal) for displacement-driven highlights; falls back to procedural
// ripples when no texture is supplied (uHasNormal = 0).
precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform sampler2D uNormal;
uniform float uHasNormal;
uniform float uOpacity;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}

void main(){
  vec2 uv = vUv;
  float t = uTime * 0.25;
  vec2 n;
  if (uHasNormal > 0.5) {
    n = texture2D(uNormal, uv * 2.0 + vec2(t * 0.1, t * 0.07)).rg * 2.0 - 1.0;
  } else {
    float a = noise(uv * 8.0 + t);
    float b = noise(uv * 8.0 - t * 1.3 + 5.0);
    n = vec2(a - b, b - a);
  }
  // fresnel-ish brightening + ripple highlights
  float ripple = noise(uv * 14.0 + n * 2.0 + t * 1.5);
  vec3 col = uColor + ripple * 0.12 + length(n) * 0.15;
  // soft radial puddle falloff
  float d = distance(uv, vec2(0.5));
  float mask = smoothstep(0.5, 0.2, d);
  gl_FragColor = vec4(col, uOpacity * mask);
}
