import { useEffect, useRef, useState } from 'react';
import { Camera, X, CheckCircle2, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import type { FireStation } from '@/lib/supabase';

type Props = {
  stations: FireStation[];
  onScan: (station: FireStation) => void;
  onClose: () => void;
};

const SCAN_HASH_PREFIX = '#scan=';

function extractStationKey(decoded: string): string {
  const text = decoded.trim();
  const hashIndex = text.indexOf(SCAN_HASH_PREFIX);
  return hashIndex >= 0 ? text.slice(hashIndex + SCAN_HASH_PREFIX.length).trim() : text;
}

export default function QRScanner({ stations, onScan, onClose }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);
  const containerId = 'qr-scanner-container';
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(true);
  const [manualMode, setManualMode] = useState(false);
  const [unknownCode, setUnknownCode] = useState(false);

  const stationsRef = useRef(stations);
  stationsRef.current = stations;
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    let mounted = true;

    async function start() {
      try {
        const html5 = new Html5Qrcode(containerId, { verbose: false });
        scannerRef.current = html5;
        await html5.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.7);
              return { width: size, height: size };
            },
          },
          (decoded) => {
            if (!mounted || handledRef.current) return;
            const key = extractStationKey(decoded);
            const station = stationsRef.current.find((s) => s.qr_token === key || s.code === key);
            if (station) {
              handledRef.current = true;
              onScanRef.current(station);
            } else {
              setUnknownCode(true);
            }
          },
          () => {},
        );
        if (mounted) setStarting(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (mounted) {
          setError(msg);
          setStarting(false);
          setManualMode(true);
        }
      }
    }

    start();

    return () => {
      mounted = false;
      const inst = scannerRef.current;
      if (inst) {
        inst.stop().then(() => inst.clear()).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!unknownCode) return;
    const timer = setTimeout(() => setUnknownCode(false), 2500);
    return () => clearTimeout(timer);
  }, [unknownCode]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4 bg-black">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-white font-semibold text-sm">Skann QR-kode</h2>
        <div className="w-9" />
      </div>

      {/* Scanner or manual */}
      {!manualMode ? (
        <div className="flex-1 flex flex-col items-center justify-center px-5 relative">
          <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-slate-900">
            <div id={containerId} className="absolute inset-0 [&_video]:object-cover [&_video]:h-full [&_video]:w-full" />
            {starting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
                <p className="text-white/70 text-sm">Starter kamera...</p>
              </div>
            )}
            {/* Scan frame overlay (matches the scan area: 70% of the square) */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[70%] aspect-square border-2 border-white/30 rounded-2xl relative">
                <div className="absolute -top-px -left-px w-6 h-6 border-t-2 border-l-2 border-red-500 rounded-tl-lg" />
                <div className="absolute -top-px -right-px w-6 h-6 border-t-2 border-r-2 border-red-500 rounded-tr-lg" />
                <div className="absolute -bottom-px -left-px w-6 h-6 border-b-2 border-l-2 border-red-500 rounded-bl-lg" />
                <div className="absolute -bottom-px -right-px w-6 h-6 border-b-2 border-r-2 border-red-500 rounded-br-lg" />
              </div>
            </div>
          </div>
          {unknownCode ? (
            <p className="text-amber-300 text-sm font-medium mt-6 text-center">
              Dette er ikke en brannpost-kode. Prøv igjen.
            </p>
          ) : (
            <p className="text-white/60 text-xs mt-6 text-center max-w-xs">
              Rett kameraet mot QR-koden på brannposten
            </p>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 pt-4">
          {error && (
            <div className="flex items-start gap-2 text-amber-300 text-sm bg-amber-500/10 rounded-xl p-3 mb-4">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Kameraet er ikke tilgjengelig. Velg brannpost manuelt fra listen.</span>
            </div>
          )}
          <p className="text-white/70 text-sm font-medium mb-3">Velg brannpost manuelt</p>
          <div className="space-y-2 pb-8">
            {stations.map((s) => (
              <button
                key={s.id}
                onClick={() => onScan(s)}
                className="w-full bg-white/5 hover:bg-white/10 rounded-xl p-4 flex items-center gap-3 text-left transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{s.name}</p>
                  <p className="text-white/50 text-xs">{s.location || s.code}</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-white/30" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fallback toggle */}
      <div className="px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-black">
        <button
          onClick={() => setManualMode((m) => !m)}
          className="w-full py-3 rounded-xl bg-white/10 text-white font-medium text-sm flex items-center justify-center gap-2"
        >
          {manualMode ? <Camera className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
          {manualMode ? 'Prøv kamera igjen' : 'Velg brannpost manuelt'}
        </button>
      </div>
    </div>
  );
}
