
import webpush from 'web-push';
import { storage } from './storage';
import fs from 'fs/promises';
import path from 'path';

let vapidKeys: { publicKey: string; privateKey: string } | null = null;

export async function initializeWebPush() {
  try {
    const configPath = path.join(process.cwd(), 'config.json');
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);

    if (config.push?.vapid_public_key && config.push?.vapid_private_key) {
      vapidKeys = {
        publicKey: config.push.vapid_public_key,
        privateKey: config.push.vapid_private_key
      };

      webpush.setVapidDetails(
        config.push.contact_email || 'mailto:admin@example.com',
        vapidKeys.publicKey,
        vapidKeys.privateKey
      );

      console.log('✓ Web Push notifications initialized');
    }
  } catch (error) {
    console.log('ℹ Web Push not configured');
  }
}

export async function sendPushNotification(userId: string, payload: { title: string; body: string; icon?: string }) {
  if (!vapidKeys) return;

  try {
    const subscriptions = await storage.getPushSubscriptionsByUser(userId);
    
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192.png'
    });

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            },
            notificationPayload
          );
        } catch (error: any) {
          if (error.statusCode === 410) {
            await storage.deletePushSubscription(sub.endpoint);
          }
        }
      })
    );
  } catch (error) {
    console.error('Push notification error:', error);
  }
}

export function getVapidPublicKey(): string | null {
  return vapidKeys?.publicKey || null;
}
