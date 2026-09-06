import { AppNotification, NotificationCategory, NotificationChannel } from '../types';
import { apiClient, ApiResponse } from './apiClient';
import { db } from '../db/dbClient';

// Pluggable Channel Handlers
export interface NotificationChannelHandler {
  channel: NotificationChannel;
  send(notification: AppNotification): Promise<boolean>;
}

// Simulated Email Channel Handler (Ready for SendGrid / Resend)
export const emailChannelHandler: NotificationChannelHandler = {
  channel: 'email',
  async send(notification: AppNotification): Promise<boolean> {
    const user = db.getUserById(notification.recipientUserId);
    if (!user || !user.email) return false;
    
    // Log dispatch for audit and dev tools
    console.log(`[EMAIL DISPATCHER] To: ${user.email} | Subject: ${notification.title} | Body: ${notification.message}`);
    return true;
  }
};

// Simulated Push & SMS Channel Handler (Ready for WebPush / Twilio)
export const pushSmsChannelHandler: NotificationChannelHandler = {
  channel: 'push_sms',
  async send(notification: AppNotification): Promise<boolean> {
    const user = db.getUserById(notification.recipientUserId);
    if (!user) return false;

    console.log(`[PUSH/SMS DISPATCHER] Target: ${user.fullName} (${user.phoneNumber || 'Push Token'}) | ${notification.title}: ${notification.message}`);
    return true;
  }
};

export const notificationService = {
  // Configured channel handlers
  channelHandlers: [emailChannelHandler, pushSmsChannelHandler],

  async getUserNotifications(userId: string): Promise<ApiResponse<AppNotification[]>> {
    return apiClient.execute(() => {
      return db.getNotificationsForUser(userId);
    });
  },

  async markAsRead(notificationId: string): Promise<ApiResponse<void>> {
    return apiClient.execute(() => {
      db.markNotificationAsRead(notificationId);
    });
  },

  async markAllAsRead(userId: string): Promise<ApiResponse<void>> {
    return apiClient.execute(() => {
      db.markAllNotificationsAsRead(userId);
    });
  },

  /**
   * Internal pipeline for creating and dispatching notifications across channels
   */
  async createAndDispatchNotification(payload: {
    recipientUserId: string;
    category: NotificationCategory;
    title: string;
    message: string;
    actionUrl?: string;
    contextId?: string;
    channels?: { email?: boolean; pushSms?: boolean };
  }): Promise<AppNotification> {
    const emailSent = payload.channels?.email ?? true;
    const pushSmsSent = payload.channels?.pushSms ?? (payload.category === 'interview_invitation' || payload.category === 'new_message');

    const notification = db.createNotification({
      recipientUserId: payload.recipientUserId,
      category: payload.category,
      title: payload.title,
      message: payload.message,
      actionUrl: payload.actionUrl,
      contextId: payload.contextId,
      deliveryChannels: {
        inApp: true,
        emailSent,
        pushSmsSent
      }
    });

    // Execute background dispatches to external channels
    if (emailSent) {
      emailChannelHandler.send(notification).catch(err => console.error('Email dispatch error:', err));
    }
    if (pushSmsSent) {
      pushSmsChannelHandler.send(notification).catch(err => console.error('Push/SMS dispatch error:', err));
    }

    return notification;
  },

  // Specific Notification Triggers
  async notifyNewMessage(params: {
    recipientUserId: string;
    senderName: string;
    conversationTitle: string;
    conversationId: string;
  }) {
    return this.createAndDispatchNotification({
      recipientUserId: params.recipientUserId,
      category: 'new_message',
      title: `New Message from ${params.senderName}`,
      message: `${params.senderName} sent you a message regarding "${params.conversationTitle}".`,
      actionUrl: '/messages',
      contextId: params.conversationId,
      channels: { email: true, pushSms: true }
    });
  },

  async notifyApplicationUpdate(params: {
    recipientUserId: string;
    opportunityTitle: string;
    newStage: string;
    organizationName: string;
    applicationId: string;
  }) {
    return this.createAndDispatchNotification({
      recipientUserId: params.recipientUserId,
      category: 'application_update',
      title: `Application Status Updated: ${params.newStage.replace('_', ' ').toUpperCase()}`,
      message: `Your application for "${params.opportunityTitle}" at ${params.organizationName} moved to stage "${params.newStage.replace('_', ' ')}".`,
      actionUrl: '/candidate',
      contextId: params.applicationId,
      channels: { email: true, pushSms: true }
    });
  },

  async notifyInterviewInvitation(params: {
    recipientUserId: string;
    opportunityTitle: string;
    organizationName: string;
    interviewDetails: string;
    applicationId: string;
  }) {
    return this.createAndDispatchNotification({
      recipientUserId: params.recipientUserId,
      category: 'interview_invitation',
      title: `Interview Invitation from ${params.organizationName}`,
      message: `You are invited to an interview for "${params.opportunityTitle}". Schedule & Details: ${params.interviewDetails}`,
      actionUrl: '/candidate',
      contextId: params.applicationId,
      channels: { email: true, pushSms: true }
    });
  },

  async notifyJobRecommendation(params: {
    recipientUserId: string;
    opportunityTitle: string;
    county: string;
    opportunityId: string;
  }) {
    return this.createAndDispatchNotification({
      recipientUserId: params.recipientUserId,
      category: 'job_recommendation',
      title: `AI Match: ${params.opportunityTitle}`,
      message: `We found a new job opportunity matching your skills and location (${params.county}): ${params.opportunityTitle}.`,
      actionUrl: '/opportunities',
      contextId: params.opportunityId,
      channels: { email: true, pushSms: false }
    });
  },

  async notifyBusinessInquiry(params: {
    recipientUserId: string;
    buyerName: string;
    businessTitle: string;
    businessId: string;
  }) {
    return this.createAndDispatchNotification({
      recipientUserId: params.recipientUserId,
      category: 'business_inquiry',
      title: `New M&A Data Room Inquiry`,
      message: `${params.buyerName} submitted an inquiry for listing "${params.businessTitle}".`,
      actionUrl: '/businesses',
      contextId: params.businessId,
      channels: { email: true, pushSms: true }
    });
  },

  async notifySubscriptionEvent(params: {
    recipientUserId: string;
    planName: string;
    status: string;
  }) {
    return this.createAndDispatchNotification({
      recipientUserId: params.recipientUserId,
      category: 'subscription_event',
      title: `Subscription Plan ${params.status.toUpperCase()}`,
      message: `Your organization subscription for "${params.planName}" is now ${params.status}.`,
      actionUrl: '/billing',
      channels: { email: true, pushSms: false }
    });
  },

  async notifyVerificationEvent(params: {
    recipientUserId: string;
    organizationName: string;
    status: string;
  }) {
    return this.createAndDispatchNotification({
      recipientUserId: params.recipientUserId,
      category: 'verification_event',
      title: `Institutional Verification ${params.status.toUpperCase()}`,
      message: `The governance verification request for "${params.organizationName}" has been ${params.status}.`,
      actionUrl: '/verification',
      channels: { email: true, pushSms: true }
    });
  }
};
