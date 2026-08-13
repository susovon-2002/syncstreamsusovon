
import { Header } from "@/components/header";

export default function SupportPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto py-12 px-4">
        <div className="prose prose-invert max-w-none space-y-8">
            <div>
                <h1 className="text-4xl font-bold mb-4 border-b pb-2">Support — SyncStream</h1>
                <p className="text-lg text-muted-foreground mt-4">
                    Need help with SyncStream? You’re in the right place.
                </p>
                <p className="mt-4">
                    Our support team is here to assist you with any issues related to video streaming, watch parties, live calling, account access, or technical errors.
                </p>
                <p>
                    Whether you’re facing a glitch, reporting a bug, or simply have a question, we’re here to help.
                </p>
            </div>

            <div>
                <h2 className="text-2xl font-bold">📩 Contact Support</h2>
                <p>If you need direct assistance, feel free to reach out anytime:</p>
                <p>
                    📧 Email: <a href="mailto:support@syncstream.in" className="text-primary hover:underline">support@syncstream.in</a>
                </p>
                <p>We aim to respond within 24–48 hours.</p>
            </div>

            <div>
                <h2 className="text-2xl font-bold">💬 What We Can Help With</h2>
                <p>Our support team can assist you with:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>Issues joining or creating rooms</li>
                    <li>Video not syncing</li>
                    <li>Audio/video playback errors</li>
                    <li>Live video calling problems</li>
                    <li>URL not loading or media not supported</li>
                    <li>Account/login issues</li>
                    <li>Reporting abusive or inappropriate behavior</li>
                    <li>Feature requests and feedback</li>
                </ul>
            </div>
            
            <div>
                <h2 className="text-2xl font-bold">🛠 Troubleshooting (Quick Help)</h2>
                <h3 className="text-xl font-semibold mt-4">1. Video Not Playing or Showing Preview</h3>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>Make sure the video link is a direct MP4/MKV/MP3 URL</li>
                    <li>Avoid Google Drive, Dropbox, and YouTube (they block external access)</li>
                    <li>Try a different browser</li>
                    <li>Test with a known working video URL</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4">2. Room Not Syncing</h3>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>Check your internet connection</li>
                    <li>Refresh the page</li>
                    <li>Make sure all users have good network connectivity</li>
                </ul>

                <h3 className="text-xl font-semibold mt-4">3. Live Video Call Not Working</h3>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>Allow camera and microphone permissions</li>
                    <li>Close other apps using the camera</li>
                    <li>Use Chrome or Edge for best performance</li>
                </ul>
                
                <h3 className="text-xl font-semibold mt-4">4. Getting “URL Not Supported”</h3>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>The server hosting the video may be blocking access due to CORS</li>
                    <li>Try uploading your own file instead</li>
                </ul>
            </div>

            <div>
                <h2 className="text-2xl font-bold">🚨 Reporting Abuse or Safety Issues</h2>
                <p>If someone is:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>Harassing you</li>
                    <li>Sharing harmful or illegal content</li>
                    <li>Violating the Terms of Use</li>
                    <li>Engaging in threatening behavior</li>
                    <li>Misusing live video calling</li>
                </ul>
                <p className="mt-2">Please email us immediately at: <a href="mailto:support@syncstream.in" className="text-primary hover:underline">support@syncstream.in</a></p>
                <p className="mt-2">For emergencies, contact your local authorities.</p>
            </div>

            <div>
                <h3 className="text-xl font-semibold">Emergency Numbers (India)</h3>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>Police: 100</li>
                    <li>National Emergency: 112</li>
                    <li>Cyber Crime Helpline: 1930</li>
                    <li>Women’s Helpline: 1091</li>
                    <li>Child Helpline: 1098</li>
                </ul>
            </div>
        </div>
      </main>
    </div>
  );
}
