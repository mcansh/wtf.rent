import clsx from "clsx";
import { hasErrors, RenderErrors } from "~/utils/errors";

export function Input({
  errors,
  field,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  field: string;
  errors?: undefined | Record<string, { errors: string[] }>;
}) {
  let fieldHasErrors = hasErrors(errors, field);

  return (
    <>
      <div className="mt-1">
        <input
          className={clsx(
            "block w-full appearance-none rounded-md border px-3 py-2 shadow-sm focus:outline-none sm:text-sm",
            fieldHasErrors
              ? "border-red-300 placeholder-red-400 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500",
          )}
          aria-invalid={fieldHasErrors ? "true" : undefined}
          aria-describedby={fieldHasErrors ? `${field}-error` : undefined}
          {...props}
        />
      </div>
      <RenderErrors errors={errors} field={field} />
    </>
  );
}
