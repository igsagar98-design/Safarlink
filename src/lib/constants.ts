/**
 * Centralized Application Constants
 */

export const APP_METADATA = {
  driver: {
    // Current Supabase Storage URL for the Android APK
    apkUrl: 'https://kywkauwkuhfdhwycikxg.supabase.co/storage/v1/object/public/SAFARLINK%20DRIVER/application-cd1c85f4-ddd2-481f-90a2-0ab53ea18576.apk',
    
    // Play Store URL (Internal fallback)
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.safarlink.driverapk',
    
    // Deep Link Scheme for opening the app from tracking links
    deepLinkScheme: 'safarlink://driver/validate',
    
    // Support WhatsApp Number (India country code + number)
    supportWhatsapp: '917977704755',
    
    // Support Email
    supportEmail: 'support.safarlink@gmail.com'
  }
};
