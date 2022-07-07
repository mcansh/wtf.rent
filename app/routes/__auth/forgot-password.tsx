import type { ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useTransition } from "@remix-run/react";
import { z } from "zod";
import { parse, resolve } from "@conform-to/zod";
import { db } from "~/db.server";
import { getResetToken } from "~/bcrypt.server";
import type { AuthRouteHandle } from "~/use-matches";
import { addHours } from "date-fns";
import { conform, useFieldset, useForm } from "@conform-to/react";

let reset = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("You email address is invalid"),
});

let schema = resolve(reset);

type ActionRouteData =
  | {
      values: { email?: string | undefined } | null;
      errors: { email?: string | undefined } | null;
    }
  | { message: string };

export let action: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  let result = parse(formData, reset);

  if (result.state !== "accepted") {
    return json<ActionRouteData>(
      { values: result.value, errors: result.error },
      { status: 422 }
    );
  }

  await db.user.update({
    where: {
      email: result.value.email,
    },
    data: {
      resetToken: {
        update: {
          expiry: addHours(Date.now(), 1),
          token: await getResetToken(),
        },
      },
    },
  });

  return json<ActionRouteData>({
    message: "Check your email for password reset instructions!",
  });
};

export let handle: AuthRouteHandle = {
  title: "Forgot Password",
};

export default function RequestPasswordResetPage() {
  let actionData = useActionData<ActionRouteData>();

  let transition = useTransition();
  let pendingForm = transition.submission;

  let formProps = useForm();
  let [fieldsetProps, result] = useFieldset(schema, {
    error:
      actionData && "errors" in actionData ? { ...actionData?.errors } : {},
    initialValue:
      actionData && "values" in actionData ? { ...actionData?.values } : {},
  });

  return (
    <>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {actionData && "message" in actionData ? (
          <h2 className="pb-8 text-center text-green-600">
            {actionData.message}
          </h2>
        ) : null}

        <Form
          method="post"
          {...formProps}
          className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10"
        >
          <fieldset
            className="space-y-6"
            disabled={!!pendingForm}
            {...fieldsetProps}
          >
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  autoComplete="email"
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  aria-errormessage={
                    result.email.error ? "email-error" : undefined
                  }
                  {...conform.input(result.email, { type: "email" })}
                />
              </div>
              {result.email.error && (
                <div id="email-error" className="mt-2 text-sm text-red-600">
                  {result.email.error}
                </div>
              )}
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Request Reset
              </button>
            </div>
          </fieldset>
        </Form>
      </div>
    </>
  );
}
