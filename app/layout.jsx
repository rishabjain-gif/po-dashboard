import './globals.css';

export const metadata = {
  title: 'PO Dashboard — Quick Commerce',
  description: 'Zepto & Instamart PO tracking dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
