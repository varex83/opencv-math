import * as React from "react"
import { cn } from "../../lib/utils"

interface FileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  onFileSelect: (file: File) => void
}

const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  ({ className, label, onFileSelect, ...props }, ref) => {
    const [fileName, setFileName] = React.useState<string>("")

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        setFileName(file.name)
        onFileSelect(file)
      }
    }

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={ref}
            onChange={handleFileChange}
            className={cn(
              "hidden",
              className
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = props.accept || ''
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (file) {
                  setFileName(file.name)
                  onFileSelect(file)
                }
              }
              input.click()
            }}
            className="inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Choose File
          </button>
          <span className="text-sm text-gray-500 truncate">
            {fileName || "No file chosen"}
          </span>
        </div>
      </div>
    )
  }
)
FileInput.displayName = "FileInput"

export { FileInput } 