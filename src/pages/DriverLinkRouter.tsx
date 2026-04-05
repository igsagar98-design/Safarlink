import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DriverLinkRouter() {
  const { token } = useParams<{ token: string }>();
  const [deviceType, setDeviceType] = useState<'desktop' | 'mobile' | 'unknown'>('unknown');
  const [redirected, setRedirected] = useState(false);

  const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.safarlink.driverapk';
  const DEEP_LINK_URL = `safarlink://driver/validate?token=${token}`;

  useEffect(() => {
    // Detect device type
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMobile = /android|ipad|iphone|ipod/i.test(ua);
    setDeviceType(isMobile ? 'mobile' : 'desktop');

    if (isMobile) {
      attemptDeepLink();
    }
  }, [token]);

  const attemptDeepLink = () => {
    if (!token) return;

    // Set a timer to fallback to play store if the app doesn't open
    const fallbackTimeout = setTimeout(() => {
      if (!document.hidden) {
        window.location.href = PLAY_STORE_URL;
        setRedirected(true);
      }
    }, 1500);

    // Try to open the deep link
    window.location.replace(DEEP_LINK_URL);

    // Clear timeout if the app opened and the page went to background
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(fallbackTimeout);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearTimeout(fallbackTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-xl font-bold font-display">Invalid Tracking Link</h1>
        <p className="text-muted-foreground mt-2">No token was provided in the URL.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
      
      <div className="max-w-md w-full bg-card rounded-2xl shadow-xl border overflow-hidden p-8 text-center space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-display text-primary">SafarLink</h1>
          <p className="text-muted-foreground text-sm mt-1">Driver Tracking Portal</p>
        </div>

        {/* Mobile View */}
        {deviceType === 'mobile' && (
          <div className="space-y-6">
            {!redirected ? (
              <div className="animate-pulse space-y-4">
                <Smartphone className="w-16 h-16 mx-auto text-primary opacity-50" />
                <p className="font-medium text-lg">Opening SafarLink Driver...</p>
                <p className="text-xs text-muted-foreground">Please wait while we redirect you.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="font-medium text-lg">App not installed?</p>
                <Button onClick={() => window.location.href = PLAY_STORE_URL} className="w-full gap-2" size="lg">
                  <Download className="w-4 h-4" /> Download App
                </Button>
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-3">Or try opening again:</p>
                  <Button variant="outline" onClick={() => window.location.replace(DEEP_LINK_URL)} className="w-full gap-2">
                    <ExternalLink className="w-4 h-4" /> Open in App
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Desktop View */}
        {deviceType === 'desktop' && (
          <div className="space-y-6 flex flex-col items-center">
            <div className="bg-white p-4 rounded-xl shadow-inner inline-block">
              <QRCodeSVG value={window.location.href} size={200} level="H" />
            </div>
            <div>
              <p className="font-medium text-lg">Scan this code</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-[250px] mx-auto">
                Open your phone's camera and scan the QR code to track this trip in the driver app.
              </p>
            </div>
          </div>
        )}

        {/* Unknown View */}
        {deviceType === 'unknown' && (
           <div className="animate-pulse py-8">
             <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
           </div>
        )}

      </div>
    </div>
  );
}
