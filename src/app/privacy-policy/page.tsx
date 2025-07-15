import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground">Stress Less CRM</p>
          <p className="text-sm text-muted-foreground">Last updated: July 15, 2025</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Stress Less CRM Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 text-sm leading-relaxed">
              <p>
                Stress Less CRM ("we," "us," or "our") respects your privacy and is committed to protecting your personal information. 
                This policy explains how we collect, use, disclose, and safeguard your information when you use our website, mobile app, 
                and services (collectively, the "Services"). By accessing or using any part of our Services, you agree to the terms of this Privacy Policy.
              </p>

              <section>
                <h3 className="font-semibold text-base mb-3">1. Information We Collect</h3>
                <p className="mb-3">We collect both personal and non-personal information when you interact with our Services:</p>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium">a. Personal Information</h4>
                    <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                      <li>Contact details: name, email, phone number</li>
                      <li>Professional identifiers: company, job title, signature</li>
                      <li>Account data: username, credentials</li>
                      <li>Payment and transaction details</li>
                      <li>Location info (e.g., IP address, approximate location)</li>
                      <li>Usage-related data: notes, messages, calendar events, reminders</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">b. Technical and Usage Data</h4>
                    <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                      <li>Browser type and version, device type, operating system</li>
                      <li>IP address, time zone, system configuration</li>
                      <li>Pages visited, features used, usage patterns</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">c. Automatically Collected Data</h4>
                    <p className="text-muted-foreground ml-4">Through cookies, similar tracking technologies, and log files</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">d. Third-Party Sources</h4>
                    <p className="text-muted-foreground ml-4">From partners, public records, analytics providers, etc.</p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-3">2. How We Use Your Information</h3>
                <p className="mb-3">We process your information for the following purposes:</p>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li>Providing, managing, and improving the Services</li>
                  <li>Maintaining our relationship, communication, and updates</li>
                  <li>Billing, invoicing, and fraud prevention</li>
                  <li>Personalization, analytics, and enhancing user experience</li>
                  <li>Marketing and promotional activities (with opt-out choices)</li>
                </ul>
                <p className="mt-3 text-muted-foreground">
                  These uses are lawful under contractual necessity, legitimate interests, and your consent where required.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-3">3. How We Share Your Information</h3>
                <p className="mb-3">We may share data with:</p>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li>Service providers (e.g., hosting, payment processing, support)</li>
                  <li>Partners for co-marketing (only with your consent)</li>
                  <li>Affiliates for internal operational needs</li>
                  <li>Legal disclosures when required by law</li>
                  <li>Business transfers, such as mergers or acquisitions</li>
                </ul>
                <p className="mt-3 text-muted-foreground">We do not sell personal data.</p>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-3">4. International Data Transfers</h3>
                <p className="text-muted-foreground">
                  As a global service, your data may be processed across borders. We implement safeguards such as standard contractual clauses and encryption.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-3">5. Data Security and Retention</h3>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li>We employ industry-standard security measures (encryption, access controls, backups)</li>
                  <li>Data is retained only as long as necessary to fulfill purposes or comply with legal obligations</li>
                  <li>You may request deletion of your personal data, subject to legal constraints</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-3">6. Cookies and Tracking Technologies</h3>
                <p className="mb-3">We use cookies and similar tools to:</p>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li>Operate and improve the Services</li>
                  <li>Analyze usage and traffic</li>
                  <li>Deliver personalized marketing</li>
                </ul>
                <p className="mt-3 text-muted-foreground">You can manage preferences via cookie settings.</p>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-3">7. Your Rights and Choices</h3>
                <p className="mb-3">Depending on your region, you may have rights including:</p>
                <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                  <li>Accessing, correcting, deleting, or exporting your data</li>
                  <li>Restricting or objecting to processing</li>
                  <li>Withdrawing consent</li>
                  <li>Opting out of cookies or marketing communications</li>
                  <li>Exercising CCPA/CPRA/CPRA-equivalent rights if you're in California</li>
                </ul>
                <p className="mt-3 text-muted-foreground">To exercise your rights, contact us via the info below.</p>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-3">8. Children's Privacy</h3>
                <p className="text-muted-foreground">
                  Our Services are not directed to children under 13. We do not knowingly collect personal data from minors. 
                  Contact us to request deletion if needed.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-3">9. Changes to This Policy</h3>
                <p className="text-muted-foreground">
                  We may update this policy over time. Significant changes will be communicated via the Services or by email. 
                  Continued use means acceptance.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-base mb-3">10. Contact Us</h3>
                <p className="mb-3">If you have questions about this Privacy Policy or want to exercise your rights, please contact:</p>
                <div className="ml-4 space-y-1 text-muted-foreground">
                  <p><strong>Email:</strong> privacy@stresslesscrm.com</p>
                  <p><strong>Mailing Address:</strong> Stress Less CRM, [Your Company Address]</p>
                </div>
              </section>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Disclaimer:</strong> This draft is for informational purposes only and does not constitute legal advice. 
                  Consult with a qualified attorney to ensure compliance with applicable laws.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 