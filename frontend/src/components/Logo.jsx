import React from 'react'

/**
 * Logo component.
 * Tries to load NatWest_Logo.png from /public.
 * Falls back to SVG text logo if image is not found.
 */
export default function Logo({ size = 'md', showText = true }) {
  const sizes = {
    sm: { img: 28, text: '1rem' },
    md: { img: 36, text: '1.25rem' },
    lg: { img: 52, text: '1.75rem' },
    xl: { img: 72, text: '2.25rem' },
  }
  const s = sizes[size] || sizes.md

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {/* Logo image — place your file at frontend/public/NatWest_Logo.png */}
      <img
        src="/NatWest_Logo.png"
        alt="ABBCreation Logo"
        width={s.img}
        height={s.img}
        style={{ objectFit: 'contain', borderRadius: '8px' }}
        onError={(e) => {
          // Fallback: hide broken img and show SVG placeholder
          e.currentTarget.style.display = 'none'
          e.currentTarget.nextSibling.style.display = 'flex'
        }}
      />
      {/* SVG fallback — hidden by default */}
      <div
        style={{
          display: 'none',
          width: s.img,
          height: s.img,
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 800,
          fontSize: s.img * 0.38,
          flexShrink: 0,
          letterSpacing: '-0.5px',
        }}
      >
        TA
      </div>
      {showText && (
        <span
          style={{
            fontSize: s.text,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #7c3aed, #c084fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.3px',
          }}
        >
          Test Automator
        </span>
      )}
    </div>
  )
}
