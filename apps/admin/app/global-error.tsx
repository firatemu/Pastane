'use client';

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>): React.JSX.Element {
  return (
    <html lang="tr">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '32rem' }}>
        <h1 style={{ fontSize: '1.25rem' }}>Admin: bir hata oluştu</h1>
        <p style={{ color: '#444', marginTop: '1rem' }}>{error.message || 'Beklenmeyen hata.'}</p>
        {error.digest ? (
          <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.5rem' }}>Kod: {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: '1.5rem',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            borderRadius: '0.5rem',
            border: '1px solid #333',
            background: '#fafafa',
          }}
        >
          Tekrar dene
        </button>
      </body>
    </html>
  );
}
