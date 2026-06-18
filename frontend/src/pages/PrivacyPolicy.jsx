import "./LegalPages.css";

export default function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <div className="legal-card">

        <span className="legal-badge">🔒 Privacy Policy</span>
        <h1>Privacy Policy</h1>
        <p className="legal-subtitle">
          Transparency and trust are core to BookEase. This page explains exactly
          what we collect, why we collect it, and how we protect your data.
        </p>
        <p className="legal-updated">Last Updated: June 2026 · Effective immediately</p>

        <div className="legal-toc">
          <p className="legal-toc-title">Contents</p>
          <ol>
            <li><a href="#info-we-collect">Information We Collect</a></li>
            <li><a href="#how-we-use">How We Use Your Information</a></li>
            <li><a href="#sharing">Sharing &amp; Disclosure</a></li>
            <li><a href="#third-party">Third-Party Services</a></li>
            <li><a href="#data-retention">Data Retention</a></li>
            <li><a href="#security">Security</a></li>
            <li><a href="#your-rights">Your Rights</a></li>
            <li><a href="#cookies">Cookies &amp; Local Storage</a></li>
            <li><a href="#children">Children's Privacy</a></li>
            <li><a href="#changes">Changes to This Policy</a></li>
            <li><a href="#contact">Contact Us</a></li>
          </ol>
        </div>

        {/* 1 */}
        <section id="info-we-collect">
          <h2>1. Information We Collect</h2>
          <h3>Information you provide directly</h3>
          <ul>
            <li><strong>Account details</strong> — name, email address, phone number, and password (stored as a bcrypt hash; we never store plain-text passwords).</li>
            <li><strong>Business information</strong> — business name, address, description, working hours, service details, and verification documents (PAN, GST certificate, etc.) uploaded by business owners.</li>
            <li><strong>Appointment data</strong> — date, time, selected service, and any notes attached to a booking.</li>
            <li><strong>Payment references</strong> — Razorpay order IDs and payment IDs. We do not store raw card numbers, CVVs, or bank account details. All payment processing is handled by Razorpay.</li>
            <li><strong>Profile photos &amp; documents</strong> — images uploaded for your profile or business, stored securely via Cloudinary.</li>
            <li><strong>Reviews &amp; ratings</strong> — text and star ratings you submit for services.</li>
          </ul>

          <h3>Information collected automatically</h3>
          <ul>
            <li><strong>Authentication tokens</strong> — short-lived JWT access tokens (15 min) and refresh tokens stored in HTTP-only cookies.</li>
            <li><strong>OAuth data</strong> — if you sign in with Google, we receive your name, email, and Google profile picture from Google's OAuth2 service. We do not receive your Google password.</li>
            <li><strong>OTP records</strong> — one-time passwords for email verification and password reset, stored temporarily (max 10 minutes) and immediately invalidated after use.</li>
            <li><strong>Server logs</strong> — standard access logs (IP address, timestamp, HTTP method, endpoint) retained by our hosting provider (Render) for security monitoring.</li>
          </ul>
        </section>

        {/* 2 */}
        <section id="how-we-use">
          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>Create and manage your BookEase account.</li>
            <li>Schedule, confirm, reschedule, and cancel appointments.</li>
            <li>Process deposit payments and initiate refunds via Razorpay.</li>
            <li>Send transactional emails — booking confirmations, OTPs, appointment reminders, cancellation notices, refund updates, and service completion confirmations.</li>
            <li>Allow business owners to verify service completion via OTP or secure link.</li>
            <li>Display reviews on service and business pages.</li>
            <li>Provide admin-level analytics — aggregate, anonymised statistics about platform usage.</li>
            <li>Detect and prevent fraud, abuse, and unauthorised access.</li>
            <li>Improve platform performance, fix bugs, and develop new features.</li>
          </ul>
          <p>
            We do <strong>not</strong> use your personal data for advertising, sell it to third
            parties, or use it to train AI models.
          </p>
        </section>

        {/* 3 */}
        <section id="sharing">
          <h2>3. Sharing &amp; Disclosure</h2>
          <p>We share your data only in the following limited circumstances:</p>
          <ul>
            <li><strong>With service providers you book</strong> — your name and appointment details are visible to the business owner you book with so they can manage your appointment.</li>
            <li><strong>With payment processors</strong> — Razorpay receives the minimum data required to process payments (email, amount). See <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer">Razorpay's Privacy Policy</a>.</li>
            <li><strong>With infrastructure providers</strong> — Render (hosting), Railway (database), Vercel (frontend CDN), and Cloudinary (media storage) process data solely to deliver the service.</li>
            <li><strong>When required by law</strong> — if compelled by a valid legal process (court order, government request), we will disclose only what is legally required and will notify affected users when permitted.</li>
            <li><strong>Business transfer</strong> — if BookEase is acquired or merges with another entity, user data may be transferred as part of that transaction. You will be notified via email before any transfer occurs.</li>
          </ul>
          <p>We will never sell your personal information.</p>
        </section>

        {/* 4 */}
        <section id="third-party">
          <h2>4. Third-Party Services</h2>
          <div className="legal-table-wrap">
            <table className="legal-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Purpose</th>
                  <th>Data Shared</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Google OAuth2</td><td>Social sign-in</td><td>Name, email, profile photo</td></tr>
                <tr><td>Razorpay</td><td>Payment processing</td><td>Email, order amount</td></tr>
                <tr><td>Cloudinary</td><td>Media &amp; document storage</td><td>Images, documents you upload</td></tr>
                <tr><td>Render</td><td>Backend hosting (India region)</td><td>Server logs</td></tr>
                <tr><td>Railway</td><td>MySQL database</td><td>All database content</td></tr>
                <tr><td>Vercel</td><td>Frontend CDN</td><td>IP address, request logs</td></tr>
                <tr><td>Gmail SMTP</td><td>Transactional emails</td><td>Your email address</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 5 */}
        <section id="data-retention">
          <h2>5. Data Retention</h2>
          <ul>
            <li><strong>Account data</strong> — retained as long as your account is active. If you request account deletion, your personal data is anonymised or deleted within 30 days, except where retention is required by law.</li>
            <li><strong>Appointment records</strong> — retained for 12 months after completion for dispute resolution purposes, then deleted.</li>
            <li><strong>Payment records</strong> — Razorpay order and payment IDs are retained for 7 years as required by Indian financial regulations (RBI guidelines).</li>
            <li><strong>OTPs</strong> — automatically deleted after 10 minutes of creation or immediately upon use.</li>
            <li><strong>Refresh tokens</strong> — expire after 30 days and are invalidated on logout.</li>
            <li><strong>Server logs</strong> — retained by Render for up to 30 days.</li>
          </ul>
        </section>

        {/* 6 */}
        <section id="security">
          <h2>6. Security</h2>
          <ul>
            <li>Passwords are hashed with <strong>bcrypt</strong> (minimum 12 rounds). We never store or transmit plain-text passwords.</li>
            <li>All data in transit is protected by <strong>TLS 1.2+</strong> (HTTPS). HTTP Strict Transport Security (HSTS) is enforced.</li>
            <li>JWT tokens are short-lived (15 minutes). Refresh tokens are rotated on each use and stored in <strong>HTTP-only, Secure, SameSite=None cookies</strong> to prevent XSS access.</li>
            <li>OTPs are generated using <strong>cryptographically secure random numbers</strong> (Java SecureRandom) and are single-use.</li>
            <li>Authentication endpoints are <strong>rate-limited</strong> (Bucket4j) to prevent brute-force attacks.</li>
            <li>File uploads are routed through <strong>Cloudinary</strong> and never stored on our application server's disk.</li>
            <li>Security headers including <strong>Content-Security-Policy, X-Frame-Options, X-Content-Type-Options</strong>, and <strong>Referrer-Policy</strong> are enforced on all responses.</li>
          </ul>
          <p>
            Despite these measures, no internet system is completely secure. We cannot guarantee
            absolute security and are not liable for unauthorised access beyond our reasonable control.
            If you suspect your account has been compromised, please contact us immediately at{" "}
            <a href="mailto:devsquad45@gmail.com">devsquad45@gmail.com</a>.
          </p>
        </section>

        {/* 7 */}
        <section id="your-rights">
          <h2>7. Your Rights</h2>
          <p>You have the following rights regarding your personal data:</p>
          <ul>
            <li><strong>Access</strong> — request a copy of the personal data we hold about you.</li>
            <li><strong>Correction</strong> — update inaccurate or incomplete information via your profile settings.</li>
            <li><strong>Deletion</strong> — request deletion of your account and associated data. This may affect your ability to access past appointment records.</li>
            <li><strong>Portability</strong> — request your data in a machine-readable format.</li>
            <li><strong>Objection</strong> — object to processing of your data for certain purposes.</li>
            <li><strong>Withdraw consent</strong> — if processing is based on your consent (e.g. Google sign-in), you may withdraw at any time by disconnecting your Google account.</li>
          </ul>
          <p>
            To exercise any of these rights, email us at{" "}
            <a href="mailto:devsquad45@gmail.com">devsquad45@gmail.com</a> with the subject line
            "Data Rights Request". We will respond within 30 days.
          </p>
        </section>

        {/* 8 */}
        <section id="cookies">
          <h2>8. Cookies &amp; Local Storage</h2>
          <ul>
            <li><strong>Refresh token cookie</strong> — HTTP-only, Secure cookie used to maintain your login session. Required for the platform to function. Expires after 30 days or on logout.</li>
            <li><strong>Local storage</strong> — we store your JWT access token expiry timestamp in browser local storage solely to enable proactive token refresh before expiry. No personal data is stored in local storage.</li>
          </ul>
          <p>We do not use advertising cookies, tracking pixels, or third-party analytics cookies.</p>
        </section>

        {/* 9 */}
        <section id="children">
          <h2>9. Children's Privacy</h2>
          <p>
            BookEase is not directed at children under the age of 13. We do not knowingly collect
            personal information from children under 13. If you believe a child has provided us
            with their personal data, please contact us and we will delete it promptly.
          </p>
        </section>

        {/* 10 */}
        <section id="changes">
          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. When we do, we will update the
            "Last Updated" date at the top and, for material changes, notify you by email at least
            7 days before the change takes effect. Continued use of BookEase after the effective
            date constitutes acceptance of the revised policy.
          </p>
        </section>

        {/* 11 */}
        <section id="contact">
          <h2>11. Contact Us</h2>
          <p>For privacy-related questions, requests, or concerns:</p>
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
              <span className="legal-contact-icon">🕐</span>
              <span><strong>Response time:</strong> Within 30 business days</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}