import { useEffect, useRef, useState } from 'react';
import { useFactory } from '../store.js';
import {
  ABOUT,
  CERTIFICATIONS,
  CONTACT,
  EDUCATION,
  EXPERIENCE,
  HERO,
  PROJECTS,
  SECTIONS,
  SKILLS,
  SOCIALS,
} from '../data.js';
import { ArrowDown, ArrowUpRight, ExternalLink, SOCIAL_ICONS } from './icons.js';
import { ISSUER_MARK } from './brands.jsx';
import portrait from '../assets/aleksa.webp';

const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function jumpTo(id) {
  const target = document.getElementById(`sec-${id}`);
  if (!target) return;
  target.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
}

// ---------------------------------------------------------------------------
// Chrome
// ---------------------------------------------------------------------------
function TopBar() {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => jumpTo('hero')}>
        <span className="brand__mark" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="brand__name">{HERO.name}</span>
        <span className="brand__sub">{HERO.role}</span>
      </button>

      <div className="topbar__social">
        {SOCIALS.map((soc) => {
          const Ico = SOCIAL_ICONS[soc.icon];
          return (
            <a
              key={soc.label}
              href={soc.href}
              aria-label={soc.label}
              target={soc.href.startsWith('http') ? '_blank' : undefined}
              rel="noreferrer"
            >
              <Ico size={15} />
            </a>
          );
        })}
      </div>
    </header>
  );
}

function RailFill() {
  const ref = useRef();
  useEffect(
    () =>
      useFactory.subscribe((s) => {
        if (ref.current) ref.current.style.transform = `scaleY(${s.progress})`;
      }),
    [],
  );
  return (
    <span className="rail__track">
      <span ref={ref} className="rail__fill" />
    </span>
  );
}

