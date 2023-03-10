import type { DataFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useTransition } from "@remix-run/react";
import { z } from "zod";
import { db } from "~/db.server";
import { Prisma } from "@prisma/client"
import { getResetToken } from "~/bcrypt.server";
import type { AuthRouteHandle } from "~/utils";
import { addHours } from "date-fns";
import { zfd } from "zod-form-data";

let reset = zfd.formData({
  email: zfd.text(
    z.string({ required_error: "Email is required" })
      .email("Your email address is invalid"))
});



export async function action({ request }: DataFunctionArgs) {
  let formData = await request.formData();
  let result = reset.safeParse(formData);

  if (!result.success) {
    return json(
      { values: {}, errors: result.error.formErrors.fieldErrors, message: null },
      { status: 422 }
    );
  }

  try {
    await db.user.update({
      where: { email: result.data.email },
      data: {
        resetToken: {
          upsert: {
            create: {
              expiry: addHours(Date.now(), 1),
              token: await getResetToken(),
            },
            update: {
              expiry: addHours(Date.now(), 1),
              token: await getResetToken(),
            }
          }
        }
      }
    })
  }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // "No 'User' record (needed to update inlined relation on 'ResetToken') was found for a nested upsert on relation 'ResetTokenToUser'."
      if (error.code === "P2025") {
        return json({
          errors: null,
          message: "Check your email for password reset instructions!"
        })
      }

      throw error
    }
  }

  return json({
    errors: null,
    message: "Check your email for password reset instructions!",
  });
};

export let handle: AuthRouteHandle = {
  title: "Forgot Password",
};

export default function RequestPasswordResetPage() {
  let actionData = useActionData<typeof action>();
  let transition = useTransition();
  let pendingForm = transition.submission;

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
          className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10"
        >
          <fieldset
            className="space-y-6"
            disabled={!!pendingForm}
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
                  name="email"
                  type="email"
                  aria-invalid={Boolean(actionData?.errors?.email)}
                  aria-describedby={
                    actionData?.errors?.email ? "email-error" : undefined
                  }
                />
              </div>
              {actionData?.errors?.email && (
                <div id="email-error" className="mt-2 text-sm text-red-600">
                  {actionData.errors?.email}
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
