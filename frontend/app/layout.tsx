import { Inter, Playfair_Display } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LEX AI — A Inteligência Artificial para Advogados",
    template: "%s | LEX AI",
  },
  description:
    "Plataforma SaaS de inteligência artificial para advogados e escritórios de advocacia: assistente IA, petições, jurisprudência, contratos, clientes, processos, agenda, documentos e financeiro.",
  keywords: [
    "inteligência artificial",
    "advogados",
    "escritório de advocacia",
    "petições",
    "jurisprudência",
    "direito",
    "LEX AI",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
