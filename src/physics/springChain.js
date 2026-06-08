// Lightweight spring physics for the flower-pull. Kept framework-free so it can
// be stepped from a useFrame loop. Two pieces:
//   - Spring:      a single damped scalar (drives `pullAmount`)
//   - SpringChain: a verlet chain (drives the stem's bend as you drag)

// Critically-dampable 1D spring. Call step(dt) each frame.
export class Spring {
  constructor({ value = 0, stiffness = 60, damping = 12 } = {}) {
    this.value = value
    this.target = value
    this.vel = 0
    this.stiffness = stiffness
    this.damping = damping
  }
  step(dt) {
    // clamp dt for stability on slow frames
    const h = Math.min(dt, 1 / 30)
    const a = this.stiffness * (this.target - this.value) - this.damping * this.vel
    this.vel += a * h
    this.value += this.vel * h
    return this.value
  }
}

// A chain of point masses connected by distance constraints (verlet). The head
// follows the pointer; the tail is pinned in the ground. Used to bend the stem
// with a tactile lag as the viewer drags.
export class SpringChain {
  constructor({ points = 6, length = 2, anchor = [0, 0, 0] } = {}) {
    this.seg = length / (points - 1)
    this.pts = []
    this.prev = []
    for (let i = 0; i < points; i++) {
      const p = [anchor[0], anchor[1] + i * this.seg, anchor[2]]
      this.pts.push(p)
      this.prev.push([...p])
    }
    this.anchor = [...anchor]
  }

  // head = pointer target [x,y,z]; gravity pulls unheld slack back down.
  step(dt, head, { gravity = -2, stiffness = 0.6, iterations = 6 } = {}) {
    const h = Math.min(dt, 1 / 30)
    const n = this.pts.length

    // verlet integrate
    for (let i = 1; i < n; i++) {
      const p = this.pts[i]
      const pr = this.prev[i]
      for (let k = 0; k < 3; k++) {
        const v = (p[k] - pr[k]) * 0.96
        pr[k] = p[k]
        p[k] += v
      }
      p[1] += gravity * h * h
    }

    // constraints
    for (let it = 0; it < iterations; it++) {
      // pin tail to the ground
      this.pts[0][0] = this.anchor[0]
      this.pts[0][1] = this.anchor[1]
      this.pts[0][2] = this.anchor[2]
      // pull head toward the pointer with some give
      if (head) {
        const hp = this.pts[n - 1]
        for (let k = 0; k < 3; k++) hp[k] += (head[k] - hp[k]) * stiffness
      }
      // keep segment lengths
      for (let i = 0; i < n - 1; i++) {
        const a = this.pts[i]
        const b = this.pts[i + 1]
        let dx = b[0] - a[0]
        let dy = b[1] - a[1]
        let dz = b[2] - a[2]
        const d = Math.hypot(dx, dy, dz) || 1e-5
        const diff = (d - this.seg) / d
        const m = diff * 0.5
        // tail end (i==0) is pinned, so push correction into the upper node
        const aMove = i === 0 ? 0 : 1
        a[0] += dx * m * aMove
        a[1] += dy * m * aMove
        a[2] += dz * m * aMove
        b[0] -= dx * m
        b[1] -= dy * m
        b[2] -= dz * m
      }
    }
    return this.pts
  }

  get head() {
    return this.pts[this.pts.length - 1]
  }
}
