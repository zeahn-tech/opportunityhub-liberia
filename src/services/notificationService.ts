/**
 * notificationService.ts
 *
 * Phase 3, Service 9 (final service) of the dbClient -> Supabase
 * migration (see docs/PRODUCTION_CERTIFICATION_REPORT.md, "Database
 * Status", and docs/PHASE3_SERVICE9_VERIFICATION.md for the live proof).
 *
 * Reads/writes public.notifications directly. Any authenticated user can
 * INSERT a notification for another user (matches dbClient.ts's existing
 * unrestricted behavior -- e.g. an employer's action notifying a
 * candidate); SELECT/UPDATE are recipient-only via RLS, and a trigger
 * restricts UPDATE to is_read/read_at regardless of who's updating (see
 * the migration file for why: notifications carry no confidential data
 * of the creator's, so the real boundary is "only the recipient can ever
 * read or dismiss their own notifications," not who's allowed to create
 * one).
 *
 * emailChannelHandler/pushSmsChannelHandler are unchanged in spirit
 * (still simulated dispatchers logging to the console, ready to be
 * swapped for SendGrid/Resend/Twilio) but now read the recipient's
 * profile via Supabase instead of dbClient.ts.
 */

import { AppNotification, NotificationCategory, NotificationChannel } from '../types';
import { getSupabaseClient } from '../lib/supabaseClient';
import { apiClient, ApiResponse } from './apiClient';
import { ForbiddenError } from '../core/errors/AppError';

interface NotificationRow {
  id: string;
  recipient_user_id: string;
  category: string;
  title: string;
  message: string;
  action_url: string | null;
  context_id: string | null;
  is_read: boolean;
  read_at: string | null;
  delivery_channels: AppNotification['deliveryChannels'];
  created_at: string;
}

function client() {
  const c = getSupabaseClient();
  if (!c) {
    throw new ForbiddenError('Supabase is not configured; notificationService requires a live backend.');
  }
  return c;
}

function rowToNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    recipientUserId: row.recipient_user_id,
    category: row.category as NotificationCategory,
    title: row.title,
    message: row.message,
    actionUrl: row.action_url ?? undefined,
    contextId: row.context_id ?? undefined,
    deliveryChannels: row.delivery_channels || {},
    isRead: row.is_read,
    readAt: row.read_at ?? undefined,
    createdAt: row.created_at
  };
}

// Pluggable Channel Handlers
export interface NotificationChannelHandler {
  channel: NotificationChannel;
  send(notification: AppNotification): Promise<boolean>;
}

// Simulated Email Channel Handler (Ready for SendGrid / Resend)
export const emailChannelHandler: NotificationChannelHandler = {
  channel: 'email',
  async send(notification: AppNotification): Promise<boolean> {
    const { data: user } = await client()
      .from('users')
      .select('email')
      .eq('id', notification.recipientUserId)
      .maybeSingle();
    if (!user?.email) return false;

    console.log(`[EMAIL DISPATCHER] To: ${user.email} | Subject: ${notification.title} | Body: ${notification.message}`);
    return true;
  }
};

// Simulated Push & SMS Channel Handler (Ready for WebPush / Twilio)
export const pushSmsChannelHandler: NotificationChannelHandler = {
  channel: 'push_sms',
  async send(notification: AppNotification): Promise<boolean> {
    const { data: user } = await client()
      .from('users')
      .select('full_name, phone_number')
      .eq('id', notification.recipientUserId)
      .maybeSingle();
    if (!user) return false;

    console.log(`[PUSH/SMS DISPATCHER] Target: ${user.full_name} (${user.phone_number || 'Push Token'}) | ${notification.title}: ${notification.message}`);
    return true;
  }
};

export const notificationService = {
  channelHandlers: [emailChannelHandler, pushSmsChannelHandler],

  async getUserNotifications(userId: string): Promise<ApiResponse<AppNotification[]>> {
    return apiClient.execute(async () => {
      const { data, error } = await client()
        .from('notifications')
        .select('*')
        .eq('recipient_user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data as NotificationRow[]).map(rowToNotification);
    });
  },

  async markAsRead(notificationId: string): Promise<ApiResponse<void>> {
    return apiClient.execute(async () => {
      const { error } = await client()
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);
      if (error) throw new Error(error.message);
    });
  },

  async markAllAsRead(userId: string): Promise<ApiResponse<void>> {
    return apiClient.execute(async () => {
      const { error } = await client()
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('recipient_user_id', userId)
        .eq('is_read', false);
      if (error) throw new Error(error.message);
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

    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const { data, error } = await client()
      .from('notifications')
      .insert({
        id,
        recipient_user_id: payload.recipientUserId,
        category: payload.category,
        title: payload.title,
        message: payload.message,
        action_url: payload.actionUrl ?? null,
        context_id: payload.contextId ?? null,
        delivery_channels: { inApp: true, emailSent, pushSmsSent }
      })
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);

    const notification = rowToNotification(data as NotificationRow);

    // Execute background dispatches to external channels
    if (emailSent) {
      emailChannelHandler.send(notification).catch((err) => console.error('Email dispatch error:', err));
    }
    if (pushSmsSent) {
      pushSmsChannelHandler.send(notification).catch((err) => console.error('Push/SMS dispatch error:', err));
    }

    return notification;
  },

  // Specific Notification Triggers
  async notifyNewMessage(params: { recipientUserId: string; senderName: string; conversationTitle: string; conversationId: string }) {
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

  async notifyJobRecommendation(params: { recipientUserId: string; opportunityTitle: string; county: string; opportunityId: string }) {
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

  async notifyBusinessInquiry(params: { recipientUserId: string; buyerName: string; businessTitle: string; businessId: string }) {
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

  async notifySubscriptionEvent(params: { recipientUserId: string; planName: string; status: string }) {
    return this.createAndDispatchNotification({
      recipientUserId: params.recipientUserId,
      category: 'subscription_event',
      title: `Subscription Plan ${params.status.toUpperCase()}`,
      message: `Your organization subscription for "${params.planName}" is now ${params.status}.`,
      actionUrl: '/billing',
      channels: { email: true, pushSms: false }
    });
  },

  async notifyVerificationEvent(params: { recipientUserId: string; organizationName: string; status: string }) {
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
