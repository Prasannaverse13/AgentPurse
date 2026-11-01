import Link from 'next/link';

export default function Topbar({ title, sub, action }: { title: string; sub?: string; action?: { label: string; href: string } }) {
  return (
    <div className="topbar">
      <div className="stack gap-4">
        <h1 className="h3">{title}</h1>
        {sub && <p className="small" style={{ margin: 0 }}>{sub}</p>}
      </div>
      {action && <Link href={action.href} className="btn btn-primary">{action.label}</Link>}
    </div>
  );
}
