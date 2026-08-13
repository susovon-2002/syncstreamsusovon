
import { Header } from "@/components/header";

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto py-12 px-4">
        <div className="prose prose-invert max-w-none space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-4 border-b pb-2">About SyncStream</h1>
            <p className="text-lg text-muted-foreground mt-4">
              SyncStream is a modern, real-time watch-party and live communication platform designed to bring people together—no matter where they are. Our mission is simple: <strong>to make online video watching, music listening, and virtual hangouts feel as natural and connected as being in the same room.</strong>
            </p>
            <p className="mt-4">
              With SyncStream, you can watch movies, stream videos, listen to songs, or enjoy live calls with your friends and family in perfect synchronization. Whether you're sharing a fun moment, studying together, or hosting a virtual event, our platform ensures a smooth and interactive experience.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Our Mission</h2>
            <p>Our goal is to create a safe, easy-to-use, and high-quality platform that enables:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Real-time synced playback</li>
              <li>Seamless group streaming</li>
              <li>Live video and voice calls</li>
              <li>Secure and privacy-focused interactions</li>
            </ul>
            <p className="mt-2">We aim to make online bonding simple, enjoyable, and accessible to everyone.</p>
          </div>

          <div>
            <h2 className="text-2xl font-bold">What We Offer</h2>
            <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>🎬 <strong>Watch Parties</strong> — Enjoy movies and videos together in sync</li>
                <li>🎵 <strong>Music Rooms</strong> — Listen to songs with friends</li>
                <li>🎥 <strong>Live Video/Voice Calls</strong> — Connect instantly</li>
                <li>🔒 <strong>Privacy & Safety</strong> — Your data stays protected</li>
                <li>🔗 <strong>Shareable Rooms</strong> — Create and join rooms instantly</li>
                <li>💬 <strong>Live Chat</strong> — Communicate in real time</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Our Vision</h2>
            <p>We believe that technology should bring people closer, not farther apart. SyncStream is built for:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Families staying connected</li>
              <li>Friends watching content together</li>
              <li>Students learning collaboratively</li>
              <li>Online creators hosting group sessions</li>
              <li>Communities gathering virtually</li>
            </ul>
            <p className="mt-2">We’re committed to improving the platform and adding exciting new features as we grow.</p>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Our Team</h2>
            <p>SyncStream is developed with care by a passionate group of developers and creators who focus on:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Real-time communication technology</li>
              <li>Smooth user experience</li>
              <li>Security and reliability</li>
              <li>Feature-rich entertainment tools</li>
            </ul>
            <p className="mt-2">We constantly listen to user feedback and work to make SyncStream better every day.</p>
          </div>

          <div>
            <h2 className="text-2xl font-bold">Get in Touch</h2>
            <p>Have ideas, questions, or feedback? We’d love to hear from you!</p>
            <p className="mt-2">
              <a href="mailto:support@syncstream.in" className="text-primary hover:underline">
                support@syncstream.in
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
