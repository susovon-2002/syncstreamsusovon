import { AuthForm } from '@/components/auth/auth-form';
import Image from 'next/image';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-6">
      <section className="relative grid w-full max-w-5xl items-center gap-6 overflow-hidden rounded-lg border border-white/20 bg-[#061126]/58 p-5 shadow-[0_24px_90px_rgb(0_0_0_/_0.38)] backdrop-blur-2xl before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_6%_4%,rgb(255_153_51_/_0.22),transparent_18rem),radial-gradient(circle_at_94%_20%,rgb(19_136_8_/_0.22),transparent_20rem),radial-gradient(circle_at_14%_96%,rgb(0_145_255_/_0.24),transparent_20rem)] before:content-[''] lg:grid-cols-[1.12fr_0.88fr] lg:p-6">
        <div className="relative hidden h-[30rem] items-center justify-center overflow-hidden lg:flex">
          <div className="absolute inset-10 rounded-full border border-white/5" />
          <div className="absolute inset-20 rounded-full border border-white/5" />
          <div className="float-soft relative flex h-full flex-col items-center justify-center text-center">
            <div className="h-80 w-80 overflow-hidden rounded-md">
              <Image
                src="/syncstream-logo.png"
                alt="SyncStream logo"
                width={360}
                height={360}
                priority
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
        <div className="relative flex min-h-[30rem] items-center justify-center">
          <AuthForm />
        </div>
      </section>
    </main>
  );
}
