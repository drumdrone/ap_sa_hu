import { internalAction, mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Send Sales Kit via email
export const sendSalesKitEmail = mutation({
  args: {
    email: v.string(),
    subject: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Schedule the email sending action
    await ctx.scheduler.runAfter(0, internal.emails.deliverEmail, {
      email: args.email,
      subject: args.subject,
      content: args.content,
    });

    console.log("Sales Kit email scheduled for:", args.email);
    return { success: true };
  },
});

// Internal action to deliver email.
// Primary delivery is via Resend (https://resend.com) when RESEND_API_KEY is
// set on the Convex deployment. Falls back to the legacy notification
// endpoint (EMAIL_NOTIFICATION_ENDPOINT) when Resend is not configured.
// Failures THROW so they are visible in the Convex dashboard logs instead of
// being silently swallowed.
export const deliverEmail = internalAction({
  args: {
    email: v.string(),
    subject: v.string(),
    content: v.string(),
    html: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
      // EMAIL_FROM must be a sender on a domain verified in Resend,
      // e.g. "Apotheke Sales Hub <novinky@apotheke.cz>".
      // "onboarding@resend.dev" works only for test sends to your own
      // Resend account email.
      const from = process.env.EMAIL_FROM || "Apotheke Sales Hub <onboarding@resend.dev>";
      // Optional: where replies should go (the sender address usually has
      // no mailbox), e.g. EMAIL_REPLY_TO=honza@firma.cz
      const replyTo = process.env.EMAIL_REPLY_TO;

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: args.email,
          subject: args.subject,
          text: args.content,
          ...(args.html ? { html: args.html } : {}),
          ...(replyTo ? { reply_to: replyTo } : {}),
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
          `Resend delivery to ${args.email} failed (${response.status}): ${detail}`
        );
      }

      console.log("Email sent via Resend to:", args.email);
      return;
    }

    // Legacy fallback: platform notification endpoint
    const endpoint = process.env.EMAIL_NOTIFICATION_ENDPOINT;
    if (!endpoint) {
      throw new Error(
        "Email delivery is not configured: set RESEND_API_KEY (and EMAIL_FROM) " +
        "or EMAIL_NOTIFICATION_ENDPOINT on this Convex deployment."
      );
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        toEmail: args.email,
        subject: args.subject,
        message: args.content,
        chatId: process.env.CHAT_ID!,
        appName: process.env.APP_NAME!,
        secretKey: process.env.SECRET_KEY!,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Legacy email endpoint delivery to ${args.email} failed: ` +
        `${response.status} ${response.statusText}`
      );
    }

    console.log("Email sent via legacy endpoint to:", args.email);
  },
});
