/** @format */

import { ZodError } from 'zod';

/**
 * Formats a Zod error response into a simplified object
 * showing required or other validation messages per field.
 * @param error A ZodError instance
 * @returns An object with field names as keys and simplified error messages as values.
 */
export function formatZodErrors(error: ZodError): Record<string, string> {
	const formattedErrors: Record<string, string> = {};

	error.issues.forEach((issue) => {
		const field = issue.path.join('.');

		if (field) {
			formattedErrors[field] = issue.message;
		} else {
			formattedErrors[issue.code] = issue.message;
		}
	});



	return formattedErrors;
}
