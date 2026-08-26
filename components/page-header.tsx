import type { ReactNode } from "react"

type PageHeaderProps = {
  title: ReactNode
  children?: ReactNode
}

function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <header
      data-slot="page-header"
      className="flex flex-wrap items-start gap-3"
    >
      <h1
        data-slot="page-title"
        className="font-heading text-2xl font-medium tracking-tight"
      >
        {title}
      </h1>
      {children && (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 pt-1">
          {children}
        </div>
      )}
    </header>
  )
}

export { PageHeader }
