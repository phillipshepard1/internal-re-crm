import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-muted-foreground">Stress Less CRM</p>
          <p className="text-sm text-muted-foreground">Last updated: July 15, 2025</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Stress Less CRM – Terms of Service</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 text-sm leading-relaxed">
              <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                <p className="font-semibold text-destructive mb-2">
                  PLEASE READ THESE TERMS CAREFULLY. THEY INCLUDE AN ARBITRATION AGREEMENT AND CLASS ACTION WAIVER WHICH AFFECT YOUR LEGAL RIGHTS.
                </p>
              </div>

              <p>
                This agreement (the "Terms") governs your access to and use of Stress Less CRM's services—our website, application, 
                software, and related features (collectively, the "Services"). By using the Services, you agree to these Terms and to our Privacy Policy.
              </p>

              <section>
                <h3 className="font-semibold text-base mb-3">1. Acceptance & Scope</h3>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li>These Terms form a binding contract between you ("User" or "you") and Stress Less CRM ("we," "us," or "our").</li>
                  <li>If you hold a separate written agreement with us (e.g., enterprise subscription), that prevails in case of conflict.</li>
                  <li>We may change these Terms at any time. Continued use after changes indicates acceptance.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-3">2. Your Use of the Services</h3>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li>You agree to use the Services for lawful, internal business purposes only.</li>
                  <li>You are responsible for safeguarding any credentials and ensuring that your use does not violate applicable law or third-party rights.</li>
                  <li>We reserve the right to suspend or terminate your access at any time for misuse or non-compliance.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-3">3. Account Registration</h3>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li>You must provide accurate data and maintain it.</li>
                  <li>You're responsible for activity under your account, including third-party access.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-3">4. Intellectual Property</h3>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li>We retain all rights, title, and interest in the Services and all software, data, features, and content.</li>
                  <li>Your input—such as data you upload—remains your property, but we may use it as needed to operate and improve the Services.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-3">5. Fees & Billing</h3>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li>If you subscribe or purchase Services, you agree to pay all associated fees and taxes.</li>
                  <li>Subscription terms and automatic renewals are detailed in your order form or billing agreement.</li>
                  <li>We may adjust prices with prior notice (e.g., 30–90 days depending on plan type).</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-3">6. Suspension & Termination</h3>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li>We reserve the right to suspend or terminate accounts for nonpayment, legal violations, or breach of these Terms – without liability.</li>
                  <li>You can terminate your account by notifying us, with any applicable fees billed through the term's end.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-3">7. Disclaimers & Limitation of Liability</h3>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li>Services are provided "as is" without warranty.</li>
                  <li>Our maximum liability is capped (e.g., total fees paid over the prior 3 months).</li>
                  <li>We are not liable for indirect or consequential damages and disclaim responsibility for third-party integrations.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-3">8. Confidential Information</h3>
                <p className="text-muted-foreground">
                  Each party will keep the other's confidential information strictly confidential and only use it to fulfill responsibilities under these Terms.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-3">9. Governing Law & Disputes</h3>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li>These Terms are governed by the laws of [Your Jurisdiction].</li>
                  <li>Disputes shall be resolved via binding arbitration (with a class-action waiver), except where prohibited.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-3">10. Modifications & Service Changes</h3>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li>We may discontinue or modify Services (in part or in full) at any time in our discretion.</li>
                  <li>We will notify you of significant changes via email or in-app notifications.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-3">11. Entire Agreement</h3>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li>These Terms, along with any order forms, privacy policy, and additional agreements (e.g., DPA), form the entire understanding.</li>
                  <li>They supersede all prior agreements and may not be assigned by users without our consent.</li>
                </ul>
              </section>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>For customization and compliance:</strong> Add defined terms (e.g., "Affiliate," "Order Form," "Services"). 
                  Include arbitration clause text and define how to initiate arbitration. Specify your jurisdiction, contact details 
                  for notices, and support channels. Clarify pricing modification terms and billing cycles. Consider including 
                  acceptable-use and data-processing annexes (e.g., GDPR DPA).
                </p>
              </div>

              <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                <p className="text-xs text-destructive">
                  <strong>⚠️ Disclaimer:</strong> This draft is for informational purposes only and does not constitute legal advice. 
                  Consult a qualified attorney to ensure full compliance with applicable laws and regulations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 