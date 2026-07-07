"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { notificationAPI } from '../services/api';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  
  // Pagination & Filtering state for main view
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('all');

  const fetchNotifications = async (currentPage = 1, currentFilter = 'all') => {
    if (!user) return;
    try {
      const { data } = await notificationAPI.get(currentPage, 50, currentFilter);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setTotalPages(data.pages || 1);
      setPage(data.page || 1);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications(page, filter);
      
      const newSocket = io('http://localhost:5000');
      
      newSocket.on('connect', () => {
        newSocket.emit('register_user', user._id);
      });

      newSocket.on('new_notification', (notification) => {
        // Prepend new notification if it matches current filter
        if (filter === 'all' || (filter === 'unread' && !notification.read) || (filter === 'read' && notification.read)) {
          setNotifications((prev) => [notification, ...prev]);
        }
        
        setUnreadCount((prev) => prev + 1);
        
        // Show toast
        if (notification.type === 'SUCCESS') toast.success(notification.title + ': ' + notification.message);
        else if (notification.type === 'ERROR') toast.error(notification.title + ': ' + notification.message);
        else if (notification.type === 'WARNING') toast.error(notification.title + ': ' + notification.message, { icon: '⚠️' });
        else toast(notification.title + ': ' + notification.message, { icon: '🔔' });
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } else {
      if (socket) socket.disconnect();
      setNotifications([]);
      setUnreadCount(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page, filter]); // Refetch if page or filter changes

  const markAsRead = async () => {
    try {
      await notificationAPI.markAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };
  
  const markSingleAsRead = async (id) => {
    try {
      await notificationAPI.markSingleAsRead(id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications((prev) => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await notificationAPI.delete(id);
      setNotifications((prev) => prev.filter(n => n._id !== id));
      fetchNotifications(page, filter); // Re-fetch to update unread count properly
    } catch (err) {
      console.error(err);
    }
  };
  
  const deleteAllNotifications = async () => {
    try {
      await notificationAPI.deleteAll();
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead, 
      markSingleAsRead,
      deleteNotification, 
      deleteAllNotifications,
      fetchNotifications,
      page,
      setPage,
      totalPages,
      filter,
      setFilter
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
