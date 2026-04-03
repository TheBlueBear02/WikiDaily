export default function FactSubmitModal({
  open,
  onClose,
  displayTitle,
  selectedText,
  onSubmit,
  isPending,
  error,
  submitSucceeded = false,
}) {
  if (!open) return null

  const len = String(selectedText ?? '').length
  const canSubmit = len >= 10 && len <= 500 && !isPending

  if (submitSucceeded) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fact-submit-success-title"
      >
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-emerald-200 bg-white p-5 shadow-lg">
          <h2
            id="fact-submit-success-title"
            className="font-serif text-lg font-semibold text-primary"
          >
            Fact submitted
          </h2>
          {displayTitle ? (
            <p className="mt-2 text-sm text-slate-600">
              From:{' '}
              <span className="font-medium text-slate-800">{displayTitle}</span>
            </p>
          ) : null}
          <p
            className="mt-4 text-sm text-emerald-900"
            role="status"
          >
            Your fact was saved. It will show up in Craziest Facts on the home
            page for others to discover.
          </p>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-none bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fact-submit-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-slate-200 bg-white p-5 shadow-lg">
        <h2
          id="fact-submit-title"
          className="font-serif text-lg font-semibold text-primary"
        >
          Submit a Crazy Fact
        </h2>
        {displayTitle ? (
          <p className="mt-2 text-sm text-slate-600">
            From: <span className="font-medium text-slate-800">{displayTitle}</span>
          </p>
        ) : null}
        <p className="mt-3 text-xs text-amber-900/90">
          Facts cannot be edited after submission.
        </p>
        <div className="mt-3">
          <textarea
            readOnly
            value={selectedText}
            rows={8}
            className="block w-full resize-none border border-slate-300 bg-slate-50 p-3 font-serif text-sm text-slate-900"
          />
          <div className="mt-1 text-right text-xs text-slate-500">
            {len} / 500
          </div>
        </div>
        {error ? (
          <div className="mt-2 text-sm text-rose-700">{error}</div>
        ) : null}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-none border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="rounded-none bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Submitting…' : 'Submit Fact'}
          </button>
        </div>
      </div>
    </div>
  )
}
