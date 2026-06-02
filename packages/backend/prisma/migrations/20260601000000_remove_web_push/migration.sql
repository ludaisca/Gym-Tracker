-- Remove VAPID Web Push table (replaced by FCM native push)
DROP TABLE IF EXISTS "PushSubscription";
