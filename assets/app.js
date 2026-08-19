const sourceTemplate = document.querySelector('#document-source');
const main = document.querySelector('#main-content');
const nav = document.querySelector('#nav-list');
const toc = document.querySelector('#toc-links');
const searchDialog = document.querySelector('#search-dialog');
const searchInput = document.querySelector('#search-input');
const searchResults = document.querySelector('#search-results');

const slugify = (value) => value
  .toLowerCase()
  .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
  .replace(/^-|-$/g, '') || 'section';

const cleanText = (node) => {
  let output = '';
  const walk = (item) => {
    if (item.nodeType === Node.TEXT_NODE) output += item.nodeValue.replace(/\s+/g, ' ');
    else if (item.nodeName === 'BR') output += '\n';
    else item.childNodes.forEach(walk);
  };
  walk(node);
  return output
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
};

function normalizeNode(node) {
  const clone = node.cloneNode(true);
  const originalStyle = clone.getAttribute?.('style') || '';
  const isCodeBlock = clone.matches?.('p') && /background:\s*#f6f8fa/i.test(originalStyle) && clone.querySelector('font[face*="Consolas"]');
  const isCallout = clone.matches?.('p') && /background:\s*#f6f8fa/i.test(originalStyle) && !isCodeBlock;

  if (isCodeBlock) {
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = cleanText(clone);
    pre.append(code);
    return pre;
  }

  clone.querySelectorAll('font[face*="Consolas"]').forEach((font) => {
    const code = document.createElement('code');
    code.textContent = cleanText(font);
    font.replaceWith(code);
  });

  clone.querySelectorAll('*').forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      if (!['href', 'colspan', 'rowspan'].includes(attribute.name)) element.removeAttribute(attribute.name);
    });
  });
  [...clone.attributes || []].forEach((attribute) => {
    if (!['href', 'colspan', 'rowspan'].includes(attribute.name)) clone.removeAttribute(attribute.name);
  });
  if (isCallout) clone.classList.add('callout');

  if (clone.matches?.('table')) {
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    wrap.append(clone);
    return wrap;
  }
  return clone;
}

function buildSections() {
  const nodes = [...sourceTemplate.content.children];
  const firstSection = nodes.findIndex((node) => node.matches('h1') && /^\s*1\.\s+Project Overview/i.test(node.textContent));
  const useful = nodes.slice(Math.max(0, firstSection));
  const sections = [];
  let current = null;

  useful.forEach((node) => {
    if (node.matches('h1') && node.textContent.trim()) {
      current = { title: node.textContent.replace(/\s+/g, ' ').trim(), nodes: [] };
      sections.push(current);
    }
    if (current) current.nodes.push(node);
  });

  return sections.map((section, index) => {
    const numberMatch = section.title.match(/^(\d+)\.\s*/);
    const title = section.title.replace(/^\d+\.\s*/, '');
    const slug = slugify(title);
    const article = document.createElement('article');
    article.className = 'doc-section';
    article.dataset.slug = slug;
    article.hidden = true;
    article.innerHTML = `<div class="eyebrow">RealHand ROS 2 SDK · Chapter ${numberMatch?.[1] || index + 1}</div>`;

    section.nodes.forEach((node) => {
      const cleaned = normalizeNode(node);
      if (cleaned.matches?.('p') && !cleaned.textContent.trim()) return;
      const previous = article.lastElementChild;
      if (cleaned.matches?.('pre') && previous?.matches('pre')) {
        previous.querySelector('code').textContent += `\n${cleaned.querySelector('code').textContent}`;
      } else {
        article.append(cleaned);
      }
    });

    const headings = [...article.querySelectorAll('h1, h2, h3')];
    headings.forEach((heading, headingIndex) => {
      heading.id = `${slug}-${slugify(heading.textContent)}-${headingIndex}`;
    });

    article.querySelectorAll('pre').forEach((pre) => {
      const button = document.createElement('button');
      button.className = 'copy-button';
      button.type = 'button';
      button.title = 'Copy code';
      button.setAttribute('aria-label', 'Copy code');
      button.textContent = '⧉';
      button.addEventListener('click', async () => {
        await navigator.clipboard.writeText(pre.querySelector('code').textContent);
        button.textContent = '✓';
        setTimeout(() => { button.textContent = '⧉'; }, 1200);
      });
      pre.append(button);
    });

    section.number = numberMatch?.[1] || String(index + 1);
    section.title = title;
    section.slug = slug;
    section.article = article;
    section.headings = headings;
    section.searchText = article.textContent.replace(/\s+/g, ' ').trim();
    return section;
  });
}

const sections = buildSections();
main.replaceChildren(...sections.map((section) => section.article));

sections.forEach((section) => {
  const group = document.createElement('div');
  group.className = 'nav-group';
  group.dataset.section = section.slug;

  const link = document.createElement('a');
  link.className = 'nav-link';
  link.href = `#/${section.slug}`;
  link.dataset.section = section.slug;
  link.innerHTML = `<span class="nav-number">${String(section.number).padStart(2, '0')}</span><span>${section.title}</span>`;
  group.append(link);

  const children = document.createElement('div');
  children.className = 'nav-children';
  let levelTwo = 0;
  let levelThree = 0;
  section.headings.filter((heading) => !heading.matches('h1')).forEach((heading) => {
    if (heading.matches('h2')) {
      levelTwo += 1;
      levelThree = 0;
    } else {
      levelThree += 1;
    }
    const generatedNumber = heading.matches('h3')
      ? `${section.number}.${levelTwo}.${levelThree}`
      : `${section.number}.${levelTwo}`;
    const headingText = heading.textContent.replace(/\s+/g, ' ').trim();
    const existingNumber = headingText.match(/^(\d+(?:\.\d+)+)\.?\s+/);
    const childNumber = existingNumber?.[1] || generatedNumber;
    const childTitle = headingText.replace(/^\d+(?:\.\d+)+\.?\s+/, '');
    const child = document.createElement('a');
    child.className = heading.matches('h3') ? 'nav-child-link level-3' : 'nav-child-link level-2';
    child.href = `#/${section.slug}/${heading.id}`;
    child.dataset.section = section.slug;
    child.innerHTML = `<span class="nav-child-number">${childNumber}</span><span>${childTitle}</span>`;
    children.append(child);
  });
  if (children.childElementCount) group.append(children);
  nav.append(group);
});

