/** Faint, slowly drifting card pattern behind the home and rules pages. */
export function ScrollingBackdrop({ fixed = false }: { fixed?: boolean }) {
    return <div aria-hidden="true" className={`${fixed ? "fixed" : "absolute"} inset-0 z-0 pointer-events-none scrolling-backdrop`} />
}
