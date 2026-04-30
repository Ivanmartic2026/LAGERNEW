import { prisma } from '../lib/db.js';

/**
 * setupPushNotifications
 * Save or remove a push subscription for the current user.
 *
 * Body: { subscription: { endpoint, keys: { p256dh, auth } }, action: 'subscribe' | 'unsubscribe' }
 */
export async function setupPushNotifications(req, res) {
  try {
    const user = req.user;
    if (!user?.email) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { subscription, action = 'subscribe' } = req.body;

    if (action === 'unsubscribe') {
      if (subscription?.endpoint) {
        await prisma.pushSubscription.deleteMany({
          where: { endpoint: subscription.endpoint },
        });
      } else {
        await prisma.pushSubscription.deleteMany({
          where: { user_email: user.email },
        });
      }
      return res.json({ success: true, action: 'unsubscribe' });
    }

    if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription data: endpoint, p256dh and auth are required',
      });
    }

    const userAgent = req.headers['user-agent'] || '';

    // Upsert subscription by endpoint (unique)
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        user_email: user.email,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent,
        is_active: true,
      },
      create: {
        user_email: user.email,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent,
        is_active: true,
      },
    });

    return res.json({ success: true, action: 'subscribe' });
  } catch (error) {
    console.error('[setupPushNotifications] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
