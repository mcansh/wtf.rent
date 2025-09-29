export function getErrors(
  errors: undefined | Record<string, { errors: string[] }>,
  field: string,
) {
  if (!errors) return null;
  let error = errors[field];
  if (!error || error.errors.length === 0) return null;
  return error.errors;
}

export function hasErrors(
  errors: undefined | Record<string, { errors: string[] }>,
  field: string,
): boolean {
  let fieldErrors = getErrors(errors, field);
  return fieldErrors ? fieldErrors.length > 0 : false;
}

export function RenderErrors({
  errors,
  field,
}: {
  errors: undefined | Record<string, { errors: string[] }>;
  field: string;
}) {
  let fieldErrors = getErrors(errors, field);
  if (!fieldErrors) return null;
  return (
    <ul id={`${field}-error`} className="mt-2 text-sm text-red-600">
      {fieldErrors.map((error) => (
        <li key={error}>{error}</li>
      ))}
    </ul>
  );
}
