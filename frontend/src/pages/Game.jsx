import HeroAside from '../components/home/HeroAside'

/**
 * Wikipedia navigation game (daily challenge + free play). Hero layout matches Home;
 * section content will replace these placeholders in later steps.
 */
export default function Game() {
  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-6">
          <HeroAside>
            <div className="flex min-h-0 flex-1 flex-col gap-3 bg-slate-50/70">
              <div className="min-h-[8rem] shrink-0 border border-slate-200 bg-white" aria-hidden />
              <div className="min-h-[10rem] flex-1 border border-slate-200 bg-white md:min-h-0" aria-hidden />
            </div>
          </HeroAside>
          <div className="flex min-h-0 w-full shrink-0 flex-col gap-3 md:w-[70%]">
            <div className="flex min-h-[16rem] flex-1 flex-col overflow-hidden border border-slate-200 bg-slate-50 md:min-h-0" aria-hidden />
            <div className="h-20 shrink-0 border border-slate-200 bg-white" aria-hidden />
          </div>
        </div>
      </section>
    </div>
  )
}
