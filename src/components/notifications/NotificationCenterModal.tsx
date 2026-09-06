import React, { useEffect, useState } from 'react';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Briefcase,
  Calendar,
  MessageSquare,
  Building,
  CreditCard,
  ShieldCheck,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { AppNotification, NotificationCategory } from '../../types';
import { notificationService } from '../../services/notificationService';
import { authService } from '../../services/authService';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const session = authService.getSession();
  const currentUser = session.user;

  useEffect(() => {
    if (isOpen && currentUser) {
      loadNotifications();
    }
  }, [isOpen, currentUser?.id]);

  const loadNotifications = async () => {
    if (!currentUser) return;
    setLoading(true);
    const res = await notificationService.getUserNotifications(currentUser.id);
    if (res.data) {
      setNotifications(res.data);
    }
    setLoading(false);
  };

  const handleMarkAsRead = async (id: string, actionUrl?: string) => {
    await notificationService.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );

    if (actionUrl && onNavigateTab) {
      onClose();
      if (actionUrl.includes('messages')) onNavigateTab('messages');
      else if (actionUrl.includes('candidate')) onNavigateTab('candidate');
      else if (actionUrl.includes('recruiter')) onNavigateTab('recruiter');
      else if (actionUrl.includes('businesses')) onNavigateTab('businesses');
      else if (actionUrl.includes('billing')) onNavigateTab('billing');
      else if (actionUrl.includes('verification')) onNavigateTab('verification');
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    await notificationService.markAllAsRead(currentUser.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter(
    (n) => selectedCategory === 'all' || n.category === selectedCategory
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'new_message':
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'application_update':
        return <Briefcase className="w-4 h-4 text-[#4F772D]" />;
      case 'interview_invitation':
        return <Calendar className="w-4 h-4 text-purple-600" />;
      case 'job_recommendation':
        return <Sparkles className="w-4 h-4 text-[#BC6C25]" />;
      case 'business_inquiry':
        return <Building className="w-4 h-4 text-amber-600" />;
      case 'subscription_event':
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      case 'verification_event':
        return <ShieldCheck className="w-4 h-4 text-sky-600" />;
      default:
        return <Bell className="w-4 h-4 text-stone-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-[#E8E4D9] animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-[#E8E4D9] flex items-center justify-between bg-[#F9F8F6]">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#ECF3E9] text-[#283618] rounded-xl relative">
              <Bell className="w-5 h-5 text-[#4F772D]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#BC6C25] text-white rounded-full text-[9px] font-black flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </span>
            <div>
              <h2 className="text-base font-bold text-[#283618] font-display">Notifications</h2>
              <p className="text-xs text-stone-500">Live platform alerts & event dispatches</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-[#4F772D] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-600 rounded-xl hover:bg-stone-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="p-3 border-b border-[#E8E4D9] flex gap-1.5 overflow-x-auto text-[11px] font-semibold bg-white shrink-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'new_message', label: 'Messages' },
            { id: 'application_update', label: 'Applications' },
            { id: 'interview_invitation', label: 'Interviews' },
            { id: 'business_inquiry', label: 'M&A Deals' },
            { id: 'subscription_event', label: 'Subscriptions' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-[#283618] text-white font-bold'
                  : 'bg-[#F9F8F6] text-stone-600 hover:bg-stone-100 border border-[#E8E4D9]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* List View */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#E8E4D9] p-2 space-y-1">
          {loading ? (
            <div className="p-8 text-center text-stone-400 text-xs">Loading notifications...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-stone-400 text-xs space-y-2">
              <Bell className="w-8 h-8 mx-auto text-stone-300" />
              <p>No notifications in this category.</p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleMarkAsRead(notif.id, notif.actionUrl)}
                className={`p-3.5 rounded-2xl transition-all cursor-pointer flex items-start gap-3 border ${
                  notif.isRead
                    ? 'bg-white border-transparent hover:bg-[#F9F8F6]'
                    : 'bg-[#FEFAE0]/40 border-[#E8E4D9] font-medium'
                }`}
              >
                <div className="p-2 bg-white rounded-xl border border-[#E8E4D9] shadow-2xs shrink-0 mt-0.5">
                  {getCategoryIcon(notif.category)}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className={`text-xs font-bold ${notif.isRead ? 'text-stone-700' : 'text-[#283618]'}`}>
                      {notif.title}
                    </h3>
                    <span className="text-[10px] text-stone-400 shrink-0">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    {notif.message}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">
                      Channels: In-App {notif.deliveryChannels.emailSent ? '• Email' : ''} {notif.deliveryChannels.pushSmsSent ? '• Push/SMS' : ''}
                    </span>

                    <span className="text-[10px] font-bold text-[#4F772D] flex items-center gap-0.5 hover:underline">
                      View details <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
