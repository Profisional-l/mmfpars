import type { Metadata, Viewport } from "next";
import { THEME_BOOTSTRAP_SCRIPT, THEME_COLORS } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Расписание ММФ",
  description: "Расписание занятий дневного отделения мехмата БГУ",
  applicationName: "Расписание ММФ",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Расписание ММФ",
    // стартовое значение; bootstrap + applyTheme переписывают под выбранную тему
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // одно значение по умолчанию; реальный цвет ставит bootstrap-скрипт и applyTheme
  themeColor: THEME_COLORS.dark,
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ru"
      data-theme="dark"
      style={{ colorScheme: "dark" }}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
