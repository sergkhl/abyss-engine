import type { Metadata } from 'next';
import React from 'react';
import './globals.css';
import QueryProvider from './providers/QueryProvider';

export const metadata: Metadata = {
  title: 'Abyss Engine',
  description: 'Modular edutainment framework with 3D crystal growth on a grid',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <React.StrictMode>
          <QueryProvider>{children}</QueryProvider>
        </React.StrictMode>
      </body>
    </html>
  );
}
