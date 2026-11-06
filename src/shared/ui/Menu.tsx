import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes } from 'react'
import { cx } from './cx'

/** The popup list itself; position it with a class on the parent or on the menu. */
export const Menu = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Menu(
  { className, children, ...rest },
  ref,
) {
  return (
    <div ref={ref} className={cx('ds-menu', className)} role="menu" {...rest}>
      {children}
    </div>
  )
})

export function MenuItem({
  danger = false,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return <button type="button" role="menuitem" className={cx(danger && 'danger', className)} {...rest} />
}
