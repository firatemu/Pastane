export function Breadcrumbs({ items }: Readonly<{ items: Array<{ label: string; href?: string }> }>): React.JSX.Element {
  return (
    <nav aria-label="Sayfa konumu" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li className="flex items-center gap-2" key={`${item.label}-${index}`}>
            {index ? <span>/</span> : null}
            {item.href ? <a className="hover:text-primary" href={item.href}>{item.label}</a> : <span>{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
