import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Camera, Keyboard, Loader2, X } from 'lucide-react';

interface QRScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (userId: string) => void;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ open, onClose, onScan }) => {
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [manualId, setManualId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<string>('qr-reader-' + Date.now());

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
      if (!el) { setScanning(false); return; }

      const html5QrCode = new Html5Qrcode(containerRef.current);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const userId = extractUserId(decodedText);
          if (userId) {
            stopScanner();
            onScan(userId);
          } else {
            setError('Invalid QR code. Please scan a VIET ID card QR.');
          }
        },
        () => {}
      );
    } catch (err: any) {
      console.error('QR scanner error:', err);
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
        if (state === 2) { // SCANNING
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch {
      // ignore
    }
  };

  const extractUserId = (text: string): string | null => {
    // URL format: .../id-card/view/UUID
    const urlMatch = text.match(/\/id-card\/view\/([a-f0-9-]{36})/i);
    if (urlMatch) return urlMatch[1];
    // Plain UUID
    const uuidMatch = text.match(/^[a-f0-9-]{36}$/i);
    if (uuidMatch) return uuidMatch[0];
    return null;
  };

  const handleManualSubmit = () => {
    const trimmed = manualId.trim();
    if (!trimmed) return;
    const userId = extractUserId(trimmed);
    if (userId) {
      onScan(userId);
    } else {
      onScan(trimmed);
    }
  };

  const handleClose = () => {
    stopScanner();
    setManualId('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Student ID Card</DialogTitle>
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
            onClick={() => { stopScanner(); setMode('manual'); }}
          >
            <Keyboard className="h-4 w-4 mr-1" /> Manual Entry
          </Button>
        </div>

        {mode === 'camera' ? (
          <div>
            <div
              id={containerRef.current}
              className="w-full rounded-lg overflow-hidden bg-black"
              style={{ minHeight: 280 }}
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
            <p className="text-xs text-gray-500 text-center mt-2">
              Point your camera at the QR code on the student's ID card
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Enter the student's Register ID, email, or paste the QR URL:
            </p>
            <div className="flex gap-2">
              <Input
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="e.g., 23NT1A0552 or paste QR URL"
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              />
              <Button onClick={handleManualSubmit}>Lookup</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QRScannerModal;
