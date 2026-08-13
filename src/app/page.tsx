import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Features } from "@/components/home/features";
import { Hero } from "@/components/home/hero";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center">
        <Hero />
        <Features />
      </main>
    </div>
  );
}
