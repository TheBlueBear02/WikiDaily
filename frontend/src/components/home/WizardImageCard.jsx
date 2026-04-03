import { CARD_SURFACE_STATIC } from '../../lib/cardSurface'

const WIZARD_IMAGE_SRC = '/images/wizard%201.jpg'

export default function WizardImageCard() {
  return (
    <div
      className={[
        'flex w-full items-stretch justify-between gap-4 px-6 py-4 sm:w-[70%]',
        CARD_SURFACE_STATIC,
      ].join(' ')}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-start">
        <div className="mb-2">
          <span className="inline-flex w-fit items-center bg-primary px-4 py-2 text-sm font-semibold tracking-wide text-white">
            Quote of the day
          </span>
        </div>
        <div className="flex flex-1 flex-col justify-center -mt-2">
          <p className="text-base font-medium italic leading-relaxed text-slate-700">
            The best advice I ever got was that knowledge is power and to keep reading.
          </p>
          <p className="mt-3 text-sm font-semibold text-slate-900">David Bailey</p>
        </div>
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

