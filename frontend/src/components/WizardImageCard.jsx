const WIZARD_IMAGE_SRC = '/images/wizard%201.jpg'

export default function WizardImageCard() {
  return (
    <div className="flex w-full items-stretch justify-between gap-4 rounded-none border border-slate-200 bg-white px-6 py-4 sm:w-[70%]">
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p className="text-base font-medium italic leading-relaxed text-slate-700">
          The best advice I ever got was that knowledge is power and to keep reading.
        </p>
        <p className="mt-3 text-sm font-semibold text-slate-900">David Bailey</p>
      </div>
      <div className="flex flex-shrink-0 items-center justify-center">
        <img
          src={WIZARD_IMAGE_SRC}
          alt="Wizard helper"
          className="h-32 w-auto max-w-full object-contain sm:h-56"
          loading="lazy"
        />
      </div>
    </div>
  )
}

