import { forwardRef, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'hidden' | 'onChange' | 'accept'> & {
  accept: string
  /** Called with the chosen files (never empty). The picker is reset, so choosing the same file again works. */
  onFiles: (files: File[]) => void
  /** Picks a whole folder instead of files. */
  directory?: boolean
}

/** A hidden file picker. Open it from a button with `ref.current?.click()`, or wrap it in a `<label>`. */
export const FileInput = forwardRef<HTMLInputElement, Props>(function FileInput(
  { onFiles, directory = false, ...rest },
  ref,
) {
  const folderAttrs = directory ? { webkitdirectory: '', directory: '' } : undefined
  return (
    <input
      ref={ref}
      type="file"
      hidden
      onChange={(e) => {
        const files = e.target.files ? Array.from(e.target.files) : []
        e.target.value = ''
        if (files.length > 0) onFiles(files)
      }}
      {...folderAttrs}
      {...rest}
    />
  )
})
