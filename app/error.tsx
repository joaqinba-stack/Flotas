"use client";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ padding: 40 }}>
      <h1>Ocurrió un problema</h1>
      <p className="alert-error">{error.message || "Error inesperado"}</p>
      <button className="btn" onClick={reset}>Reintentar</button>
    </div>
  );
}
