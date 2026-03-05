export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">Terms of Service</h1>

        <div className="prose prose-invert max-w-none space-y-6 text-text-secondary text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using TamashiiClaw, you agree to be bound by these Terms of Service.
              If you do not agree to these terms, do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Service Description</h2>
            <p>
              TamashiiClaw provides AI inference services via an OpenAI-compatible API.
              Services include flat-rate LLM inference, agent hosting, and related tooling.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. Acceptable Use</h2>
            <p>
              You agree not to use our services for any unlawful purpose or in a manner that
              could damage, disable, or impair the service. You are responsible for all
              activity under your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Payment Terms</h2>
            <p>
              Subscription fees are billed monthly. Payments may be made via credit card or
              cryptocurrency (USDC). Refunds are handled on a case-by-case basis.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Limitation of Liability</h2>
            <p>
              TamashiiClaw is provided &ldquo;as is&rdquo; without warranties of any kind. We are not
              liable for any indirect, incidental, or consequential damages arising from your
              use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Contact</h2>
            <p>
              For questions about these terms, please contact us at{" "}
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
