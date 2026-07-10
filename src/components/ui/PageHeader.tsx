interface PageHeaderProps {
  index: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ index, title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="rp-pagehead">
      <div className="rp-pagehead__main">
        <span className="rp-pagehead__index">{index}</span>
        <div>
          <h1 className="rp-pagehead__title">{title}</h1>
          {subtitle && <p className="rp-pagehead__subtitle">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="rp-pagehead__action">{action}</div>}
    </div>
  );
}
