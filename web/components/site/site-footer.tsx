export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          Built by <span className="text-foreground">Aparna Gorthi</span> · Mahindra University
        </p>
        <a
          href="https://github.com/aparna04gorthi-del"
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-foreground"
        >
          GitHub →
        </a>
      </div>
    </footer>
  );
}
