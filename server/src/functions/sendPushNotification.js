import webPush from 'web-push';
import { prisma } from '../lib/db.js';

// Configure web-push with VAPID keys from environment
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@imvision.se';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

/**
 * sendPushNotification
 * Send a push notification to a specific user or all users.
 *
 * Body: {
 *   userEmail?: string,      // Target specific user (optional)
 *   title: string,
 *   body: string,
 *   data?: object,           // Extra payload data
 *   tag?: string,            // Notification tag for grouping
 * }
 */
export async function sendPushNotification(req, res) {
  try {
    const user = req.user;
    if (!user?.email) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { userEmail, title, body, data = {}, tag = 'notification' } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: 'title and body are required',
      });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return res.status(503).json({
        success: false,
        error: 'Push not configured: VAPID keys missing',
      });
    }

    // Build query: either specific user or all active subscriptions
    const where = { is_active: true };
    if (userEmail) {
      where.user_email = userEmail;
    }

    const subscriptions = await prisma.pushSubscription.findMany({ where });

    if (subscriptions.length === 0) {
      return res.json({
        success: true,
        sent: 0,
        message: userEmail
          ? `No active subscriptions found for ${userEmail}`
          : 'No active subscriptions found',
      });
    }

    const payload = JSON.stringify({
      title,
      body,
      tag,
      icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png',
      badge: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png',
      ...data,
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };
        await webPush.sendNotification(pushSubscription, payload);
        return sub.endpoint;
      })
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected');

    // Deactivate subscriptions that permanently failed (410 Gone = unsubscribed)
    for (const fail of failed) {
      const err = fail.reason;
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        const endpoint = subscriptions[failed.indexOf(fail)]?.endpoint;
        if (endpoint) {
          await prisma.pushSubscription.updateMany({
            where: { endpoint },
            data: { is_active: false },
          });
        }
      }
    }

    return res.json({
      success: true,
      sent,
      failed: failed.length,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error('[sendPushNotification] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
