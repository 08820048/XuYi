interface AboutProject {
  nameHtml: string
  descriptionHtml: string
  imageHtml?: string
  links: Array<{ href: string; labelHtml: string }>
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function getLinks(html: string) {
  return Array.from(html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)).map((match) => ({
    href: match[1],
    labelHtml: match[2],
  }))
}

function findHeading(html: string, pattern: RegExp) {
  return Array.from(html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)).find((match) => pattern.test(stripHtml(match[1])))
}

function parseProjects(html: string) {
  const heading = findHeading(html, /作品集|portfolio/i)
  if (!heading || heading.index === undefined) return null

  const sectionStart = heading.index + heading[0].length
  const sectionEnd = html.slice(sectionStart).search(/<hr\b/i)
  const sectionHtml = html.slice(sectionStart, sectionEnd < 0 ? undefined : sectionStart + sectionEnd)
  const projects: AboutProject[] = []

  for (const blockMatch of sectionHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const block = blockMatch[1]
    const nameMatch = block.match(/<strong\b[^>]*>([\s\S]*?)<\/strong>/i)
    if (!nameMatch) continue

    const imageMatch = block.match(/<img\b[^>]*>/i)
    const descriptionHtml = block
      .replace(nameMatch[0], '')
      .replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, '')
      .replace(/<img\b[^>]*>/gi, '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    projects.push({
      nameHtml: nameMatch[1],
      descriptionHtml,
      imageHtml: imageMatch?.[0],
      links: getLinks(block),
    })
  }

  return projects.length > 0 ? { headingHtml: heading[1], projects } : null
}

function getContactHtml(html: string) {
  const contactMatch = findHeading(html, /联系我|contact/i)
  return contactMatch?.index === undefined ? '' : html.slice(contactMatch.index).trim()
}

export function AboutShowcase({ html, id }: { html: string; id?: string }) {
  const parsedProjects = parseProjects(html)
  const contactHtml = getContactHtml(html)

  if (!parsedProjects) {
    return <div id={id} className="about-showcase-fallback rich-content" dangerouslySetInnerHTML={{ __html: html }} />
  }

  return (
    <div id={id} className="about-showcase">
      <section className="about-projects" aria-labelledby="about-projects-title">
        <div className="about-section-heading">
          <h1 id="about-projects-title" dangerouslySetInnerHTML={{ __html: parsedProjects.headingHtml }} />
        </div>
        <div id="about-projects-content" className="about-project-grid">
          {parsedProjects.projects.map((project, index) => (
            <article className="about-project" key={`${project.nameHtml}-${index}`}>
              <div className="about-project-topline">
                <span className="about-project-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="about-project-status">{project.links.length ? 'LIVE' : 'NOTE'}</span>
              </div>
              {project.imageHtml ? (
                <div className="about-project-image" dangerouslySetInnerHTML={{ __html: project.imageHtml }} />
              ) : (
                <div className="about-project-glyph" aria-hidden="true">{stripHtml(project.nameHtml).slice(0, 2).toUpperCase()}</div>
              )}
              <h3 dangerouslySetInnerHTML={{ __html: project.nameHtml }} />
              {project.descriptionHtml && (
                <div className="about-project-description rich-content" dangerouslySetInnerHTML={{ __html: project.descriptionHtml }} />
              )}
              {project.links.length > 0 && (
                <div className="about-project-links">
                  {project.links.map((link) => (
                    <a key={`${link.href}-${link.labelHtml}`} href={link.href} target="_blank" rel="noopener noreferrer">
                      <span dangerouslySetInnerHTML={{ __html: link.labelHtml }} />
                      <span aria-hidden="true">↗</span>
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {contactHtml && (
        <section className="about-contact" aria-labelledby="about-contact-title">
          <div className="about-contact-label">
            <h2 id="about-contact-title">联系我</h2>
          </div>
          <div id="about-contact-content" className="about-contact-copy rich-content" dangerouslySetInnerHTML={{ __html: contactHtml.replace(/<h2\b[^>]*>[\s\S]*?<\/h2>/i, '') }} />
        </section>
      )}
    </div>
  )
}
