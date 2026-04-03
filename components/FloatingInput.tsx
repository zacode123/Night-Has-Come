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
      '--border-idle':   'rgba(220,38,38,0.55)',
      '--border-active': '#ef4444',
      '--glow':          '0 0 0 1px rgba(239,68,68,0.2), 0 0 16px rgba(220,38,38,0.25)',
      '--label-idle':    'rgba(252,165,165,0.7)',
      '--label-active':  '#f87171',
      '--bg':            'rgba(80,10,10,0.55)',
    },
    blue: {
      '--border-idle':   'rgba(59,130,246,0.55)',
      '--border-active': '#3b82f6',
      '--glow':          '0 0 0 1px rgba(59,130,246,0.2), 0 0 16px rgba(37,99,235,0.25)',
      '--label-idle':    'rgba(147,197,253,0.7)',
      '--label-active':  '#60a5fa',
      '--bg':            'rgba(10,20,60,0.55)',
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
          border: 2px solid var(--border-idle);
          border-radius: 0.5rem;
          padding: 14px 12px 8px;
          margin: 0;
          background: var(--bg);
          transition: border-color 0.25s ease, box-shadow 0.25s ease;
        }

        .fi-wrap fieldset:focus-within {
          border: 3px solid var(--border-active);
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
          color: rgba(255,255,255,0.95);
        }

        .fi-wrap input::placeholder {
          color: transparent;
        }

        /* Label starts perfectly centered in the input */
        .fi-label {
          position: absolute;
          pointer-events: none;
          user-select: none;
          font-size: 0.875rem;
          color: var(--label-idle);
          top: 50%;
          left: 14px;
          transform: translateY(-50%) scale(1);
          transform-origin: left center;
          transition:
            left      0.12s ease 0s,
            top       0.2s  ease 0.1s,
            transform 0.2s  ease 0.1s,
            color     0.2s  ease;
        }

        /* On focus/filled: slide left first, then float to top-left */
        .fi-wrap fieldset:focus-within ~ .fi-label,
        .fi-wrap.fi-filled .fi-label {
          color: var(--label-active);
          top: 2%;
          left: 10px;
          transform: translateY(-50%) scale(0.78);
          transition:
            left      0.12s ease 0s,
            top       0.3s  ease 0.1s,
            transform 0.2s  ease 0.1s,
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
