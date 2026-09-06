import { Conversation, DirectMessage, MessageAttachment, MessageReport, UserBlock, UserRole, ConversationCategory, ConversationParticipant } from '../types';
import { apiClient, ApiResponse } from './apiClient';
import { db } from '../db/dbClient';
import { notificationService } from './notificationService';

export const messagingService = {
  async getUserConversations(userId: string): Promise<ApiResponse<Conversation[]>> {
    return apiClient.execute(() => {
      return db.getConversationsForUser(userId);
    });
  },

  async getConversation(conversationId: string): Promise<ApiResponse<Conversation | null>> {
    return apiClient.execute(() => {
      return db.getConversationById(conversationId);
    });
  },

  async getMessages(conversationId: string, userId: string): Promise<ApiResponse<DirectMessage[]>> {
    return apiClient.execute(() => {
      // Mark as read when messages are fetched
      db.markMessagesAsRead(conversationId, userId);
      return db.getMessagesForConversation(conversationId);
    });
  },

  async startConversation(data: {
    category: ConversationCategory;
    title: string;
    participants: ConversationParticipant[];
    contextId?: string;
    contextType?: 'opportunity' | 'application' | 'business_listing' | 'general';
    initialMessage?: string;
    senderUserId: string;
  }): Promise<ApiResponse<Conversation>> {
    return apiClient.execute(() => {
      // Check if conversation with same participants and context exists
      const existing = db.getConversations().find((c) => {
        if (c.contextId && data.contextId && c.contextId === data.contextId) {
          const participantIds = c.participants.map((p) => p.userId);
          const newParticipantIds = data.participants.map((p) => p.userId);
          return newParticipantIds.every((id) => participantIds.includes(id));
        }
        return false;
      });

      if (existing) {
        if (data.initialMessage) {
          const sender = data.participants.find((p) => p.userId === data.senderUserId);
          const recipient = data.participants.find((p) => p.userId !== data.senderUserId);
          if (sender && recipient) {
            db.sendMessage({
              conversationId: existing.id,
              senderId: sender.userId,
              senderName: sender.name,
              senderRole: sender.role,
              recipientId: recipient.userId,
              body: data.initialMessage
            });
          }
        }
        return existing;
      }

      const conv = db.createConversation({
        category: data.category,
        title: data.title,
        participants: data.participants,
        contextId: data.contextId,
        contextType: data.contextType,
        lastMessage: data.initialMessage || 'Conversation started',
        lastMessageAt: new Date().toISOString(),
        lastSenderId: data.senderUserId
      });

      if (data.initialMessage) {
        const sender = data.participants.find((p) => p.userId === data.senderUserId);
        const recipient = data.participants.find((p) => p.userId !== data.senderUserId);
        if (sender && recipient) {
          db.sendMessage({
            conversationId: conv.id,
            senderId: sender.userId,
            senderName: sender.name,
            senderRole: sender.role,
            recipientId: recipient.userId,
            body: data.initialMessage
          });

          // Dispatch notification to recipient
          notificationService.notifyNewMessage({
            recipientUserId: recipient.userId,
            senderName: sender.name,
            conversationTitle: conv.title,
            conversationId: conv.id
          });
        }
      }

      return conv;
    });
  },

  async sendMessage(data: {
    conversationId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    senderRole?: UserRole;
    recipientId: string;
    body: string;
    attachments?: MessageAttachment[];
  }): Promise<ApiResponse<DirectMessage>> {
    return apiClient.execute(() => {
      // Check blocking
      if (db.isUserBlocked(data.senderId, data.recipientId)) {
        throw new Error('Messaging is blocked between these users.');
      }

      const msg = db.sendMessage(data);

      const conv = db.getConversationById(data.conversationId);
      // Dispatch real-time notification
      notificationService.notifyNewMessage({
        recipientUserId: data.recipientId,
        senderName: data.senderName,
        conversationTitle: conv?.title || 'Platform Message',
        conversationId: data.conversationId
      });

      return msg;
    });
  },

  async markAsRead(conversationId: string, userId: string): Promise<ApiResponse<void>> {
    return apiClient.execute(() => {
      db.markMessagesAsRead(conversationId, userId);
    });
  },

  async blockUser(blockingUserId: string, blockedUserId: string, reason?: string): Promise<ApiResponse<UserBlock>> {
    return apiClient.execute(() => {
      return db.blockUser(blockingUserId, blockedUserId, reason);
    });
  },

  async unblockUser(blockingUserId: string, blockedUserId: string): Promise<ApiResponse<void>> {
    return apiClient.execute(() => {
      db.unblockUser(blockingUserId, blockedUserId);
    });
  },

  async getBlockedUsers(userId: string): Promise<ApiResponse<UserBlock[]>> {
    return apiClient.execute(() => {
      return db.getBlockedUsers(userId);
    });
  },

  async reportConversation(data: {
    conversationId: string;
    messageId?: string;
    reporterUserId: string;
    reportedUserId: string;
    reason: MessageReport['reason'];
    details: string;
  }): Promise<ApiResponse<MessageReport>> {
    return apiClient.execute(() => {
      return db.createMessageReport(data);
    });
  }
};
