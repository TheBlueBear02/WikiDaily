import WizardImageCard from './WizardImageCard'
import RandomWikiPickerCard from './RandomWikiPickerCard'

export default function RandomWikiSection() {
  return (
    <section className="w-full">
      <div className="flex w-full flex-col gap-4 sm:flex-row">
        <WizardImageCard />
        <RandomWikiPickerCard />
      </div>
    </section>
  )
}