function addPager(section, index) {
  const footer = document.createElement('nav');
  footer.className = 'section-footer';
  footer.setAttribute('aria-label', 'Chapter navigation');
  const previous = sections[index - 1];
  const next = sections[index + 1];
  footer.innerHTML = `
    ${previous ? `<a class="pager" href="#/${previous.slug}">← Previous<span>${previous.title}</span></a>` : '<span></span>'}
    ${next ? `<a class="pager next" href="#/${next.slug}">Next →<span>${next.title}</span></a>` : '<span></span>'}
  `;
  section.article.append(footer);
}
sections.forEach(addPager);

function route() {
  const hashParts = decodeURIComponent(location.hash.replace(/^#\//, '')).split('/');
  const requested = hashParts[0];
  const requestedHeading = hashParts[1];
  const current = sections.find((section) => section.slug === requested) || sections[0];
  sections.forEach((section) => { section.article.hidden = section !== current; });
  document.querySelectorAll('.nav-link').forEach((link) => link.classList.toggle('active', link.dataset.section === current.slug));
  document.querySelectorAll('.nav-child-link').forEach((link) => {
    link.classList.toggle('active', link.getAttribute('href') === `#/${current.slug}/${requestedHeading}`);
  });
  document.querySelectorAll('.nav-group').forEach((group) => group.classList.toggle('current', group.dataset.section === current.slug));
  toc.replaceChildren();
  current.headings.filter((heading) => !heading.matches('h1')).forEach((heading) => {
    const link = document.createElement('a');
    link.href = `#${heading.id}`;
    link.className = heading.matches('h3') ? 'level-3' : 'level-2';
    link.textContent = heading.textContent;
    link.addEventListener('click', (event) => {
      event.preventDefault();
      heading.scrollIntoView({ behavior: 'smooth' });
      history.replaceState(null, '', `#/${current.slug}/${heading.id}`);
    });
    toc.append(link);
  });
  document.title = `${current.title} · RealHand ROS 2 SDK`;
  document.body.classList.remove('nav-open');
  if (requestedHeading) {
    requestAnimationFrame(() => document.getElementById(requestedHeading)?.scrollIntoView({ behavior: 'auto', block: 'start' }));
  } else {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

function openSearch() {
  searchDialog.showModal();
  searchInput.value = '';
  renderSearch('');
  requestAnimationFrame(() => searchInput.focus());
}

function renderSearch(query) {
  const normalized = query.trim().toLowerCase();
  const matches = normalized
    ? sections.filter((section) => section.searchText.toLowerCase().includes(normalized)).slice(0, 12)
    : sections.slice(0, 8);
  if (!matches.length) {
    searchResults.innerHTML = '<div class="search-empty">No matching chapter found.</div>';
    return;
  }
  searchResults.replaceChildren(...matches.map((section) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-result';
    const lower = section.searchText.toLowerCase();
    const position = normalized ? lower.indexOf(normalized) : 0;
    const start = Math.max(0, position - 65);
    const excerpt = section.searchText.slice(start, start + 190);
    button.innerHTML = `<strong>${section.number}. ${section.title}</strong><small>${excerpt}${section.searchText.length > start + 190 ? '…' : ''}</small>`;
    button.addEventListener('click', () => {
      searchDialog.close();
      location.hash = `#/${section.slug}`;
    });
    return button;
  }));
}

document.querySelector('#search-trigger').addEventListener('click', openSearch);
document.querySelector('#search-close').addEventListener('click', () => searchDialog.close());
searchInput.addEventListener('input', () => renderSearch(searchInput.value));
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openSearch();
  } else if (!event.ctrlKey && !event.metaKey && !event.altKey && !/input|textarea|select/i.test(document.activeElement?.tagName)) {
    if (event.key === '/' || event.key.toLowerCase() === 's') {
      event.preventDefault();
      openSearch();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const requested = location.hash.replace(/^#\//, '').split('/')[0];
      const index = Math.max(0, sections.findIndex((section) => section.slug === requested));
      const target = event.key === 'ArrowLeft' ? sections[index - 1] : sections[index + 1];
      if (target) location.hash = `#/${target.slug}`;
    }
  }
});

document.querySelector('#menu-toggle').addEventListener('click', () => {
  if (window.matchMedia('(max-width: 820px)').matches) {
    document.body.classList.toggle('nav-open');
  } else {
    document.body.classList.toggle('sidebar-hidden');
  }
});
document.querySelector('#mobile-scrim').addEventListener('click', () => document.body.classList.remove('nav-open'));
document.querySelector('#print-button').addEventListener('click', () => window.print());

const themeButton = document.querySelector('#theme-toggle');
const savedTheme = localStorage.getItem('realhand-docs-theme');
if (savedTheme) document.documentElement.dataset.theme = savedTheme;
themeButton.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('realhand-docs-theme', next);
  themeButton.textContent = next === 'dark' ? '☀' : '◐';
});

window.addEventListener('hashchange', route);
route();
