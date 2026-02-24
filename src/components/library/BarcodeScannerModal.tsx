import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Camera, Keyboard, Loader2 } from 'lucide-react';

interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
  title: string;
  subtitle?: string;
  manualPlaceholder?: string;
}

/**
 * Scans any barcode (ISBN, etc.) or QR code and returns the raw decoded text.
 * Use for: book barcode → ISBN, shelf QR → location string.
 */
const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  open,
  onClose,
  onScan,
  title,
  subtitle = 'Point camera at the barcode or QR code',
  manualPlaceholder = 'Paste or type the code',
}) => {
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [manualValue, setManualValue] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef('barcode-reader-' + Date.now());

  useEffect(() => {
    if (open && mode === 'camera') {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [open, mode]);

  const startScanner = async () => {
    setScanning(true);
    setError('');
    try {
      await new Promise((r) => setTimeout(r, 300));
      const el = document.getElementById(containerRef.current);
      if (!el) {
        setScanning(false);
        return;
      }

      const html5QrCode = new Html5Qrcode(containerRef.current);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          const trimmed = decodedText?.trim();
          if (trimmed) {
            stopScanner();
            onScan(trimmed);
          }
        },
        () => {}
      );
    } catch (err: any) {
      console.error('Barcode scanner error:', err);
      setError('Camera not available. Use manual entry instead.');
      setMode('manual');
    } finally {
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state === 2) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch {
      // ignore
    }
  };

  const handleManualSubmit = () => {
    const trimmed = manualValue.trim();
    if (!trimmed) return;
    onScan(trimmed);
  };

  const handleClose = () => {
    stopScanner();
    setManualValue('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-3">
          <Button
            variant={mode === 'camera' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('camera')}
          >
            <Camera className="h-4 w-4 mr-1" /> Camera
          </Button>
          <Button
            variant={mode === 'manual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              stopScanner();
              setMode('manual');
            }}
          >
            <Keyboard className="h-4 w-4 mr-1" /> Manual Entry
          </Button>
        </div>

        {mode === 'camera' ? (
          <div>
            <div
              id={containerRef.current}
              className="w-full rounded-lg overflow-hidden bg-black"
              style={{ minHeight: 240 }}
            />
            {scanning && (
              <div className="flex items-center justify-center py-4 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Starting camera...
              </div>
            )}
            {error && (
              <p className="text-sm text-red-600 mt-2 text-center">{error}</p>
            )}
            <p className="text-xs text-gray-500 text-center mt-2">{subtitle}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                placeholder={manualPlaceholder}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              />
              <Button onClick={handleManualSubmit}>Use</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScannerModal;

/**
 * Parse shelf QR/barcode content into a readable location string.
 * Supported formats:
 * - SHELF:45 or SHELF:45:2:3 (shelf, row, col)
 * - shelf=45 or shelf=45&row=2&col=3
 * - {"shelf":45,"row":2,"col":3}
 * - Plain text (returned as-is)
 */
export function parseShelfLocation(decodedText: string): string {
  const t = decodedText.trim();
  if (!t) return t;

  // SHELF:n or SHELF:n:row:col
  const shelfPrefix = t.match(/^SHELF[:\s]*(\d+)(?::(\d+))?(?::(\d+))?$/i);
  if (shelfPrefix) {
    const [, shelf, row, col] = shelfPrefix;
    if (row !== undefined && col !== undefined) {
      return `Shelf ${shelf}, Row ${row}, Col ${col}`;
    }
    return `Shelf ${shelf}`;
  }

  // shelf=n&row=r&col=c or shelf=n
  const params = new URLSearchParams(t.replace(/,/g, '&'));
  const shelfParam = params.get('shelf') ?? params.get('s');
  if (shelfParam) {
    const rowParam = params.get('row') ?? params.get('r');
    const colParam = params.get('col') ?? params.get('c');
    if (rowParam !== null && colParam !== null) {
      return `Shelf ${shelfParam}, Row ${rowParam}, Col ${colParam}`;
    }
    return `Shelf ${shelfParam}`;
  }

  // JSON
  try {
    const j = JSON.parse(t);
    const shelf = j.shelf ?? j.shelfNo ?? j.shelf_id;
    if (shelf != null) {
      const row = j.row ?? j.rowNo;
      const col = j.col ?? j.column ?? j.colNo;
      if (row != null && col != null) {
        return `Shelf ${shelf}, Row ${row}, Col ${col}`;
      }
      return `Shelf ${shelf}`;
    }
  } catch {
    // not JSON
  }

  return t;
}
