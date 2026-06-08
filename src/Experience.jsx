import { useStore, ACTS } from './store.js'
import Act1_Pull from './acts/Act1_Pull.jsx'
import Act2_Bloom from './acts/Act2_Bloom.jsx'
import Act3_Tunnel from './acts/Act3_Tunnel.jsx'
import Act4_Aging from './acts/Act4_Aging.jsx'
import Act5_Dissolve from './acts/Act5_Dissolve.jsx'

// Mounts exactly one act at a time. Each act owns its own lighting, camera
// choreography and resource lifecycle, and disposes when it unmounts.
export default function Experience() {
  const act = useStore((s) => s.act)

  switch (act) {
    case ACTS.PULL:
      return <Act1_Pull />
    case ACTS.BLOOM:
      return <Act2_Bloom />
    case ACTS.TUNNEL:
      return <Act3_Tunnel />
    case ACTS.AGING:
      return <Act4_Aging />
    case ACTS.DISSOLVE:
      return <Act5_Dissolve />
    default:
      return null
  }
}
