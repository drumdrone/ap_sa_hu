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

// Internal action to deliver email
export const deliverEmail = internalAction({
  args: {
    email: v.string(),
    subject: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    "use node";
    
    try {
      const response = await fetch(process.env.EMAIL_NOTIFICATION_ENDPOINT!, {
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

      if (response.ok) {
        console.log("Sales Kit email sent successfully to:", args.email);
      } else {
        console.error("Failed to send email:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Error sending email:", error);
    }
  },
});
