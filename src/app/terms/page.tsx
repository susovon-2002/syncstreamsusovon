
import { Header } from "@/components/header";

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold mb-4">Terms of Use — SyncStream</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: 15 November 2025</p>
        
        <div className="space-y-6 prose prose-invert max-w-none">
            <p>
                Welcome to SyncStream (“we”, “our”, or “us”). These Terms of Use (“Terms”) govern your use of our website, media-sync platform, live video calling features, and all related services (“Service”). By accessing or using SyncStream, you agree to these Terms. If you do not agree, you must not use the Service.
            </p>

            <h2 className="text-2xl font-bold border-b pb-2">1. Eligibility</h2>
            <p>You must be:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>At least 13 years old (or the legal age in your region)</li>
                <li>Legally permitted to use online communication tools</li>
            </ul>
            <p>If you are under 18, you must have permission from a parent or guardian.</p>

            <h2 className="text-2xl font-bold border-b pb-2">2. User Accounts</h2>
            <p>To use certain features, you may need to create an account. You agree to:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Provide accurate and current information</li>
                <li>Keep your login details secure</li>
                <li>Not share your account with others</li>
                <li>Notify us immediately if you believe your account is compromised</li>
            </ul>
            <p>We are not responsible for unauthorized access to your account.</p>

            <h2 className="text-2xl font-bold border-b pb-2">3. Acceptable Use</h2>
            <p>You agree NOT to use SyncStream for:</p>
            <h3 className="text-xl font-semibold">a) Illegal Activities</h3>
            <ul className="list-disc pl-5 space-y-1">
                <li>Copyright infringement</li>
                <li>Streaming pirated movies/shows</li>
                <li>Sharing unauthorized content</li>
                <li>Fraud, hacking, or harmful activities</li>
            </ul>
            <h3 className="text-xl font-semibold">b) Harmful or Abusive Behavior</h3>
            <ul className="list-disc pl-5 space-y-1">
                <li>Harassment or bullying</li>
                <li>Sharing explicit, violent, or hateful content</li>
                <li>Impersonation of others</li>
            </ul>
            <h3 className="text-xl font-semibold">c) Technical Misuse</h3>
            <ul className="list-disc pl-5 space-y-1">
                <li>Attempting to bypass security</li>
                <li>Overloading servers</li>
                <li>Reverse engineering, scraping, or automated bots</li>
            </ul>
            <p>If found violating these rules, your account may be suspended or terminated.</p>

            <h2 className="text-2xl font-bold border-b pb-2">4. Streaming Content</h2>
            <p>SyncStream does not host or provide copyrighted content by default. Users are responsible for:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Using only legal and authorized media links</li>
                <li>Uploading only content they have rights to</li>
                <li>Ensuring compliance with copyright laws</li>
            </ul>
            <p>We are not liable for any copyright violations committed by users.</p>

            <h2 className="text-2xl font-bold border-b pb-2">5. Live Video & Voice Calling</h2>
            <p>By using the live communication features, you agree:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Not to stream illegal or harmful content</li>
                <li>Not to record or share calls without consent</li>
                <li>Not to engage in inappropriate behavior</li>
            </ul>
            <p>We do not monitor live calls, but we reserve the right to investigate misuse.</p>

            <h2 className="text-2xl font-bold border-b pb-2">6. User-Generated Content</h2>
            <p>Any content you upload or share (videos, messages, files, etc.) remains your responsibility.</p>
            <p>You grant SyncStream:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>A non-exclusive, worldwide, royalty-free license to store, process, and transmit your content solely to operate the service.</li>
            </ul>
            <p>We do not own your content.</p>
            
            <h2 className="text-2xl font-bold border-b pb-2">7. Privacy & Data Collection</h2>
            <p>Your use of the Service is also governed by our Privacy Policy, which explains:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>What information we collect</li>
                <li>How we use it</li>
                <li>How we protect it</li>
            </ul>
            <p>By using SyncStream, you consent to our data practices.</p>

            <h2 className="text-2xl font-bold border-b pb-2">8. Service Availability</h2>
            <p>We do not guarantee:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Continuous service uptime</li>
                <li>Error-free performance</li>
                <li>Perfect synchronization across all devices</li>
            </ul>
            <p>We may suspend, modify, or discontinue the Service at any time without notice.</p>

            <h2 className="text-2xl font-bold border-b pb-2">9. Third-Party Services</h2>
            <p>SyncStream may integrate with third-party platforms (e.g., YouTube, WebRTC, cloud hosting). We are not responsible for:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Third-party policies</li>
                <li>Availability</li>
                <li>Actions or content provided by third-party services</li>
            </ul>
            <p>Users must comply with third-party terms as well.</p>

            <h2 className="text-2xl font-bold border-b pb-2">10. Termination</h2>
            <p>We may suspend or terminate your account at any time if you:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Breach these Terms</li>
                <li>Upload illegal content</li>
                <li>Misuse the Service</li>
                <li>Engage in suspicious or harmful activity</li>
            </ul>
            <p>Once terminated, you may lose access to all rooms, content, and features.</p>
            
            <h2 className="text-2xl font-bold border-b pb-2">11. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>We are not liable for data loss, service interruptions, delays, or errors</li>
                <li>We are not responsible for user-generated content</li>
                <li>We are not responsible for damages resulting from your misuse of the Service</li>
            </ul>
            <p>You use SyncStream at your own risk.</p>

            <h2 className="text-2xl font-bold border-b pb-2">12. Changes to These Terms</h2>
            <p>We may update these Terms at any time. The most recent version will always be posted here. Continued use of the Service means you accept the updated Terms.</p>
            
            <h2 className="text-2xl font-bold border-b pb-2">13. Safety, Security & Emergency Assistance</h2>
            <p>If you experience harassment, threats, abuse, or any form of illegal behavior while using our platform, we strongly encourage you to report it to your local authorities.</p>
            <p>In case of immediate danger, contact your local police or emergency services.</p>
            
            <h3 className="text-xl font-semibold">India Emergency & Police Helpline Numbers</h3>
            <ul className="list-disc pl-5 space-y-1">
                <li>🚨 Police Emergency: 100</li>
                <li>🚨 Women’s Helpline: 1091</li>
                <li>🚨 Cyber Crime Helpline: 1930</li>
                <li>🚨 National Emergency Number: 112</li>
                <li>🚨 Child Helpline: 1098</li>
            </ul>
            <p>If you are outside India, please contact the emergency number for your country (e.g., 911, 999, 112, etc.).</p>

            <h3 className="text-xl font-semibold">Reporting Abuse on SyncStream</h3>
            <p>If someone is:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Harassing you</li>
                <li>Sharing illegal or harmful content</li>
                <li>Threatening you</li>
                <li>Engaging in abusive behavior</li>
                <li>Violating our Terms</li>
            </ul>
            <p>Please report immediately at: 
                <a href="mailto:support@syncstream.in" className="text-primary hover:underline">
                    support@syncstream.in
                </a>
            </p>
            <p>We will review the report and take necessary action, including suspension or removal of users involved in harmful or illegal activity.</p>
        </div>
      </main>
    </div>
  );
}
