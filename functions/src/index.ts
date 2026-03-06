import * as admin from 'firebase-admin';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Expo SDK
const expo = new Expo();

/**
 * Cloud Function that triggers when a new friend request is created
 * Sends a push notification to the recipient
 */
export const onFriendRequestCreated = onDocumentCreated(
  {
    document: 'users/{userId}/friendRequests/{requestId}',
    region: 'europe-central2', // Warsaw, Poland
  },
  async (event) => {
    try {
      const snapshot = event.data;
      if (!snapshot) {
        console.log('No data in snapshot');
        return;
      }

      const friendRequest = snapshot.data();
      const recipientUserId = event.params.userId;
      const fromUserId = friendRequest.fromUserId;
      const fromNickname = friendRequest.fromNickname || 'Ktoś';

      console.log(`New friend request from ${fromUserId} to ${recipientUserId}`);

      // Get the recipient's user profile to retrieve push token
      const recipientDoc = await admin.firestore()
        .collection('users')
        .doc(recipientUserId)
        .get();

      if (!recipientDoc.exists) {
        console.log(`Recipient user ${recipientUserId} not found`);
        return;
      }

      const recipientData = recipientDoc.data();
      const pushToken = recipientData?.pushToken;
      const notificationsEnabled = recipientData?.notificationsEnabled;

      // Check if notifications are enabled and push token exists
      if (!notificationsEnabled) {
        console.log(`Notifications disabled for user ${recipientUserId}`);
        return;
      }

      if (!pushToken) {
        console.log(`No push token found for user ${recipientUserId}`);
        return;
      }

      // Validate push token
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Invalid Expo push token: ${pushToken}`);
        return;
      }

      // Create the push notification message
      const message: ExpoPushMessage = {
        to: pushToken,
        sound: 'default',
        title: '🤝 Nowe zaproszenie do przyjaźni',
        body: `${fromNickname} wysłał Ci zaproszenie do grona znajomych!`,
        data: {
          type: 'friend_request',
          fromUserId: fromUserId,
          requestId: event.params.requestId,
        },
      };

      // Send the push notification
      const chunks = expo.chunkPushNotifications([message]);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
          console.log('Push notification sent:', ticketChunk);
        } catch (error) {
          console.error('Error sending push notification chunk:', error);
        }
      }

      // Log any errors from the tickets
      for (const ticket of tickets) {
        if (ticket.status === 'error') {
          console.error(`Error in ticket: ${ticket.message}`);
          if (ticket.details?.error) {
            console.error(`Details: ${ticket.details.error}`);
          }
        }
      }

      console.log(`✅ Friend request notification sent to ${recipientUserId}`);
    } catch (error) {
      console.error('Error in onFriendRequestCreated:', error);
    }
  }
);

/**
 * Optional: Cloud Function to send notification when friend request is accepted
 */
export const onFriendRequestAccepted = onDocumentUpdated(
  {
    document: 'users/{userId}/friendRequests/{requestId}',
    region: 'europe-central2', // Warsaw, Poland
  },
  async (event) => {
    try {
      const beforeData = event.data?.before.data();
      const afterData = event.data?.after.data();

      if (!beforeData || !afterData) {
        console.log('No data in snapshot');
        return;
      }

      // Check if status changed from 'pending' to 'accepted'
      if (beforeData.status !== 'accepted' && afterData.status === 'accepted') {
        const fromUserId = afterData.fromUserId;
        const toUserId = event.params.userId;

        console.log(`Friend request accepted by ${toUserId}, notifying ${fromUserId}`);

        // Get the sender's (fromUser) profile to get their push token
        const fromUserDoc = await admin.firestore()
          .collection('users')
          .doc(fromUserId)
          .get();

        if (!fromUserDoc.exists) {
          console.log(`From user ${fromUserId} not found`);
          return;
        }

        const fromUserData = fromUserDoc.data();
        const pushToken = fromUserData?.pushToken;
        const notificationsEnabled = fromUserData?.notificationsEnabled;

        if (!notificationsEnabled || !pushToken) {
          console.log(`Notifications disabled or no push token for ${fromUserId}`);
          return;
        }

        if (!Expo.isExpoPushToken(pushToken)) {
          console.error(`Invalid Expo push token: ${pushToken}`);
          return;
        }

        // Get the accepter's nickname
        const toUserDoc = await admin.firestore()
          .collection('users')
          .doc(toUserId)
          .get();

        const toUserNickname = toUserDoc.exists 
          ? toUserDoc.data()?.nickname || 'Ktoś' 
          : 'Ktoś';

        // Create notification
        const message: ExpoPushMessage = {
          to: pushToken,
          sound: 'default',
          title: '✅ Zaproszenie zaakceptowane!',
          body: `${toUserNickname} zaakceptował Twoje zaproszenie do przyjaźni!`,
          data: {
            type: 'friend_request_accepted',
            fromUserId: toUserId,
          },
        };

        // Send notification
        const chunks = expo.chunkPushNotifications([message]);
        for (const chunk of chunks) {
          try {
            await expo.sendPushNotificationsAsync(chunk);
            console.log('Acceptance notification sent');
          } catch (error) {
            console.error('Error sending acceptance notification:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error in onFriendRequestAccepted:', error);
    }
  }
);