// Quiet progress indicator — a fill bar + one tick per section.
function ProgressRail() {
  const active = useFactory((s) => s.section);
  return (
    <nav className="rail" aria-label="Progress">
      <RailFill />
      {SECTIONS.map((s, i) => (
        <button
          key={s.id}
          className={`rail__dot ${i === active ? 'is-active' : ''}`}
          aria-label={s.nav}
          aria-current={i === active}
          onClick={() => jumpTo(s.id)}
        >
          <span className="rail__tick" />
          <span className="rail__label">{s.nav}</span>
        </button>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------
function ProfileCard() {
  return (
    <aside className="profile" data-reveal>
      <div className="profile__frame">
        <img
          className="profile__photo"
          src={portrait}
          alt={HERO.name}
          width="800"
          height="800"
          decoding="async"
        />
      </div>
      <div className="profile__meta">
        <span>{HERO.location}</span>
        <span>{HERO.status}</span>
      </div>
    </aside>
  );
}

function Hero() {
  return (
    <section id="sec-hero" className="section section--hero">
      <div className="hero" data-reveal>
        <p className="hero__eyebrow">
          <span className="hero__spark" aria-hidden />
          {HERO.tagline}
        </p>
        <h1 className="hero__title">{HERO.name}</h1>
        <p className="hero__value">{HERO.value}</p>
        <div className="hero__actions">
          {HERO.ctas.map((c) => (
            <button
              key={c.to}
              className={`btn ${c.primary ? 'btn--primary' : ''}`}
              onClick={() => jumpTo(c.to)}
            >
              {c.label}
              {c.primary ? <ArrowDown size={15} /> : <ArrowUpRight size={15} />}
            </button>
          ))}
        </div>
      </div>

      <ProfileCard />

      <button className="hero__cue" onClick={() => jumpTo('work')} aria-label="Scroll to selected work">
        <ArrowDown size={14} />
        Selected work
      </button>
    </section>
  );
}

// A project whose visual is a live embed rather than a static image. The
// embedded page (see public/nis-urban-development-radar.html) posts its content
// height to us so the iframe never scrolls internally.
function ProjectEmbed({ embed }) {
  const [height, setHeight] = useState(embed.minHeight || 780);

  useEffect(() => {
    function onMessage(e) {
      if (!e.data || e.data.source !== 'nis-radar') return;
      const px = Number(e.data.height);
      if (Number.isFinite(px)) setHeight(Math.min(Math.max(px, 360), 2400));
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <div className="project__embed" data-reveal>
      <div className="project__embed-intro">
        <p className="project__embed-kicker">{embed.title}</p>
        <p className="project__embed-blurb">{embed.blurb}</p>
      </div>
      <div className="project__embed-frame">
        <iframe
          src={embed.src}
          title={embed.frameTitle || embed.title}
          loading="lazy"
          style={{ height }}
        />
      </div>
      <p className="project__embed-note">
        {embed.note ? `${embed.note} ` : null}
        <a href={embed.repo} target="_blank" rel="noreferrer">
          {embed.repoLabel || 'Source on GitHub'} <ExternalLink size={12} />
        </a>
      </p>
    </div>
  );
}

function Work() {
  return (
    <section id="sec-work" className="section section--work">
      <header className="section__head" data-reveal>
        <p className="section__kicker">{SECTIONS[1].num} / Selected work</p>
        <h2 className="section__title">Things I&rsquo;ve built</h2>
      </header>

      <ol className="work__list">
        {PROJECTS.map((p, i) => (
          <li key={p.id} className={p.embed ? 'project project--embed' : 'project'} data-reveal>
            <div className="project__aside">
              <span className="project__index">{String(i + 1).padStart(2, '0')}</span>
              <span className="project__year">{p.year}</span>
            </div>
            <div className="project__body">
              <h3 className="project__title">{p.title}</h3>
              <p className="project__context">{p.context}</p>
              <dl className="project__facts">
                <div>
                  <dt>Role</dt>
                  <dd>{p.role}</dd>
                </div>
                <div>
                  <dt>Outcome</dt>
                  <dd>{p.outcome}</dd>
                </div>
              </dl>
              <ul className="project__stack">
                {p.stack.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              {p.href && (
                <a className="project__link" href={p.href} target="_blank" rel="noreferrer">
                  View case study <ExternalLink size={13} />
                </a>
              )}
            </div>
            {p.image ? (
              <figure className="project__figure">
                <img src={p.image} alt={p.imageAlt || `${p.title} screenshot`} loading="lazy" />
              </figure>
            ) : p.embed ? null : (
              <figure className="project__figure">
                <span className="project__figure-ph">Dashboard / screenshot</span>
              </figure>
            )}
            {p.embed && <ProjectEmbed embed={p.embed} />}
          </li>
        ))}
      </ol>
    </section>
  );
}

function SkillsExperience() {
  return (
    <section id="sec-skills" className="section section--skills">
      <header className="section__head" data-reveal>
        <p className="section__kicker">{SECTIONS[2].num} / Skills &amp; experience</p>
        <h2 className="section__title">What I work with</h2>
      </header>

      <p className="about" data-reveal>
        {ABOUT}
      </p>

      <div className="skills" data-reveal>
        {SKILLS.map((g) => (
          <div key={g.group} className="skills__group">
            <h4>{g.group}</h4>
            <ul>
              {g.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <ol className="experience" data-reveal>
        {EXPERIENCE.map((e, i) => (
          <li key={i} className="xp">
            <span className="xp__period">{e.period}</span>
            <div className="xp__body">
              <h4 className="xp__role">{e.role}</h4>
              <p className="xp__org">{e.org}</p>
              <ul>
                {e.points.map((pt, j) => (
                  <li key={j}>{pt}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>

      <div className="ledger" data-reveal>
        <div className="ledger__col">
          <h3 className="ledger__label">Education</h3>
          <ul>
            {EDUCATION.map((e) => (
              <li key={e.degree}>
                <span className="ledger__period">{e.period}</span>
                <h4>{e.degree}</h4>
                <p className="ledger__org">{e.org}</p>
                <p className="ledger__note">{e.note}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="ledger__col">
          <h3 className="ledger__label">Certifications</h3>
          <ul className="certs">
            {CERTIFICATIONS.map((c) => {
              const Mark = ISSUER_MARK[c.issuer];
              const Card = c.href ? 'a' : 'div';
              return (
                <li key={c.name}>
                  <Card
                    className="cert"
                    {...(c.href
                      ? { href: c.href, target: '_blank', rel: 'noreferrer' }
                      : {})}
                  >
                    <span className="cert__mark" aria-hidden>
                      {Mark ? <Mark /> : null}
                    </span>
                    <span className="cert__body">
                      <span className="cert__name">{c.name}</span>
                      <span className="cert__meta">
                        <span className="cert__issuer">{c.issuer}</span>
                        {c.level ? <span className="cert__level">{c.level}</span> : null}
                      </span>
                    </span>
                    {c.href ? <ExternalLink className="cert__ext" size={13} /> : null}
                  </Card>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="sec-contact" className="section section--contact">
      <header className="section__head" data-reveal>
        <p className="section__kicker">{SECTIONS[3].num} / Contact</p>
        <h2 className="section__title">Get in touch</h2>
      </header>

      <div className="contact" data-reveal>
        <p className="contact__blurb">{CONTACT.blurb}</p>

        <a className="contact__email" href={`mailto:${CONTACT.email}`}>
          {CONTACT.email}
          <ArrowUpRight size={16} />
        </a>

        <div className="contact__socials">
          {SOCIALS.filter((s) => s.icon !== 'mail').map((soc) => {
            const Ico = SOCIAL_ICONS[soc.icon];
            return (
              <a key={soc.label} href={soc.href} target="_blank" rel="noreferrer">
                <Ico size={15} /> {soc.label}
              </a>
            );
          })}
        </div>
      </div>

      <p className="contact__foot">
        © {new Date().getFullYear()} {HERO.name}
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------
export default function HUD() {
  const setProgress = useFactory((s) => s.setProgress);
  const viewport = useRef();
  const ticking = useRef(false);
  const pending = useRef([]); // [data-reveal] elements not yet shown

  // One rAF-throttled pass per scroll handles both jobs: the 0..1 progress
  // for the rail fill, and revealing any [data-reveal] that has entered the
  // lower viewport. Doing reveals here (rather than via IntersectionObserver)
  // means a fast fling can't skip an element — anything scrolled past just
  // reads as top < threshold and gets shown.
  const sample = () => {
    const el = viewport.current;
    if (!el) return;

    const max = el.scrollHeight - el.clientHeight;
    setProgress(max > 0 ? el.scrollTop / max : 0);

    const trigger = el.clientHeight * 0.92;
    if (pending.current.length) {
      pending.current = pending.current.filter((node) => {
        if (node.getBoundingClientRect().top < trigger) {
          node.classList.add('in-view');
          return false;
        }
        return true;
      });
    }
  };

  const onScroll = () => {
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      sample();
      ticking.current = false;
    });
  };

  // Track the section in view for the nav + rail. The middle-band rootMargin
  // means a fast scroll can at worst leave this briefly stale, never stuck.
  useEffect(() => {
    const root = viewport.current;
    if (!root) return;

    pending.current = [...root.querySelectorAll('[data-reveal]')];
    sample(); // reveal whatever is on-screen at load

    if (!('IntersectionObserver' in window)) {
      pending.current.forEach((r) => r.classList.add('in-view'));
      pending.current = [];
      return;
    }

    // On a cold load the viewport can still be 0-height when this effect
    // runs — that zeroes the reveal threshold in sample(), so the first
    // screen (hero + profile card) stays hidden until the visitor scrolls.
    // Re-sample once it has a real height, and on any later resize.
    const resizeObserver = new ResizeObserver(() => onScroll());
    resizeObserver.observe(root);

    const sections = [...root.querySelectorAll('.section')];
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = sections.indexOf(entry.target);
          if (idx >= 0) useFactory.getState().setSection(idx);
        });
      },
      { root, rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    sections.forEach((s) => sectionObserver.observe(s));

    return () => {
      resizeObserver.disconnect();
      sectionObserver.disconnect();
    };
  }, []);

  return (
    <>
      <TopBar />
      <ProgressRail />

      <main ref={viewport} className="viewport" onScroll={onScroll}>
        <Hero />
        <Work />
        <SkillsExperience />
        <Contact />
      </main>
    </>
  );
}
