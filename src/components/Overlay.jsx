import { useStore, ACTS } from '../store.js'

const ACT_NAMES = {
  [ACTS.PULL]: 'pull',
  [ACTS.BLOOM]: 'bloom',
  [ACTS.TUNNEL]: 'tunnel',
  [ACTS.AGING]: 'aging',
  [ACTS.DISSOLVE]: 'dissolve',
}

// Minimal DOM layer: dev HUD + an act-specific prompt. The finished message
// "close to you" is rendered in-scene (Act 5), not here.
export default function Overlay() {
  const { act, debug, pullAmount } = useStore()

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
      {act === ACTS.PULL && (
        <Hint>pull</Hint>
      )}
      {act === ACTS.BLOOM && <Hint>open</Hint>}

      {debug && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            font: '12px ui-monospace, monospace',
            color: '#cfc9bf',
            background: 'rgba(0,0,0,0.4)',
            padding: '8px 10px',
            borderRadius: 6,
            lineHeight: 1.6,
            whiteSpace: 'pre',
          }}
        >
          {`act ${act} — ${ACT_NAMES[act]}\npull ${pullAmount.toFixed(2)}\n[d] hud  [r] reset`}
        </div>
      )}
    </div>
  )
}

function Hint({ children }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 36,
        left: 0,
        right: 0,
        textAlign: 'center',
        color: 'rgba(220,214,205,0.5)',
        fontSize: 14,
        letterSpacing: '0.4em',
        textTransform: 'lowercase',
        animation: 'breathe 3.6s ease-in-out infinite',
      }}
    >
      {children}
      <style>{`@keyframes breathe {0%,100%{opacity:.25}50%{opacity:.6}}`}</style>
    </div>
  )
}
