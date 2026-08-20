export default function HomePage(): React.ReactElement {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">ConnectBPM</h1>
      <p className="text-slate-600">
        Evidence-native business process management. Foundation scaffold — no
        product surface yet.
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-500">
        <dt>Web</dt>
        <dd>localhost:3123</dd>
        <dt>API</dt>
        <dd>{process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5018'}</dd>
      </dl>
    </main>
  );
}
