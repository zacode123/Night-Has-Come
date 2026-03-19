'use client';

type Color = 'red' | 'blue';

export default function FloatingInput({
  label,
  type = 'text',
  value,
  onChange,
  disabled = false,
  color = 'red',
}: {
  label: string;
  type?: string;
  value: string;
  onChange?: (e: any) => void;
  disabled?: boolean;
  color?: Color;
}) {
  const isFilled = value.length > 0;

  const t = {
    red: {
      '--border-idle':   'rgba(153,27,27,0.35)',
      '--border-active': '#ef4444',
      '--glow':          '0 0 0 2px rgba(239,68,68,0.15), 0 0 18px rgba(220,38,38,0.3)',
      '--label-idle':    'rgba(252,165,165,0.35)',
      '--label-active':  '#f87171',
    },
    blue: {
      '--border-idle':   'rgba(29,78,216,0.35)',
      '--border-active': '#3b82f6',
      '--glow':          '0 0 0 2px rgba(59,130,246,0.15), 0 0 18px rgba(37,99,235,0.3)',
      '--label-idle':    'rgba(147,197,253,0.35)',
      '--label-active':  '#60a5fa',
    },
  }[color];

  return (
    <>
      <style>{`
        .fi-wrap {
          position: relative;
          width: 100%;
        }

        .fi-wrap fieldset {
          border: 1px solid var(--border-idle);
          border-radius: 0.5rem;
          padding: 14px 12px 8px;
          margin: 0;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }

        /* Focus-within handles focus state — no JS needed */
        .fi-wrap fieldset:focus-within {
          border-color: var(--border-active);
          box-shadow: var(--glow);
        }

        .fi-wrap legend {
          padding: 0;
          max-width: 0;
          overflow: hidden;
          white-space: nowrap;
          font-size: 0.72rem;
          line-height: 1;
          opacity: 0;
          transition: max-width 0.22s ease 0.18s, padding 0.22s ease 0.18s;
        }

        /* Open gap when focused OR filled */
        .fi-wrap fieldset:focus-within legend,
        .fi-wrap.fi-filled legend {
          max-width: 200px;
          padding: 0 4px;
        }

        .fi-wrap input {
          width: 100%;
          background: transparent;
          outline: none;
          font-size: 0.875rem;
          color: rgba(255,255,255,0.9);
        }

        .fi-label {
          position: absolute;
          pointer-events: none;
          user-select: none;
          font-size: 0.875rem;
          color: var(--label-idle);
          top: 50%;
          left: 12px;
          transform: translateY(-50%) scale(1);
          transform-origin: left center;
          /* Blur: top snaps back first, then left */
          transition:
            top    0.15s ease 0s,
            transform 0.15s ease 0s,
            left   0.12s ease 0.1s,
            color  0.2s ease;
        }

        /* LEFT moves first, then TOP + SCALE */
        .fi-wrap fieldset:focus-within ~ .fi-label,
        .fi-wrap.fi-filled .fi-label {
          color: var(--label-active);
          top: 0px;
          left: 14px;
          transform: translateY(-50%) scale(0.82);
          transition:
            left      0.1s  ease 0s,
            top       0.18s ease 0.08s,
            transform 0.18s ease 0.08s,
            color     0.2s  ease;
        }
      `}</style>

      <div
        className={`fi-wrap${isFilled ? ' fi-filled' : ''}`}
        style={t as React.CSSProperties}
      >
        <fieldset>
          <legend>{label}</legend>
          <input
            type={type}
            value={value}
            onChange={disabled ? undefined : onChange}
            disabled={disabled}
            required={!disabled}
            placeholder=""
          />
        </fieldset>

        <label className="fi-label">{label}</label>
      </div>
    </>
  );
}
