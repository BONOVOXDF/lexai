import { LandingNavbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Plans } from "@/components/landing/plans";
import { Faq } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";

/** Landing page do LEX AI. */
export default function LandingPage() {
  return (
    <>
      <LandingNavbar />
      <main>
        <Hero />
        <Features />
        <Plans />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
