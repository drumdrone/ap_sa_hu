/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTP from "../ResendOTP.js";
import type * as auth from "../auth.js";
import type * as emails from "../emails.js";
import type * as feedImport from "../feedImport.js";
import type * as gallery from "../gallery.js";
import type * as http from "../http.js";
import type * as news from "../news.js";
import type * as opportunities from "../opportunities.js";
import type * as posm from "../posm.js";
import type * as products from "../products.js";
import type * as promotionLogs from "../promotionLogs.js";
import type * as seed_import from "../seed/import.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  auth: typeof auth;
  emails: typeof emails;
  feedImport: typeof feedImport;
  gallery: typeof gallery;
  http: typeof http;
  news: typeof news;
  opportunities: typeof opportunities;
  posm: typeof posm;
  products: typeof products;
  promotionLogs: typeof promotionLogs;
  "seed/import": typeof seed_import;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
