import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Shield, QrCode, Copy, Check } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

interface TwoFactorAuthProps {
  onClose: () => void;
}

const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({ onClose }) => {
  const { toast } = useToast();
  const [isEnabled, setIsEnabled] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes] = useState([
    'ABC123', 'DEF456', 'GHI789', 'JKL012', 'MNO345',
    'PQR678', 'STU901', 'VWX234', 'YZ567', 'ABC890'
  ]);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const secretKey = 'JBSWY3DPEHPK3PXP';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/VIET%20Portal?secret=${secretKey}&issuer=VIET`;

  const handleEnable2FA = () => {
    if (verificationCode.length === 6) {
      setIsEnabled(true);
      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication has been successfully enabled.",
      });
    } else {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 6-digit verification code.",
        variant: "destructive",
      });
    }
  };

  const handleDisable2FA = () => {
    setIsEnabled(false);
    toast({
      title: "2FA Disabled",
      description: "Two-factor authentication has been disabled.",
    });
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedCodes(true);
    toast({
      title: "Backup Codes Copied",
      description: "Backup codes have been copied to clipboard.",
    });
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Two-Factor Authentication</span>
            {isEnabled && <Badge className="bg-green-100 text-green-800">Enabled</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isEnabled ? (
            <>
              <div className="text-sm text-gray-600">
                <p>Secure your account by enabling two-factor authentication. You'll need to use an authenticator app like Google Authenticator or Authy.</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label>Step 1: Scan QR Code</Label>
                  <div className="mt-2 p-4 border rounded-lg text-center">
                    <img src={qrCodeUrl} alt="2FA QR Code" className="mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Or enter this key manually:</p>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{secretKey}</code>
                  </div>
                </div>

                <div>
                  <Label htmlFor="verification-code">Step 2: Enter Verification Code</Label>
                  <Input
                    id="verification-code"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    maxLength={6}
                  />
                </div>

                <Button onClick={handleEnable2FA} disabled={verificationCode.length !== 6}>
                  Enable 2FA
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-sm text-green-600">
                <p>✓ Two-factor authentication is enabled for your account.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Backup Codes</Label>
                  <div className="mt-2 p-4 border rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                      {backupCodes.map((code, index) => (
                        <div key={index} className="bg-gray-50 p-2 rounded text-center">
                          {code}
                        </div>
                      ))}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={copyBackupCodes}
                      className="mt-3 w-full"
                    >
                      {copiedCodes ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Backup Codes
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
                  </p>
                </div>

                <Button variant="destructive" onClick={handleDisable2FA}>
                  Disable 2FA
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};

export default TwoFactorAuth;