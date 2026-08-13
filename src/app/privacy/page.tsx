
import { Header } from "@/components/header";

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold mb-4">Privacy Statement — SyncStream</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: 15 November 2025</p>
        
        <div className="space-y-6 prose prose-invert max-w-none">
            <p>
                SyncStream (“we”, “our”, or “us”) provides a platform that allows multiple users to watch videos, movies, or listen to audio together in real time. This Privacy Statement explains how we collect, use, and protect your information when you use our service.
            </p>

            <h2 className="text-2xl font-bold border-b pb-2">1. Information We Collect</h2>
            <p>We collect minimal information to operate the service:</p>

            <h3 className="text-xl font-semibold">a) Account Information</h3>
            <ul className="list-disc pl-5 space-y-1">
                <li>Username (display name)</li>
                <li>Email address (only if you register/login)</li>
            </ul>

            <h3 className="text-xl font-semibold">b) Usage Data</h3>
            <ul className="list-disc pl-5 space-y-1">
                <li>Room ID you join or create</li>
                <li>Actions inside the room (play, pause, seek, messages)</li>
                <li>Device type, browser information, and IP address (for security)</li>
            </ul>

            <h3 className="text-xl font-semibold">c) Media Links or Uploaded Files</h3>
            <ul className="list-disc pl-5 space-y-1">
                <li>Video/audio URLs you input</li>
                <li>Files you upload (for streaming)</li>
            </ul>

            <p>We <strong>do not</strong> collect:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Payment information</li>
                <li>Sensitive personal data</li>
                <li>Any biometric or facial data</li>
            </ul>

            <h2 className="text-2xl font-bold border-b pb-2">2. How We Use Your Information</h2>
            <p>We use the collected information to:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Provide the sync–watching functionality</li>
                <li>Maintain real-time communication between users</li>
                <li>Improve platform performance and security</li>
                <li>Prevent misuse, spam, or illegal content</li>
                <li>Enable room participation, chat interactions, and stream synchronization</li>
            </ul>
            <p>We <strong>do not use your data for advertising</strong> or sell user analytics.</p>

            <h2 className="text-2xl font-bold border-b pb-2">3. Data Sharing & Disclosure</h2>
            <p>We may share your data only in the following situations:</p>
            
            <h3 className="text-xl font-semibold">a) Service Providers</h3>
            <p>We may work with hosting, cloud, or database providers (e.g., Vercel, Firebase, or similar services). They only store data necessary for running the platform.</p>

            <h3 className="text-xl font-semibold">b) Legal Compliance</h3>
            <p>We may disclose information if required by:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Law</li>
                <li>Court order</li>
                <li>Government request</li>
            </ul>

            <h3 className="text-xl font-semibold">c) Other Users in a Room</h3>
            <p>When you join a room:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Your username is visible</li>
                <li>Your chat messages are visible</li>
                <li>Your actions (play/pause/seek) are synced with others</li>
            </ul>
            <p>We never share your email or private data with other users.</p>

            <h2 className="text-2xl font-bold border-b pb-2">4. Cookies & Tracking</h2>
            <p>We may use cookies for:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Keeping you logged in</li>
                <li>Storing dark/light theme</li>
                <li>Basic analytics (non-personal)</li>
            </ul>
            <p>No advertising cookies are used.</p>

            <h2 className="text-2xl font-bold border-b pb-2">5. Data Security</h2>
            <p>We use industry-standard security measures:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Encrypted connections (HTTPS)</li>
                <li>Secure databases</li>
                <li>Access control and firewall protection</li>
            </ul>
            <p>While no online service is 100% secure, we take all reasonable steps to protect your data.</p>

            <h2 className="text-2xl font-bold border-b pb-2">6. Your Rights</h2>
            <p>Depending on your region, you may request:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>To access your data</li>
                <li>To delete your account</li>
                <li>To remove uploaded content</li>
                <li>To correct any inaccurate information</li>
            </ul>
            <p>You can contact us anytime for these requests.</p>

            <h2 className="text-2xl font-bold border-b pb-2">7. Children’s Privacy</h2>
            <p>The service is <strong>not intended for users under 13 years old</strong>. We do not knowingly collect data from children.</p>
            
            <h2 className="text-2xl font-bold border-b pb-2">8. Changes to This Privacy Statement</h2>
            <p>We may update this Privacy Statement periodically. The latest version will always be published on this page.</p>

            <h2 className="text-2xl font-bold border-b pb-2">9. Contact Us</h2>
            <p>If you have any questions about this Privacy Statement or your data, you can contact us at:</p>
            <p>
                <a href="mailto:support@syncstream.in" className="text-primary hover:underline">
                support@syncstream.in
                </a>
            </p>
        </div>
      </main>
    </div>
  );
}
