import { EMERGENCY, INFO_SECTIONS } from '../data/info-content';

function PhoneIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6.4 6.4l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6A2 2 0 0 1 22 16.9Z" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.5 14.5A3.5 3.5 0 0 0 12 21a6 6 0 0 0 6-6c0-4-3-6.5-4.5-10.5-.4 2.8-2 4.5-4 6A4.9 4.9 0 0 0 8.5 14.5Z" />
    </svg>
  );
}

// Matches emergency-style numbers only (+46… international, or bare 112/1177),
// so times like "10 km/h" or "09–22h" are never turned into call links.
const PHONE_RE = /(\+46[\d\s]{5,}\d|\b11(?:2|77)\b)/g;

function linkifyPhones(text: string) {
  return text.split(PHONE_RE).map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={`tel:${part.replace(/\s+/g, '')}`} className="tel-link">
        {part}
      </a>
    ) : (
      part
    )
  );
}

export function InfoTab() {
  return (
    <div className="space-y-5">
      <section className="space-y-1.5">
        <p className="section-kicker">Info</p>
        <h2 className="display-heading text-lg">Official guide notes</h2>
      </section>

      <section className="emergency-card space-y-3" aria-labelledby="emergency-title">
        <div>
          <p className="section-kicker text-pink">Keep handy</p>
          <h3 id="emergency-title" className="display-heading text-xl text-indigo-brand">
            {EMERGENCY.title}
          </h3>
        </div>

        <div className="grid gap-2">
          {EMERGENCY.items.map((item) => (
            <div key={item.label} className="emergency-phone">
              <a
                href={`tel:${item.label.replace(/\s+/g, '')}`}
                className="inline-flex min-h-8 items-center gap-1.5 text-pink"
              >
                <PhoneIcon />
                <span>{item.label}</span>
              </a>
              <p>{linkifyPhones(item.detail)}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-pink/25 bg-pink/10 p-2.5 text-sm leading-5 text-indigo-brand">
          <div className="mb-1 inline-flex items-center gap-1.5 font-black text-pink">
            <FlameIcon />
            Fire
          </div>
          <p>{linkifyPhones(EMERGENCY.fire)}</p>
        </div>

        <div className="grid gap-1.5">
          {EMERGENCY.support.map((contact) => (
            <p key={contact.who} className="text-xs leading-5 text-indigo-brand">
              <span className="font-black text-pink">{contact.who}: </span>
              {contact.what}
            </p>
          ))}
        </div>
      </section>

      <section className="panel-card space-y-3">
        <div>
          <p className="section-kicker text-pink">No app store needed</p>
          <h3 className="display-heading text-lg text-indigo-brand">Install on your phone</h3>
          <p className="mt-1 text-sm leading-5 text-[var(--muted-indigo)]">
            Add JOMO Guide to your home screen — it opens full-screen and works offline on the playa.
          </p>
        </div>

        <div className="grid gap-2">
          <div className="rounded-2xl border border-indigo-brand/15 bg-white/40 p-2.5 text-sm leading-5 text-indigo-brand">
            <p className="mb-1 font-black">🍎 iPhone / iPad (Safari)</p>
            <p>
              Tap the <strong>Share</strong> button (the square with an arrow), scroll down, then tap{' '}
              <strong>Add to Home Screen</strong>.
            </p>
          </div>
          <div className="rounded-2xl border border-indigo-brand/15 bg-white/40 p-2.5 text-sm leading-5 text-indigo-brand">
            <p className="mb-1 font-black">🤖 Android (Chrome)</p>
            <p>
              Tap the <strong>⋮</strong> menu (top right), then tap <strong>Install app</strong> or{' '}
              <strong>Add to Home screen</strong>.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        {INFO_SECTIONS.map((section) => (
          <div key={section.id} className="panel-card space-y-2">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="text-lg leading-none">
                {section.emoji}
              </span>
              <h3 className="display-heading text-base text-indigo-brand">{section.title}</h3>
            </div>
            <p className="text-sm leading-6 text-indigo-brand">{linkifyPhones(section.summary)}</p>
            <details className="info-toggle">
              <summary>Read the full guide</summary>
              <div className="mt-2 space-y-3 border-t border-indigo-brand/15 pt-2.5">
                {section.details.map((block, index) => (
                  <div key={`${section.id}-${index}`} className="text-sm leading-6 text-indigo-brand">
                    {block.heading ? <h4 className="font-black text-pink">{block.heading}</h4> : null}
                    <p>{linkifyPhones(block.body)}</p>
                  </div>
                ))}
              </div>
            </details>
          </div>
        ))}
      </section>
    </div>
  );
}
