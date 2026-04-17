import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'obscurus labs — anti-surveillance eyewear';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0A0A0A',
          color: '#EDEDED',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 32, letterSpacing: -1, color: '#A3A3A3' }}>
          obscurus <span style={{ color: '#525252' }}>labs</span>
        </div>
        <div>
          <div style={{ fontSize: 108, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>
            take back
          </div>
          <div
            style={{
              fontSize: 108,
              fontWeight: 700,
              letterSpacing: -4,
              lineHeight: 1,
              color: '#7C3AED',
            }}
          >
            your face.
          </div>
        </div>
        <div style={{ fontSize: 28, color: '#A3A3A3', letterSpacing: -0.5 }}>
          VISO .01 &lsquo;Ghost&rsquo; — anti-surveillance eyewear
        </div>
      </div>
    ),
    size,
  );
}
