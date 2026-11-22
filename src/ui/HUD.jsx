import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useFactory } from '../store.js';
import { useMediaQuery } from '../hooks.js';
import { beatAt, measureKnots } from '../beats.js';
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
import { ArrowDown, ArrowUpRight, Download, ExternalLink, Pause, Play, SOCIAL_ICONS } from './icons.js';
import { ISSUER_MARK } from './brands.jsx';
import BenchFigure from './BenchFigure.jsx';

function jumpTo(id) {
  const target = document.getElementById(`sec-${id}`);
  if (!target) return;
  // `calm` is the visitor's own explicit choice (the topbar toggle — see
  // store.js; it defaults to full motion regardless of the OS setting), so
  // an instant jump only kicks in once they've actually turned it off.
  const instant = useFactory.getState().calm;
  target.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'start' });
}

// Records a click as an event in GoatCounter, the cookie-free analytics that
// index.html loads. Page views count themselves. These are the visits that go
// somewhere a page view can't see: the CV, an email, a profile, and which
// project's repo, report or docs a visitor opened, or which certificate. Does
// nothing until count.js has loaded, or at all if a blocker stopped it.
function track(path, title) {
  window.goatcounter?.count?.({ path, title, event: true });
}

// An event path from a display name: "Fabric Data Engineer" -> "fabric-data-engineer".
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// ---------------------------------------------------------------------------
// Chrome
// ---------------------------------------------------------------------------
// Sits among the social icons at the same size and weight, so it reads as
// one more icon in that row rather than a distinct control. The icon shows
// the action a click will take (Play while motion is already reduced), which
// doubles as the state.
function MotionToggle() {
  const calm = useFactory((s) => s.calm);
  const toggleCalm = useFactory((s) => s.toggleCalm);
  const Icon = calm ? Play : Pause;
  const label = calm ? 'Resume ambient motion' : 'Reduce ambient motion';
  return (
    <button
      className="motion-toggle"
      onClick={toggleCalm}
      aria-pressed={calm}
      aria-label={label}
      title={label}
    >
      <Icon size={15} />
    </button>
  );
}

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
              onClick={() => track(soc.icon, soc.label)}
            >
              <Ico size={15} />
            </a>
          );
        })}
        <MotionToggle />
      </div>
    </header>
  );
}

// Writes progress as a custom property, which styles.css turns into the
// fill's height. A direct style write per scroll frame, no React render. Only
// while the rail is on screen: phones hide it (styles.css, under 721px), and
// writing to it anyway cost a style pass on every scroll frame there.
function RailFill() {
  const ref = useRef();
  const hidden = useMediaQuery('(max-width: 720px)');
  useEffect(() => {
    if (hidden) return undefined;
    const write = (progress) => ref.current?.style.setProperty('--p', progress);
    write(useFactory.getState().progress);
    return useFactory.subscribe((s, prev) => {
      if (s.progress !== prev.progress) write(s.progress);
    });
  }, [hidden]);
  return (
    <span className="rail__track">
      <span ref={ref} className="rail__fill" />
    </span>
  );
}

// Quiet progress indicator — a fill bar + one tick per section. Vertical on
// desktop, a thin horizontal strip under the topbar on phones (where it's the
// only navigation and the only sense of page length there is: the scroll
// container hides its scrollbar).
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
// How wide the card shows the photo at each of styles.css's breakpoints: the
// card's width less its padding and the frame's border. A phone at 3x lands
// on the 400px copy, and so does a desktop at 1x.
const PHOTO_SIZES = '(max-width: 720px) 132px, (max-width: 900px) 168px, 208px';

