export default function About() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-primary md:text-3xl">About WikiDaily</h1>
        <p className="text-sm text-slate-600">
          Learn something new every day from the world&apos;s largest free encyclopedia.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 md:p-8">
        <div className="space-y-4 text-slate-600 leading-relaxed">
          <p>
            WikiDaily is a reading companion for Wikipedia. Each day features one shared article so you
            can read along with the community, keep a streak, explore history, and play games built around
            real articles.
          </p>
          <p>
            Article summaries and page content come from Wikipedia and Wikimedia projects. WikiDaily is an
            independent project and is not affiliated with, endorsed by, or related to the Wikimedia
            Foundation or Wikipedia.
          </p>
          <p className="text-sm text-slate-500">
            Text from Wikipedia is available under the{' '}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
            >
              Creative Commons Attribution-ShareAlike 4.0 License
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  )
}
