import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

export function getFirebaseMessaging() {
  if (process.env.FIREBASE_PUSH_ENABLED !== "true") {
    return null;
  }

  const appName = "etuys-push";

  const app =
    getApps().find((item) => item.name === appName) ??
    initializeApp(
      {
        credential: applicationDefault(),
      },
      appName,
    );

  return getMessaging(app);
}
