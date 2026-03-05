export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">Privacy Policy</h1>

        <div className="prose prose-invert max-w-none space-y-6 text-text-secondary text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Information We Collect</h2>
            <p>
              We collect information you provide directly, such as your email address, wallet address,
              and account preferences. We also collect usage data including API request metadata,
              token consumption, and performance metrics.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. How We Use Your Information</h2>
            <p>
              We use your information to provide and improve our services, process payments,
              communicate with you about your account, and ensure the security of our platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. You may request deletion
              of your data at any time by contacting support.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Security</h2>
            <p>
              We implement industry-standard security measures to protect your data, including
              encryption in transit and at rest, and regular security audits.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Contact</h2>
            <p>
              For questions about this privacy policy, please contact us at{" "}
              <a href="mailto:support@tamashiiclaw.app" className="text-primary hover:underline">
                support@tamashiiclaw.app
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
