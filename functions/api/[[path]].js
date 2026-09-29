import { handleApiRequest } from "../_shared/api.js";

export async function onRequest(context) {
  return handleApiRequest(context.request, context.env, context);
}
