import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';

const SCANNER_ID = 'barcode-scanner-area';

export default function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let scanner;
    let mounted = true;

    async function start() {
      try {
        scanner = new Html5Qrcode(SCANNER_ID);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            onScan(decodedText);
            // Don't stop immediately — let user see success
          },
          () => {
            // QR error callback — ignore continuous errors
          }
        );

        if (mounted) setIsScanning(true);
      } catch (err) {
        console.error('Scanner init error:', err);
        if (mounted) setError('Kunde inte starta kamera. Kontrollera behörigheter.');
      }
    }

    start();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <ScanLine className="w-5 h-5" />
            Skanna streckkod
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={onClose}
              className="mt-3 px-4 py-2 bg-white/10 rounded-lg text-white text-sm hover:bg-white/20"
            >
              Stäng
            </button>
          </div>
        ) : (
          <>
            <div
              id={SCANNER_ID}
              className={cn(
                'w-full aspect-square rounded-xl overflow-hidden border-2 border-dashed border-white/20',
                isScanning && 'border-emerald-500/40'
              )}
            />
            <p className="text-center text-white/40 text-xs">
              Håll streckkoden inom ramen
            </p>
          </>
        )}
      </div>
    </div>
  );
}
