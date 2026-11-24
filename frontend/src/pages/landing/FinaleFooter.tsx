import { PRODUCT, TEAM } from './content'

/**
 * The end of the page: a distant horizon low in the frame (painted by FinaleSky on
 * `data-finale-horizon`) with the light bursting over it, the key word above in its glowing tube
 * light, and the colophon under the line. The word is real text; while the canvas draws it, the
 * DOM copy turns transparent (`data-glow="gl"`) and stays selectable and read out.
 */
export function FinaleFooter() {
  return (
    <footer data-finale-end className="blask-finale-footer relative">
      <div className="blask-finale-stage">
        <p className="blask-finale-word-line">
          <span data-finale-word className="blask-finale-word">
            {PRODUCT.name}
          </span>
        </p>
      </div>
      <div data-finale-horizon aria-hidden="true" className="blask-horizon-line" />
      <div className="mx-auto grid w-full max-w-[1360px] gap-6 px-[var(--blask-gutter)] pt-10 pb-28 text-sm text-blask-moon md:grid-cols-12 md:gap-8 md:pt-12">
        <div className="md:col-span-4">
          <p className="text-blask-pearl">{PRODUCT.faculty}</p>
          <p>{PRODUCT.semester}</p>
        </div>
        <div className="md:col-span-5">
          <p className="text-blask-pearl">{TEAM.credit}</p>
          <p className="mt-1">Zespół: {TEAM.members.join(', ')}</p>
          <p>Opiekun: {TEAM.supervisor}</p>
        </div>
        <div className="md:col-span-3 md:text-right">
          <p>Liczby i nicki na tej stronie są przykładowe.</p>
        </div>
      </div>
    </footer>
  )
}
