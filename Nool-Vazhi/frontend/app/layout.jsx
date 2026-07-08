import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';
import Script from 'next/script';

import { NotificationProvider } from '@/context/NotificationContext';

export const metadata = {
  title: 'Nool-Vazhi - Logistics Operations Platform',
  description: 'A revolutionary SaaS platform optimizing truck pooling, shipping, and supply chain logistics.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin="" />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <NotificationProvider>
            <Toaster position="top-right" />
            {children}
          </NotificationProvider>
        </AuthProvider>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
