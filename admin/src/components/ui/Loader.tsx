export function Loader({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="py-12 flex flex-col items-center justify-center gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-goldDeep/20"></div>
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-goldGlow animate-spin"></div>
      </div>
      <p className="font-mono text-xs text-goldDeep uppercase tracking-widest">{label}</p>
    </div>
  );
}
