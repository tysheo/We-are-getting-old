// Fragment: dissolves a texture downward into water. As uProgress 0->1 the
// skin bleeds down, features soften, and the image erodes via value noise.
precision highp float;

uniform sampler2D uTex;
uniform float uProgress;
uniform float uTime;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}

void main(){
  // bleed the sample point downward over time
  vec2 uv = vUv;
  float bleed = uProgress * 0.25;
  uv.y += bleed * (0.4 + 0.6 * noise(uv * 6.0 + uTime * 0.2));
  // soften features as we dissolve
  vec4 col = texture2D(uTex, uv);
  float n = noise(vUv * 8.0 + uTime * 0.15);
  // erode from the bottom up
  float edge = smoothstep(uProgress - 0.15, uProgress + 0.15, vUv.y * 0.6 + n * 0.5);
  float alpha = col.a * edge;
  // tint toward water as it goes
  col.rgb = mix(col.rgb, vec3(0.18, 0.26, 0.30), uProgress * 0.6);
  gl_FragColor = vec4(col.rgb, alpha);
  if (alpha < 0.01) discard;
}
