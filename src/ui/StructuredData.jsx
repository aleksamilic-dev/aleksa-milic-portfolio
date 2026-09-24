import { CERTIFICATIONS, CONTACT, EDUCATION, EXPERIENCE, HERO, SITE, SKILLS, SOCIALS } from '../data.js';
import portrait from '../assets/aleksa.webp';

// schema.org profile for search engines, built from data.js so it can't drift
// from the page copy. It renders inside the app, so the prerender bakes it into
// docs/index.html along with the HUD. Google reads JSON-LD anywhere in the
// document, not just <head>.
//
// WebSite is what Google takes the site name in results from. ProfilePage +
// Person tie the page and the GitHub and LinkedIn profiles to one person,
// which matters with this many namesakes.
const person = { '@id': `${SITE.url}#person` };
const website = { '@id': `${SITE.url}#website` };

const current = EXPERIENCE.find((x) => x.period.endsWith('Present'));
const schools = [...new Set(EDUCATION.map((e) => e.org))];
const [locality, country] = HERO.location.split(', ');

const GRAPH = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      ...website,
      url: SITE.url,
      name: HERO.name,
      inLanguage: 'en',
      about: person,
    },
    {
      '@type': 'ProfilePage',
      '@id': `${SITE.url}#profile`,
      url: SITE.url,
      name: `${HERO.name} · ${HERO.role}`,
      isPartOf: website,
      mainEntity: person,
    },
    {
      '@type': 'Person',
      ...person,
      name: HERO.name,
      url: SITE.url,
      image: new URL(portrait, SITE.url).href,
      jobTitle: HERO.role,
      description: SITE.summary,
      email: `mailto:${CONTACT.email}`,
      address: { '@type': 'PostalAddress', addressLocality: locality, addressCountry: country },
      // "Ingsoftware / ASML" is employer / client; the employer is the org.
      ...(current && {
        worksFor: { '@type': 'Organization', name: current.org.split(' / ')[0] },
      }),
      alumniOf: schools.map((name) => ({ '@type': 'CollegeOrUniversity', name })),
      hasCredential: [
        ...EDUCATION.map((e) => ({
          '@type': 'EducationalOccupationalCredential',
          name: e.degree,
          credentialCategory: 'degree',
          recognizedBy: { '@type': 'CollegeOrUniversity', name: e.org },
        })),
        ...CERTIFICATIONS.map((c) => ({
          '@type': 'EducationalOccupationalCredential',
          name: c.name,
          credentialCategory: 'certification',
          url: c.href,
          recognizedBy: { '@type': 'Organization', name: c.issuer },
        })),
      ],
      knowsAbout: [...SITE.topics, ...SKILLS.flatMap((g) => g.items)],
      sameAs: SOCIALS.map((s) => s.href).filter((h) => h.startsWith('http')),
    },
  ],
};

// `<` escaped so no string in the data can close the script tag early.
const JSON_LD = JSON.stringify(GRAPH).replace(/</g, '\\u003c');

export default function StructuredData() {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />;
}
