import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Prop Continuity Desk', description: 'A rehearsal cue board that catches misplaced props and keeps scene sign-offs honest.', icons: { icon: '/favicon.svg' } };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
