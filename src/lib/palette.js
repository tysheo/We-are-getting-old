import * as THREE from 'three'

// One muted, dusk/sepia/ash palette so the whole piece reads as a single
// graded film. Everything imports from here — never hardcode colours elsewhere.
export const PALETTE = {
  void: '#0a0908', // background black-brown
  ash: '#3a352f', // cool grey-brown
  dust: '#6b6258', // mid neutral
  bone: '#cfc4b4', // pale paper
  paper: '#e8ddcb', // light cream
  flesh: '#c9a48a', // skin / warm mid
  flower: '#e7b27a', // warm accent (the one living colour)
  flowerGlow: '#f0c98a',
  bruise: '#7d6b78', // dusty mauve, for shadow/intimacy
  water: '#26343a', // deep teal-grey
  waterGlow: '#4a6470',
}

// Per-act mood tint (multiplied into sprites / used for fog + haze) so each
// movement has its own air while staying in the same grade.
export const ACT_MOOD = {
  1: { fog: '#0f0d0b', haze: '#2a2520', tint: '#cdbfa8' }, // earth, sealed
  2: { fog: '#13100c', haze: '#3a2c1f', tint: '#e4c79b' }, // warming, opening
  3: { fog: '#0c0b0d', haze: '#241f26', tint: '#b9aeb2' }, // archive, drift
  4: { fog: '#0d0c0b', haze: '#26221d', tint: '#c2b3a3' }, // quiet, time
  5: { fog: '#0a0e10', haze: '#1b2a30', tint: '#9fb0b4' }, // water, release
}

export const color = (hex) => new THREE.Color(hex)