function ProfileCard() {
  return (
    <aside className="profile" data-reveal>
      <div className="profile__frame">
        <img
          className="profile__photo"
          src={HERO.photo.src}
          srcSet={HERO.photo.srcSet}
          sizes={PHOTO_SIZES}
          alt={`${HERO.name}, ${HERO.role}`}
          width={HERO.photo.width}
          height={HERO.photo.height}
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

// Counts + the test breakdown for an embed, drawn in our own markup rather
// than inside the frame — it prerenders, and a cross-origin frame couldn't
// hand us this anyway.
function EmbedStats({ stats }) {
  const total = stats.tests.reduce((sum, t) => sum + t.n, 0);
  return (
    <div className="estat">
      <p className="estat__counts">
        {stats.counts.map((c) => (
          <span key={c.label}>
            <b>{c.n}</b> {c.label}
          </span>
        ))}
      </p>

      <div>
        <span className="estat__bar">
          {stats.tests.map((t) => (
            <i
              key={t.name}
              style={{ width: (t.n / total) * 100 + '%', background: 'var(--' + t.tone + ')' }}
            />
          ))}
        </span>
        <p className="estat__keys">
          {stats.tests.map((t) => (
            <span key={t.name}>
              <em style={{ background: 'var(--' + t.tone + ')' }} />
              <b>{t.n}</b> {t.name}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}

// When an embed's frame gets its page: once the visitor is within a screen of
// it, or once the page has settled after load, whichever comes first. The
// Niš dashboard draws its charts in script on the page's own main thread
// (same origin), about a second's work on a mid-range phone. With only the
// browser's lazy loading it started at once, far below the fold, in the
// middle of everything else the page does on load. Settled means after the
// 3D's opening push-in on a slow phone, and at a moment the visitor isn't
// scrolling, since that second of script would stall the scroll. It still
// usually loads before anyone gets down to it.
const EMBED_SETTLE_MS = 8000;
const EMBED_QUIET_MS = 1200;

function useNear(ref) {
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (near) return undefined;
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) {
      setNear(true);
      return undefined;
    }
    const go = () => setNear(true);
    // the page scrolls inside .viewport, so that's what "a screen away" means
    const root = el.closest('.viewport');
    const scroller = root || window;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && go(), {
      root,
      rootMargin: '100% 0px',
    });
    io.observe(el);
    let lastScroll = -Infinity;
    const onScroll = () => {
      lastScroll = performance.now();
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    let timer = 0;
    let idle = 0;
    const settle = () => {
      const wait = lastScroll + EMBED_QUIET_MS - performance.now();
      if (wait > 0) timer = setTimeout(settle, wait);
      else if (window.requestIdleCallback) idle = window.requestIdleCallback(go, { timeout: 3000 });
      else go();
    };
    timer = setTimeout(settle, EMBED_SETTLE_MS);
    return () => {
      io.disconnect();
      scroller.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
      if (idle) window.cancelIdleCallback(idle);
    };
  }, [near, ref]);
  return near;
}

// A project whose visual is a live embed rather than a static image.
//
// Same-origin panels post their content height to us so the iframe never
// scrolls internally; `embed.source` names which panel a message came from.
// `embed.external` marks a cross-origin frame instead: fixed viewport, no
// handshake, and a shield the visitor has to click before the frame takes
// pointer events — without it a scroll down the page is swallowed by the
// embedded graph's own zoom. Any later page scroll re-arms the shield.
function ProjectEmbed({ embed, onLink, onActivate }) {
  const [height, setHeight] = useState(embed.minHeight || 780);
  const [live, setLive] = useState(false);
  const source = embed.source;
  const frame = useRef();
  const near = useNear(frame);

  // dbt's graph doesn't refit to a narrow frame, it just crops — below about a
  // 960px frame you land on a corner of the DAG with the control bar wrapped
  // over it. 1100px of viewport is where the embed lane still clears that, and
  // it's already a breakpoint here. Narrower than that, hand off to the docs.
  const wide = useMediaQuery('(min-width: 1100px)');
  const showFrame = !embed.external || wide;

  useEffect(() => {
    if (!source) return; // cross-origin frame — nothing will talk back
    function onMessage(e) {
      // every panel of ours is served from this origin
      if (e.origin !== window.location.origin) return;
      if (!e.data || e.data.source !== source) return;
      const px = Number(e.data.height);
      if (Number.isFinite(px)) setHeight(Math.min(Math.max(px, 360), 2400));
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [source]);

  // While the frame is live it eats the wheel, so the page can only scroll
  // from outside it — which makes scrolling away a safe signal to shield it
  // again. Needs a threshold, though: the visitor clicks the shield moments
  // after scrolling to it, and the tail of that scroll would otherwise re-arm
  // it out from under them.
  useEffect(() => {
    if (!live) return;
    const from = useFactory.getState().progress;
    return useFactory.subscribe((s) => {
      if (Math.abs(s.progress - from) > 0.01) setLive(false);
    });
  }, [live]);

  return (
    <div className="project__embed" data-reveal>
      <div className="project__embed-intro">
        <p className="project__embed-kicker">{embed.title}</p>
        {embed.blurb ? <p className="project__embed-blurb">{embed.blurb}</p> : null}
      </div>
      {embed.stats ? <EmbedStats stats={embed.stats} /> : null}

      {showFrame ? (
        <div
          ref={frame}
          className={`project__embed-frame${embed.inset ? ' project__embed-frame--crop' : ''}`}
          style={
            embed.inset
              ? { height: embed.height, '--embed-inset': `${embed.inset}px` }
              : undefined
          }
        >
          {near ? (
            <iframe
              src={embed.src}
              title={embed.frameTitle || embed.title}
              loading="lazy"
              scrolling={embed.inset ? 'no' : undefined}
              style={{
                pointerEvents: embed.external && !live ? 'none' : undefined,
                ...(embed.inset ? null : { height: embed.height || height }),
              }}
            />
          ) : embed.inset ? null : (
            // holds the frame's height until the page goes in (useNear)
            <div className="project__embed-hold" style={{ height: embed.height || height }} />
          )}
          {embed.external && !live ? (
            <button
              className="embed__shield"
              onClick={() => {
                setLive(true);
                onActivate?.();
              }}
            >
              <span>{embed.activate || 'Click to interact'}</span>
            </button>
          ) : null}
        </div>
      ) : (
        <a
          className="embed__handoff"
          href={embed.repo}
          target="_blank"
          rel="noreferrer"
          onClick={onLink}
        >
          <span>{embed.narrowLabel || embed.repoLabel}</span>
          <ExternalLink size={14} />
        </a>
      )}

      {showFrame ? (
        <p className="project__embed-note">
          <a href={embed.repo} target="_blank" rel="noreferrer" onClick={onLink}>
            {embed.repoLabel || 'Source on GitHub'} <ExternalLink size={12} />
          </a>
        </p>
      ) : null}
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
          <li
            key={p.id}
            id={p.id}
            className={p.bench ? 'project project--chart' : 'project'}
            data-reveal
          >
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
                <a
                  className="project__link"
                  href={p.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => track(`project-${p.key}-repo`, p.title)}
                >
                  Source on GitHub <ExternalLink size={13} />
                </a>
              )}
            </div>
            {p.image ? (
              <figure className="project__figure">
                {/* loading before src, see SnapPhoto */}
                <img loading="lazy" src={p.image} alt={p.imageAlt || `${p.title} screenshot`} />
              </figure>
            ) : null}
            {p.bench && (
              <BenchFigure
                bench={p.bench}
                onReport={() => track(`project-${p.key}-report`, p.title)}
              />
            )}
            {p.embed && (
              <ProjectEmbed
                embed={p.embed}
                onLink={() => track(`project-${p.key}-${p.embed.linkKind || 'repo'}`, p.title)}
                onActivate={() => track(`project-${p.key}-embed-open`, p.title)}
              />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

// A small captioned snapshot under an experience or education entry. The width
// and height are the file's real ones so the page doesn't shift as it loads.
//
// `loading` goes before `src` on a lazy image. React 18 sets the attributes
// in the order they're written, on an image that isn't in the page yet, and
// an image starts its download the moment it gets a src. Written after,
// "lazy" came too late: every visitor downloaded this photo at startup,
// alongside the 3D's own files.
function SnapPhoto({ photo }) {
  return (
    <figure className="snap">
      <img
        loading="lazy"
        className="snap__img"
        src={photo.src}
        width={photo.width}
        height={photo.height}
        alt={photo.alt}
        decoding="async"
      />
      <figcaption className="snap__cap">{photo.caption}</figcaption>
    </figure>
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
            <h3>{g.group}</h3>
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
              <h3 className="xp__role">{e.role}</h3>
              <p className="xp__org">{e.org}</p>
              <ul>
                {e.points.map((pt, j) => (
                  <li key={j}>{pt}</li>
                ))}
              </ul>
              {e.photo ? <SnapPhoto photo={e.photo} /> : null}
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
                      ? {
                          href: c.href,
                          target: '_blank',
                          rel: 'noreferrer',
                          // "Microsoft Certified: " is on most of them and
                          // says nothing in an event list
                          onClick: () =>
                            track(`cert-${slug(c.name.replace(/^.*?:\s*/, ''))}`, c.name),
                        }
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

        <a
          className="contact__email"
          href={`mailto:${CONTACT.email}`}
          onClick={() => track('mail', 'Email')}
        >
          {CONTACT.email}
          <ArrowUpRight size={16} />
        </a>

        {CONTACT.cv && (
          <a
            className="contact__cv"
            href={CONTACT.cv.href}
            download
            onClick={() => track('cv-download', CONTACT.cv.label)}
          >
            <Download size={14} />
            {CONTACT.cv.label}
            <span className="contact__cv-type">{CONTACT.cv.type}</span>
          </a>
        )}

        <div className="contact__socials">
          {SOCIALS.filter((s) => s.icon !== 'mail').map((soc) => {
            const Ico = SOCIAL_ICONS[soc.icon];
            return (
              <a
                key={soc.label}
                href={soc.href}
                target="_blank"
                rel="noreferrer"
                onClick={() => track(soc.icon, soc.label)}
              >
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
  const setScroll = useFactory((s) => s.setScroll);
  const viewport = useRef();
  const ticking = useRef(false);
  const knots = useRef(null); // where each machine sits in the scroll (beats.js)

  // One rAF-throttled pass per scroll: the 0..1 progress for the rail fill
  // and the scene. It only reads the scroll position, which the browser has
  // ready, so it never makes the browser work out the page's layout again in
  // the middle of a frame. It used to measure every element still waiting to
  // fade in too, and that forced a layout pass on every scroll frame. The
  // reveals are watched instead (below).
  const sample = () => {
    const el = viewport.current;
    if (!el) return;

    const max = el.scrollHeight - el.clientHeight;
    const progress = max > 0 ? el.scrollTop / max : 0;
    setScroll(progress, beatAt(progress, knots.current));
  };

  const onScroll = () => {
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      sample();
      ticking.current = false;
    });
  };

  // A layout effect so the first reveal pass lands before the new tree paints:
  // when it replaces the prerendered page, a paint in between would show the
  // hero at opacity 0 for a frame.
  useLayoutEffect(() => {
    const root = viewport.current;
    if (!root) return;

    // The page scrolls inside this element, not the document (body is
    // overflow:hidden), so while focus sits on <body> the browser has nothing
    // to scroll — Space/PageDown/arrows do nothing until the visitor tabs into
    // a control. Focusing the scroller on mount gives those keys a target.
    if (!document.activeElement || document.activeElement === document.body) {
      root.focus({ preventScroll: true });
    }

    knots.current = measureKnots(root);
    sample();

    // [data-reveal] fades an element in once its top comes up past 92% of the
    // screen. What's past that already at mount goes at once. When this tree
    // replaces the prerendered page (main.jsx), that was showing already, so
    // it goes with transitions off. Reading layout settles those styles
    // before the class comes off again.
    const trigger = root.clientHeight * 0.92;
    const swapping = document.documentElement.hasAttribute('data-swap');
    if (swapping) root.classList.add('is-swapping');
    const pending = [...root.querySelectorAll('[data-reveal]')].filter((node) => {
      if (node.getBoundingClientRect().top >= trigger) return true;
      node.classList.add('in-view');
      return false;
    });
    if (swapping) {
      void root.offsetHeight;
      root.classList.remove('is-swapping');
    }

    if (!('IntersectionObserver' in window)) {
      pending.forEach((r) => r.classList.add('in-view'));
      return;
    }

    // The rest are watched rather than measured. The band they're watched in
    // reaches from the trigger line to a hundred screens above, further than
    // the page goes, so anything a fast fling carries straight past the
    // screen is in it too and still fades in. It also catches a cold load,
    // where the viewport can still be 0-height at this point: the first
    // screen fades in as soon as it has a height.
    const revealer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('in-view');
          revealer.unobserve(entry.target);
        }
      },
      { root, rootMargin: '10000% 0px -8% 0px' },
    );
    pending.forEach((node) => revealer.observe(node));

    // Measured again on any resize, and when a section changes size: when an
    // embed settles on its height or a font loads, the machines' places in
    // the scroll move with the page.
    const sections = [...root.querySelectorAll('.section')];
    const resizeObserver = new ResizeObserver(() => {
      knots.current = measureKnots(root);
      onScroll();
    });
    resizeObserver.observe(root);
    sections.forEach((s) => resizeObserver.observe(s));

    // Track the section in view for the nav + rail. The middle-band rootMargin
    // means a fast scroll can at worst leave this briefly stale, never stuck.
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
      revealer.disconnect();
      resizeObserver.disconnect();
      sectionObserver.disconnect();
    };
  }, []);

  return (
    <>
      <TopBar />
      <ProgressRail />

      <main ref={viewport} className="viewport" tabIndex={-1} onScroll={onScroll}>
        <Hero />
        <Work />
        <SkillsExperience />
        <Contact />
      </main>
    </>
  );
}
