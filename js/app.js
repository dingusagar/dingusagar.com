/* ============================================================
   APP.JS — data loader + DOM renderer
   Reads data/profile.json and populates all sections.
   Theme-agnostic: only sets semantic classes and text.
   ============================================================ */

/* ── SVG icon library ─────────────────────────────────────── */
const ICONS = {
  github: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.113.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  twitter:  `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  youtube:  `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
  stackoverflow: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.725 0l-1.72 1.277 6.39 8.588 1.716-1.277zm-3.94 3.418l-1.369 1.644 8.225 6.85 1.369-1.644zm-3.15 4.465l-.905 1.94 9.702 4.517.904-1.94zm-1.85 4.86l-.44 2.093 10.473 2.201.44-2.092zM1.89 15.47V24h19.19v-8.53h-2.133v6.397H4.021v-6.396zm4.265 2.133v2.13h10.66v-2.13z"/></svg>`,
  external: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  star:     `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
  location: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
};

/* language → color map (GitHub dot colors) */
const LANG_COLORS = {
  Python:           '#3776ab',
  JavaScript:       '#f7df1e',
  TypeScript:       '#3178c6',
  Java:             '#ed8b00',
  'Jupyter Notebook': '#da5b0b',
  CSS:              '#563d7c',
  HTML:             '#e34c26',
  Go:               '#00add8',
  Rust:             '#ce412b',
  Swift:            '#fa7343',
  Kotlin:           '#7f52ff',
};

/* ── Renderers ────────────────────────────────────────────── */

function renderHero(personal, summary, stats) {
  // availability badge
  const badge = document.getElementById('hero-badge');
  if (stats?.hireable) {
    badge.innerHTML = `<span class="available-dot"></span>Available for opportunities`;
    badge.classList.add('hero-badge--visible');
  }

  const ring = document.getElementById('hero-avatar-ring');
  if (personal.photo) {
    const avatar = document.getElementById('hero-avatar');
    avatar.src = personal.photo;
    avatar.alt = personal.name;
    // Trigger fade-in after image loads
    avatar.onload = () => ring.classList.add('loaded');
    avatar.onerror = () => ring.style.display = 'none';
  } else {
    ring.style.display = 'none';
  }

  document.getElementById('hero-name').textContent  = personal.name;
  document.getElementById('hero-title').textContent = personal.title;
  document.getElementById('hero-bio').textContent   = personal.bio;

  const socials = [
    { key: 'github',        label: 'GitHub'        },
    { key: 'linkedin',      label: 'LinkedIn'      },
    { key: 'twitter',       label: 'Twitter'       },
    { key: 'youtube',       label: 'YouTube'       },
    { key: 'stackoverflow', label: 'Stack Overflow' },
  ];

  document.getElementById('hero-social').innerHTML = socials
    .filter(s => personal.social[s.key])
    .map(s => `
      <a href="${personal.social[s.key]}" target="_blank" rel="noopener"
         class="social-link" aria-label="${s.label}" role="listitem">
        ${ICONS[s.key] || s.label}
      </a>
    `).join('');
}

function renderAbout(summary, stats) {
  document.getElementById('about-text').textContent = summary;

  const statItems = [
    { value: stats.public_repos, label: 'Repositories'    },
    { value: stats.followers,    label: 'GitHub Followers' },
    { value: '2',                label: 'Publications'              },
    { value: '4.5+',             label: 'Professional Experience'   },
  ];

  document.getElementById('about-stats').innerHTML = statItems.map(s => `
    <div class="stat-item">
      <span class="stat-value">${s.value}</span>
      <span class="stat-label">${s.label}</span>
    </div>
  `).join('');

  document.getElementById('about-highlights').innerHTML = `
    <div class="glass-card highlight-card animate-on-scroll">
      <div class="highlight-icon">✍️</div>
      <h3>Writing</h3>
      <p>ML articles on Medium covering deep learning, LLM engineering, and practical AI. Guest posts on Streamlit.</p>
    </div>
    <div class="glass-card highlight-card animate-on-scroll" style="--delay: 0.1s">
      <div class="highlight-icon">🎥</div>
      <h3>Teaching</h3>
      <p>YouTube tutorials on Knowledge Distillation, Model Quantization, KBERT, and Transformer architectures.</p>
    </div>
    <div class="glass-card highlight-card animate-on-scroll" style="--delay: 0.2s">
      <div class="highlight-icon">🔬</div>
      <h3>Research</h3>
      <p>Published at NeurIPS 2025 and ACM SIGACCESS 2025 on LLM agents and assistive ML systems.</p>
    </div>
  `;
}

function renderExperience(experience, education) {
  const list = document.getElementById('experience-list');

  const workHTML = experience.map((job, i) => `
    <div class="timeline-item animate-on-scroll" style="--delay: ${i * 0.1}s">
      <div class="timeline-line"></div>
      <div class="timeline-dot ${job.endDate === 'Present' ? 'timeline-dot--current' : ''}"></div>
      <div class="glass-card timeline-card">
        <div class="timeline-header">
          <div class="timeline-title-group">
            <h3 class="timeline-role">${job.title}</h3>
            <span class="timeline-company">${job.company}</span>
          </div>
          ${job.endDate === 'Present'
            ? '<span class="badge badge--current">Current</span>'
            : ''}
        </div>
        <div class="timeline-meta">
          ${job.location ? `<span class="timeline-location">${ICONS.location}${job.location}</span>` : ''}
          <span class="timeline-dates">${[job.startDate, job.endDate].filter(Boolean).join(' – ')}</span>
        </div>
        ${job.description ? `<p class="timeline-desc">${job.description}</p>` : ''}
        ${job.highlights?.length ? `
          <ul class="timeline-highlights">
            ${job.highlights.map(h => `<li>${h}</li>`).join('')}
          </ul>` : ''}
      </div>
    </div>
  `).join('');

  const eduHTML = education.map((edu, i) => `
    <div class="timeline-item animate-on-scroll" style="--delay: ${i * 0.1}s">
      <div class="timeline-line"></div>
      <div class="timeline-dot timeline-dot--edu"></div>
      <div class="glass-card timeline-card">
        <div class="timeline-header">
          <div class="timeline-title-group">
            <h3 class="timeline-role">${edu.degree}${edu.field ? ` in ${edu.field}` : ''}</h3>
            <span class="timeline-company">${edu.institution}</span>
          </div>
          <span class="badge badge--edu">Education</span>
        </div>
        <div class="timeline-meta">
          <span class="timeline-dates">${edu.startDate} – ${edu.endDate}</span>
          ${edu.gpa ? `<span class="timeline-gpa">GPA ${edu.gpa}</span>` : ''}
        </div>
        ${edu.notes ? `<p class="timeline-desc">${edu.notes}</p>` : ''}
      </div>
    </div>
  `).join('');

  list.innerHTML = `
    <div class="timeline-section">
      <h3 class="timeline-section-label">Work</h3>
      ${workHTML}
    </div>
    <div class="timeline-section">
      <h3 class="timeline-section-label">Education</h3>
      ${eduHTML}
    </div>
  `;
}

function renderProjects(projects) {
  const sorted = [...projects].sort((a, b) => (b.stars || 0) - (a.stars || 0));

  document.getElementById('projects-grid').innerHTML = sorted.map((p, i) => `
    <div class="glass-card project-card animate-on-scroll ${i < 3 ? 'project-card--featured' : ''}"
         style="--delay: ${i * 0.07}s">
      ${i < 3 ? '<div class="project-featured-badge">Featured</div>' : ''}
      <div class="project-header">
        <h3 class="project-name">${p.name}</h3>
        ${p.stars ? `
          <div class="project-stars" aria-label="${p.stars} stars">
            ${ICONS.star}<span>${p.stars}</span>
          </div>` : ''}
      </div>
      <p class="project-desc">${p.description || 'No description available.'}</p>
      ${p.topics?.length ? `
        <div class="project-topics">
          ${p.topics.map(t => `<span class="topic-tag">${t}</span>`).join('')}
        </div>` : ''}
      <div class="project-footer">
        ${p.language ? `
          <span class="project-lang">
            <span class="lang-dot" style="background:${LANG_COLORS[p.language] || '#8b949e'}"></span>
            ${p.language}
          </span>` : '<span></span>'}
        <div class="project-links">
          <a href="${p.url}" target="_blank" rel="noopener" class="project-link" aria-label="View ${p.name} on GitHub">
            ${ICONS.github} Code
          </a>
          ${p.demo ? `
          <a href="${p.demo}" target="_blank" rel="noopener" class="project-link project-link--demo" aria-label="View ${p.name} demo">
            ${ICONS.external} Demo
          </a>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function renderSkills(skills) {
  const groups = [
    { key: 'ai_ml',       label: 'AI & Machine Learning',    icon: '🤖' },
    { key: 'frameworks',  label: 'Frameworks & Libraries',   icon: '⚙️' },
    { key: 'languages',   label: 'Languages',                icon: '💻' },
    { key: 'cloud_tools', label: 'Cloud & Tools',            icon: '☁️' },
  ];

  document.getElementById('skills-grid').innerHTML = groups.map((g, gi) => `
    <div class="glass-card skill-group animate-on-scroll" style="--delay: ${gi * 0.1}s">
      <div class="skill-group-header">
        <span class="skill-icon" aria-hidden="true">${g.icon}</span>
        <h3>${g.label}</h3>
      </div>
      <div class="skill-tags">
        ${(skills[g.key] || []).map(s => `<span class="skill-tag">${s}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

function renderPublications(publications) {
  document.getElementById('publications-list').innerHTML = publications.map((p, i) => `
    <div class="glass-card pub-card animate-on-scroll" style="--delay: ${i * 0.15}s">
      <div class="pub-header">
        <span class="pub-venue">${p.venue}</span>
        <span class="pub-date">${p.date}</span>
      </div>
      <h3 class="pub-title">${p.title}</h3>
      <p class="pub-desc">${p.description}</p>
      ${p.url ? `
        <a href="${p.url}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">
          Read Paper ${ICONS.external}
        </a>` : ''}
    </div>
  `).join('');
}

function renderCertifications(certifications) {
  document.getElementById('certs-grid').innerHTML = certifications.map((c, i) => `
    <div class="glass-card cert-card animate-on-scroll" style="--delay: ${i * 0.055}s">
      <span class="cert-issuer">${c.issuer}</span>
      <h3 class="cert-name">${c.name}</h3>
      <span class="cert-date">${c.date}</span>
    </div>
  `).join('');
}

function renderContact(personal) {
  document.getElementById('contact-subtitle').textContent =
    `Based in United States. Open to collaborating on AI/ML projects and tech talks.`;

  const links = [
    { key: 'linkedin',      label: 'LinkedIn',       url: personal.social.linkedin      },
    { key: 'github',        label: 'GitHub',         url: personal.social.github        },
    { key: 'twitter',       label: 'Twitter',        url: personal.social.twitter       },
    { key: 'youtube',       label: 'YouTube',        url: personal.social.youtube       },
    { key: 'stackoverflow', label: 'Stack Overflow', url: personal.social.stackoverflow },
  ].filter(l => l.url);

  document.getElementById('contact-links').innerHTML = links.map(l => `
    <a href="${l.url}" target="_blank" rel="noopener" class="glass-card contact-card">
      <span class="contact-icon">${ICONS[l.key] || ''}</span>
      <span>${l.label}</span>
    </a>
  `).join('');
}

function renderFooter(name) {
  document.getElementById('footer-text').innerHTML =
    `© ${new Date().getFullYear()} ${name}. Made with care.`;
}

/* ── Bootstrap ────────────────────────────────────────────── */
async function init() {
  try {
    // window.portfolioData is set by data/profile.js (works on file:// and servers)
    // Falls back to fetch for server environments where profile.js isn't loaded
    const data = window.portfolioData
      || await fetch('data/profile.json').then(r => r.json());

    document.title = `${data.personal.name} — ${data.personal.title}`;

    renderHero(data.personal, data.summary, data.github.stats);
    renderAbout(data.summary, data.github.stats);
    renderExperience(data.experience, data.education);
    renderProjects(data.github.projects);
    renderSkills(data.skills);
    renderPublications(data.publications);
    renderCertifications(data.certifications);
    renderContact(data.personal);
    renderFooter(data.personal.name);

    // Tell animations.js the DOM is ready
    document.dispatchEvent(new Event('profileLoaded'));
  } catch (err) {
    console.error('[app.js] Failed to load profile data:', err);
  }
}

document.addEventListener('DOMContentLoaded', init);
