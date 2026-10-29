import { useState, useEffect, useRef } from 'react';

const lines = [
  { msg: '[    0.000000] Oxevy Boot System v2.0.0 — x86_64', delay: 100 },
  { msg: '[    0.000000] CPU: AuthenticAMD 8-core processor', delay: 80 },
  { msg: '[    0.015042] Memory: 16384MB available', delay: 70 },
  { msg: '[    0.031200] BIOS: Oxevy UEFI v2.0', delay: 60 },
  { msg: '[    0.047500] PCI: Enumerating bus devices...', delay: 100 },
  { msg: '[    0.063800] ACPI: Enabling ACPI', delay: 70 },
  { msg: '[    0.087300] Oxevy Kernel loading...', delay: 120 },
  { msg: '[    0.112000] Mounting root filesystem', delay: 80 },
  { msg: '[    0.161400] Security: integrity check — PASSED', delay: 150 },
  { msg: '[    0.218000] NET: Registered protocol families', delay: 60 },
  { msg: '[    0.268000] Driver: Ethernet (1000Mbps)', delay: 100 },
  { msg: '[    0.301000] Driver: GPU acceleration enabled', delay: 120 },
  { msg: '[    0.421000] blk: Network layer ready', delay: 80 },
  { msg: '[    0.486000] blk: Session authentication OK', delay: 100 },
  { msg: '[    0.651000] systemd: Starting display manager...', delay: 100 },
  { msg: '[    0.816000] systemd: Oxevy desktop environment started', delay: 250 },
];

export default function BootScreen({ onBootComplete }) {
  console.log('[BootScreen] Mounted, onBootComplete:', !!onBootComplete);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const cbRef = useRef(onBootComplete);
  cbRef.current = onBootComplete;

  useEffect(() => {
    if (done) return;
    if (index >= lines.length) {
      console.log('[BootScreen] All lines shown, completing boot');
      setDone(true);
      const t = setTimeout(() => setShowLogo(true), 600);
      return () => clearTimeout(t);
    }
    console.log('[BootScreen] Scheduling line', index, 'in', lines[index].delay, 'ms');
    const t = setTimeout(() => setIndex(i => i + 1), lines[index].delay);
    return () => clearTimeout(t);
  }, [index]);

  useEffect(() => {
    if (!showLogo) return;
    console.log('[BootScreen] Showing logo splash');
    const t = setTimeout(() => {
      console.log('[BootScreen] Calling onBootComplete');
      cbRef.current?.();
    }, 1500);
    return () => clearTimeout(t);
  }, [showLogo]);

  if (showLogo) {
    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 999999,
        background: '#000',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        borderRadius: '0.75rem', overflow: 'hidden',
        fontFamily: "'DynaPuff', cursive",
      }}>
        <div style={{
          position: 'relative',
          animation: 'splashFadeIn 0.6s ease-out',
        }}>
          <span style={{
            fontSize: 96, fontWeight: 700, color: '#22c55e',
            letterSpacing: '0.05em',
          }}>
            Oxevy
          </span>
          <div style={{
            height: 3, marginTop: 8,
            background: 'linear-gradient(90deg, transparent, #22c55e, transparent)',
            width: '100%',
            transformOrigin: 'center',
            animation: 'splashLineGrow 0.8s ease-out 0.3s both',
          }} />
        </div>
        <span style={{
          fontFamily: "'Courier New', monospace",
          marginTop: 24, fontSize: 11, color: 'rgba(34,197,94,0.5)',
          letterSpacing: '0.3em', textTransform: 'uppercase',
          animation: 'splashFadeIn 0.5s ease-out 0.4s both',
        }}>
          {'L o a d i n g . . .'.split('').map((ch, i) => (
            <span key={i} style={{
              display: 'inline-block',
              animation: ch === '.' ? `splashDot 0.8s ease-in-out ${i * 0.15}s infinite` : 'none',
            }}>{ch}</span>
          ))}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 999999,
      background: '#000',
      display: 'flex', flexDirection: 'column',
      borderRadius: '0.75rem', overflow: 'hidden',
      fontFamily: "'Courier New', monospace",
    }}>
      {/* header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 24px',
        borderBottom: '1px solid rgba(34,197,94,0.15)',
        background: 'rgba(0,0,0,0.8)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#22c55e', display: 'inline-block',
          }} />
          <span style={{
            fontSize: 10, color: 'rgba(34,197,94,0.7)',
            letterSpacing: '0.2em', textTransform: 'uppercase',
          }}>
            Oxevy Boot System
          </span>
        </div>
        <span style={{ fontSize: 10, color: 'rgba(34,197,94,0.4)' }}>
          {new Date().toISOString().replace('T', ' ').slice(0, 19)}
        </span>
      </div>

      {/* console */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '16px 24px',
        fontSize: 11, lineHeight: '1.8',
        background: 'linear-gradient(180deg, #000 0%, #0a0a0a 100%)',
      }}>
        {lines.slice(0, index).map((l, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ color: 'rgba(34,197,94,0.85)' }}>{l.msg}</span>
            <span style={{ color: 'rgba(34,197,94,0.6)' }}>
              [<span style={{ color: '#22c55e', fontWeight: 'bold' }}> OK </span>]
            </span>
          </div>
        ))}
        {!done && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <span style={{ color: 'rgba(34,197,94,0.5)', fontSize: 9 }}>root@oxevy:~$</span>
            <span style={{
              width: 6, height: 12, background: '#22c55e',
              display: 'inline-block', animation: 'pulse 1s infinite',
            }} />
          </div>
        )}
        {done && (
          <div style={{ marginTop: 12 }}>
            <div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: 12 }}>
              [  OK  ] Boot completed
            </div>
            <div style={{ color: 'rgba(34,197,94,0.6)', fontSize: 9, marginTop: 4 }}>
              Starting display manager...
            </div>
          </div>
        )}
      </div>

      {/* progress bar */}
      <div style={{
        borderTop: '1px solid rgba(34,197,94,0.15)',
        background: 'rgba(0,0,0,0.8)',
      }}>
        <div style={{ height: 4, background: '#052e16' }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #16a34a, #22c55e, #16a34a)',
            width: `${Math.min((index / lines.length) * 100, 100)}%`,
            transition: 'width 0.1s',
          }} />
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 24px',
        }}>
          <div style={{ display: 'flex', gap: 12, fontSize: 9, color: 'rgba(34,197,94,0.4)', fontFamily: "'Courier New', monospace" }}>
            <span>v2.0.0</span>
            <span>x86_64</span>
            {done && <span style={{ color: 'rgba(34,197,94,0.7)' }}>Boot complete</span>}
          </div>
          <span style={{ fontSize: 9, color: 'rgba(34,197,94,0.4)', fontFamily: "'Courier New', monospace" }}>
            {Math.round((index / lines.length) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
