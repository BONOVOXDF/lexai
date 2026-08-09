import { LandingNavbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Stats } from "@/components/landing/stats";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Testimonials } from "@/components/landing/testimonials";
import { Plans } from "@/components/landing/plans";
import { Faq } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";
import { WhatsAppButton } from "@/components/landing/whatsapp-button";

/** Landing page do LEX AI. */
export default function LandingPage() {
  return (
    <>
      <LandingNavbar />
      <main>
        <Hero />
        <Stats />
        <Features />
        <HowItWorks />
        <Testimonials />
        <Plans />
        <Faq />
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
