import "./LegalPages.css";

export default function TermsOfService() {
  return (
    <div className="legal-page">
      <div className="legal-card">

        <span className="legal-badge">📜 Terms of Service</span>
        <h1>Terms of Service</h1>
        <p className="legal-subtitle">
          These terms govern your use of BookEase. By creating an account or
          using any part of the platform, you agree to be bound by them.
        </p>
        <p className="legal-updated">Last Updated: June 2026 · Effective immediately</p>

        <div className="legal-toc">
          <p className="legal-toc-title">Contents</p>
          <ol>
            <li><a href="#acceptance">Acceptance of Terms</a></li>
            <li><a href="#eligibility">Eligibility</a></li>
            <li><a href="#accounts">User Accounts</a></li>
            <li><a href="#platform-roles">Platform Roles</a></li>
            <li><a href="#appointments">Appointments &amp; Bookings</a></li>
            <li><a href="#payments">Payments, Deposits &amp; Refunds</a></li>
            <li><a href="#consent-flow">Service Completion &amp; Consent</a></li>
            <li><a href="#reviews">Reviews &amp; Ratings</a></li>
            <li><a href="#business-owners">Business Owner Obligations</a></li>
            <li><a href="#prohibited">Prohibited Conduct</a></li>
            <li><a href="#ip">Intellectual Property</a></li>
            <li><a href="#liability">Limitation of Liability</a></li>
            <li><a href="#indemnification">Indemnification</a></li>
            <li><a href="#termination">Termination</a></li>
            <li><a href="#disputes">Dispute Resolution</a></li>
            <li><a href="#governing-law">Governing Law</a></li>
            <li><a href="#changes">Changes to Terms</a></li>
            <li><a href="#contact">Contact</a></li>
          </ol>
        </div>

        <section id="acceptance">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By registering for, accessing, or using BookEase (the "Platform"), you confirm
            that you have read, understood, and agree to be bound by these Terms of Service
            ("Terms") and our{" "}
            <a href="/privacy">Privacy Policy</a>. If you do not agree, do not use the Platform.
          </p>
        </section>

        <section id="eligibility">
          <h2>2. Eligibility</h2>
          <ul>
            <li>You must be at least 18 years of age (or the age of majority in your jurisdiction).</li>
            <li>You must have the legal capacity to enter into binding agreements.</li>
            <li>You must not have been previously suspended or removed from BookEase for violations of these Terms.</li>
            <li>If you are registering a business, you must be authorised to represent and bind that business.</li>
          </ul>
        </section>

        <section id="accounts">
          <h2>3. User Accounts</h2>
          <ul>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You must provide accurate, current, and complete information when registering.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
            <li>Notify us immediately at <a href="mailto:devsquad45@gmail.com">devsquad45@gmail.com</a> if you suspect unauthorised access.</li>
            <li>You may not share your account with others or create multiple accounts to circumvent restrictions.</li>
            <li>Google OAuth users cannot change their BookEase password — authentication is managed by Google.</li>
          </ul>
        </section>

        <section id="platform-roles">
          <h2>4. Platform Roles</h2>
          <p>BookEase has three user roles, each with distinct permissions:</p>
          <ul>
            <li>
              <strong>Customer</strong> — can browse businesses and services, book appointments,
              make deposit payments, confirm service completion, and leave reviews.
            </li>
            <li>
              <strong>Business Owner</strong> — can register one or more businesses (subject to admin
              approval), manage services, set working hours, confirm or reject appointment bookings,
              and initiate the service completion consent flow.
            </li>
            <li>
              <strong>Super Admin</strong> — can approve or reject business registrations, manage all
              users, moderate reviews, and access platform-wide analytics. Admin accounts are
              provisioned internally and cannot be self-registered.
            </li>
          </ul>
        </section>

        <section id="appointments">
          <h2>5. Appointments &amp; Bookings</h2>
          <ul>
            <li>A booking is created when a customer selects a service, date, and time slot and submits the booking form.</li>
            <li>A booking is only <strong>confirmed</strong> after (a) the customer completes the 30% deposit payment and (b) the business owner approves the booking.</li>
            <li>Slots are temporarily held for <strong>20 minutes</strong> after booking to allow deposit payment. If payment is not completed within this window, the slot is automatically released and the booking is cancelled at no charge.</li>
            <li>Customers may reschedule a confirmed appointment up to <strong>2 times</strong>, provided the rescheduling request is made at least 24 hours before the original appointment time.</li>
            <li>Business owners may cancel bookings at any time. If a confirmed booking is cancelled by the owner, the customer receives a full refund of their deposit.</li>
            <li>BookEase is a booking platform only. We do not guarantee service quality, which remains the sole responsibility of the business owner.</li>
          </ul>
        </section>

        <section id="payments">
          <h2>6. Payments, Deposits &amp; Refunds</h2>

          <h3>Deposit</h3>
          <p>
            All appointments require a non-refundable* 30% deposit paid upfront via Razorpay.
            The remaining 70% is paid directly to the service provider (cash or UPI) at the
            time of service.
          </p>

          <h3>Refund Policy</h3>
          <div className="legal-table-wrap">
            <table className="legal-table">
              <thead>
                <tr>
                  <th>Cancellation Timing</th>
                  <th>Refund Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>More than 48 hours before appointment</td><td>100% of deposit</td></tr>
                <tr><td>24–48 hours before appointment</td><td>50% of deposit</td></tr>
                <tr><td>Less than 24 hours before appointment</td><td>No refund</td></tr>
                <tr><td>Cancelled by business owner (any time)</td><td>100% of deposit</td></tr>
                <tr><td>Business closure / deletion</td><td>100% of deposit</td></tr>
              </tbody>
            </table>
          </div>

          <p>
            Refunds are processed via Razorpay and typically reflect in your account within
            <strong> 5–7 business days</strong>, depending on your bank and payment method.
            BookEase is not responsible for delays caused by Razorpay or banking institutions.
          </p>
          <p>
            All payment processing is handled by <strong>Razorpay</strong> and is subject to
            their <a href="https://razorpay.com/terms/" target="_blank" rel="noopener noreferrer">Terms of Service</a>.
            BookEase does not store card numbers, CVVs, or bank account details.
          </p>
        </section>

        <section id="consent-flow">
          <h2>7. Service Completion &amp; Consent</h2>
          <p>
            To protect both customers and business owners, BookEase uses a two-step
            service completion flow:
          </p>
          <ol>
            <li>
              When a business owner marks a service as complete, the customer receives an
              email containing a <strong>one-time OTP</strong> and a <strong>secure confirmation link</strong>,
              both valid for 30 minutes.
            </li>
            <li>
              The customer confirms receipt of service either by sharing the OTP with the
              provider or clicking the confirmation link in the email.
            </li>
            <li>
              Only after the customer confirms does the appointment status move to
              "Awaiting Remaining Payment", at which point the business owner may mark the
              remaining 70% as paid to fully complete the transaction.
            </li>
          </ol>
          <p>
            By confirming service completion (via OTP or link), you acknowledge that you
            received the service as described and consent to the transaction being marked complete.
            If the service was not delivered satisfactorily, use the dispute option in the
            confirmation email instead of confirming.
          </p>
        </section>

        <section id="reviews">
          <h2>8. Reviews &amp; Ratings</h2>
          <ul>
            <li>Only customers who have a <strong>completed</strong> appointment for a specific service may leave a review for that service.</li>
            <li>Reviews must be honest, accurate, and based on your personal experience.</li>
            <li>Reviews must not contain hate speech, personal attacks, false statements, spam, or promotional content.</li>
            <li>You may edit your review at any time. Each service allows one review per customer.</li>
            <li>BookEase admins may remove reviews that violate these guidelines without prior notice.</li>
            <li>By submitting a review, you grant BookEase a non-exclusive, royalty-free licence to display it on the platform.</li>
          </ul>
        </section>

        <section id="business-owners">
          <h2>9. Business Owner Obligations</h2>
          <ul>
            <li>Business owners must provide accurate, complete, and up-to-date information about their business, services, pricing, and working hours.</li>
            <li>All uploaded documents (PAN, GST, trade licence, etc.) must be genuine and legally valid. Submitting forged documents will result in immediate permanent suspension and may be reported to relevant authorities.</li>
            <li>Business owners must honour confirmed appointments unless exceptional circumstances prevent it. Repeated unexplained cancellations of confirmed bookings may result in account suspension.</li>
            <li>Business owners are solely responsible for the quality, safety, and legality of the services they provide.</li>
            <li>Business owners must not attempt to collect payments outside the BookEase payment flow for the deposit portion of any booking.</li>
            <li>Annual turnover declared for GST eligibility assessment must be accurate.</li>
          </ul>
        </section>

        <section id="prohibited">
          <h2>10. Prohibited Conduct</h2>
          <p>You must not:</p>
          <ul>
            <li>Use the platform for any unlawful purpose or in violation of applicable Indian law.</li>
            <li>Attempt to bypass, circumvent, or exploit any security measure, payment flow, or consent mechanism.</li>
            <li>Create fake accounts, fake reviews, or impersonate any person or entity.</li>
            <li>Upload malicious files, scripts, or content designed to harm the platform or other users.</li>
            <li>Scrape, crawl, or extract data from the platform using automated means without prior written consent.</li>
            <li>Harass, abuse, or threaten other users, business owners, or BookEase staff.</li>
            <li>Attempt to gain unauthorised access to other users' accounts or platform infrastructure.</li>
            <li>Use the platform to promote or facilitate illegal services.</li>
          </ul>
          <p>
            Violations may result in immediate account suspension, permanent ban, and/or
            legal action where warranted.
          </p>
        </section>

        <section id="ip">
          <h2>11. Intellectual Property</h2>
          <p>
            The BookEase name, logo, design system, codebase, and all platform-generated content
            are the intellectual property of BookEase and its developers, protected under applicable
            copyright and trademark law. You may not reproduce, copy, sell, or exploit any part
            of the platform without express written permission.
          </p>
          <p>
            Content you upload (profile photos, business images, documents) remains your property.
            By uploading, you grant BookEase a limited licence to store, display, and process
            that content solely for the purpose of providing the platform's services.
          </p>
        </section>

        <section id="liability">
          <h2>12. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by applicable law, BookEase and its developers
            shall not be liable for:
          </p>
          <ul>
            <li>Any indirect, incidental, special, or consequential damages.</li>
            <li>Loss of profits, data, goodwill, or business opportunities.</li>
            <li>Damages arising from service quality issues between customers and business owners.</li>
            <li>Platform downtime, data loss, or technical failures beyond our reasonable control.</li>
            <li>Actions of third-party services (Razorpay, Cloudinary, Google, Render, Railway, Vercel).</li>
          </ul>
          <p>
            Our total aggregate liability to you for any claim shall not exceed the total amount
            of fees you paid to BookEase in the 3 months preceding the claim.
          </p>
        </section>

        <section id="indemnification">
          <h2>13. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless BookEase and its developers from any claims,
            damages, losses, or expenses (including reasonable legal fees) arising from:
          </p>
          <ul>
            <li>Your violation of these Terms.</li>
            <li>Your use of the platform.</li>
            <li>Content you upload or submit.</li>
            <li>Your violation of any third party's rights.</li>
          </ul>
        </section>

        <section id="termination">
          <h2>14. Termination</h2>
          <p>
            <strong>By you:</strong> You may delete your account at any time via your profile settings
            or by emailing us. Upon deletion, active appointments will be cancelled (refund policy applies)
            and your personal data will be anonymised within 30 days.
          </p>
          <p>
            <strong>By us:</strong> We may suspend or terminate your account immediately, without notice,
            if you violate these Terms, engage in fraudulent activity, or if continued access poses a
            risk to the platform or other users. We may also terminate inactive accounts after 12 months
            of inactivity with 14 days' prior email notice.
          </p>
        </section>

        <section id="disputes">
          <h2>15. Dispute Resolution</h2>
          <p>
            For disputes between customers and business owners regarding service quality, both
            parties should first attempt to resolve the matter directly. If a resolution cannot
            be reached, you may contact us at{" "}
            <a href="mailto:devsquad45@gmail.com">devsquad45@gmail.com</a> and we will review
            the matter on a case-by-case basis.
          </p>
          <p>
            BookEase acts as a neutral platform intermediary and does not guarantee outcomes in
            disputes between users and service providers.
          </p>
        </section>

        <section id="governing-law">
          <h2>16. Governing Law</h2>
          <p>
            These Terms are governed by the laws of India. Any legal disputes arising from
            these Terms or your use of BookEase shall be subject to the exclusive jurisdiction
            of the courts in Gujarat, India.
          </p>
        </section>

        <section id="changes">
          <h2>17. Changes to These Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. Material changes will be
            communicated via email at least 7 days before taking effect. Your continued use of
            BookEase after the effective date constitutes acceptance of the revised Terms.
          </p>
          <p>
            We recommend reviewing these Terms periodically. The current version is always
            available at <a href="/terms">/terms</a>.
          </p>
        </section>

        <section id="contact">
          <h2>18. Contact</h2>
          <p>Questions about these Terms? Reach us at:</p>
          <div className="legal-contact-block">
            <div className="legal-contact-row">
              <span className="legal-contact-icon">✉️</span>
              <span>
                <strong>Email:</strong>{" "}
                <a href="mailto:devsquad45@gmail.com">devsquad45@gmail.com</a>
              </span>
            </div>
            <div className="legal-contact-row">
              <span className="legal-contact-icon">🌐</span>
              <span><strong>Platform:</strong> BookEase — Appointment Booking SaaS</span>
            </div>
            <div className="legal-contact-row">
              <span className="legal-contact-icon">⚖️</span>
              <span><strong>Jurisdiction:</strong> Gujarat, India</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}