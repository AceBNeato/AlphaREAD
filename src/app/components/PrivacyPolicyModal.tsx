import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

export function PrivacyPolicyModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-sm font-bold text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 transition-colors bg-transparent border-none cursor-pointer">
          Privacy Policy
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white dark:bg-[#0d141c]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-[#8b40b8] border-b-2 border-[#ce82ff] pb-2">
            Privacy Policy for AlphaREAD
          </DialogTitle>
          <DialogDescription className="italic text-gray-500 mt-2">
            Effective Date: June 22, 2026
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 text-gray-700 dark:text-gray-300 text-sm mt-4 text-left">
          <p>
            <strong>AlphaREAD</strong> ("we," "our," or "us") is committed to protecting the privacy of our users, especially children. This Privacy Policy explains how we handle information in our mobile application.
          </p>

          <div>
            <h2 className="text-lg font-bold text-[#3c8c01] mb-2">1. Information Collection and Use</h2>
            
            <h3 className="font-semibold mt-4 mb-2">Microphone Access and Voice Data</h3>
            <p className="mb-2">AlphaREAD includes a "Voice Evaluation" feature designed to help users practice their pronunciation.</p>
            <ul className="list-disc pl-5 space-y-2">
                <li><strong>Microphone Access:</strong> To use this feature, the app requests permission to access your device's microphone.</li>
                <li><strong>No Recording or Storage:</strong> We use the device's built-in Speech Recognition API and local processing engines to process voice input in real-time. <strong>We do not record, store, or transmit any audio data to our servers.</strong> The audio is processed entirely locally on your device to determine if the spoken word matches the lesson material. Once the evaluation is complete, the audio data is immediately discarded.</li>
            </ul>

            <h3 className="font-semibold mt-4 mb-2">Other Information</h3>
            <ul className="list-disc pl-5 space-y-2">
                <li><strong>Progress Tracking:</strong> We store local progress (such as completed levels and scores) on your device. For logged-in users, we sync this progress to our secure database to track your learning journey across devices.</li>
                <li><strong>Personal Information:</strong> We do not collect personally identifiable information (PII) from children. For teachers and administrators, we collect basic account information (such as email addresses) required to provide dashboard access and manage student progress.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-[#3c8c01] mb-2">2. Third-Party Services</h2>
            <p className="mb-2">Our app uses the following third-party services to function:</p>
            <ul className="list-disc pl-5 space-y-2">
                <li><strong>Google Play Services:</strong> For Android app distribution and updates.</li>
                <li><strong>Supabase:</strong> Used for secure backend data management, teacher/admin authentication, and backing up student progress. Supabase is GDPR and SOC2 compliant.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-[#3c8c01] mb-2">3. Children's Privacy</h2>
            <p>
              AlphaREAD is designed for educational use by children. We strictly comply with the Children's Online Privacy Protection Act (COPPA). We do not collect any personal contact information from children. Our microphone usage is strictly for real-time educational feedback and does not involve audio recording or transmission.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-[#3c8c01] mb-2">4. Security</h2>
            <p>
              We value your trust in providing us with access to your device's microphone for educational purposes. We use commercially acceptable means of protecting it, and as stated, no voice data ever leaves your device.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-[#3c8c01] mb-2">5. Contact Us</h2>
            <p>
              If you have any questions or suggestions about our Privacy Policy, do not hesitate to contact us at <strong>[INSERT_YOUR_EMAIL_HERE@example.com]</strong>.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
