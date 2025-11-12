import React, { createContext, useContext, useState } from 'react';
import { sampleOrders, sampleMessages, sampleConversations, samplePayments, sampleProfile, sampleDashboard } from '../mocks/mockData';

const MockApiContext = createContext(null);

export function MockApiProvider({ children }) {
  const [orders, setOrders] = useState(sampleOrders);
  const [messages, setMessages] = useState(sampleMessages);
  const [conversations, setConversations] = useState(sampleConversations);
  const [payments, setPayments] = useState(samplePayments);
  const [profile, setProfile] = useState(sampleProfile);

  function listOrders() {
    return Promise.resolve(orders);
  }

  function getOrder(id) {
    const o = orders.find((x) => x.id === id);
    return Promise.resolve(o || null);
  }

  function createOrder(payload) {
    const newOrder = {
      id: `ord_${Date.now()}`,
      title: payload.title || 'New Order',
      seller: { id: 'u_seller', name: 'Demo Seller' },
      orderType: payload.orderType || 'small',
      tier: payload.tier || { id: 't1', name: 'Standard', price: 100, deliveryDays: 5 },
      price: payload.price || { subtotal: 100, fees: 5, tax: 0, total: 105, currency: 'USD' },
      status: 'submitted',
      dueDate: payload.deadline || null,
      revisionsAllowed: 2,
      revisionsRemaining: 2,
    };
    // create deliverables according to orderType
    if (payload.orderType === 'big' && Array.isArray(payload.deliverables) && payload.deliverables.length) {
      newOrder.deliverables = payload.deliverables.map((d, idx) => ({ id: `d_${Date.now()}_${idx}`, description: d.description || '', dueDate: d.dueDate || null, amount: d.amount || 0, completed: false, paid: false }));
    } else {
      // small order: single deliverable
      const amount = (payload.price && payload.price.total) || (payload.amount) || 0;
      newOrder.deliverables = [{ id: `d_${Date.now()}`, description: payload.title || 'Single deliverable', dueDate: payload.deliveryDate || payload.deadline || null, amount, completed: false, paid: false }];
    }

    setOrders((s) => [newOrder, ...s]);
    return Promise.resolve(newOrder);
  }

  function updateDeliverable(orderId, deliverableId, patch) {
    let updatedOrder = null;
    setOrders((prev) => {
      const arr = prev.map((o) => {
        if (o.id !== orderId) return o;
        const ds = (o.deliverables || []).map((d) => (d.id === deliverableId ? { ...d, ...patch } : d));
        updatedOrder = { ...o, deliverables: ds };
        return updatedOrder;
      });
      return arr;
    });
    return Promise.resolve(updatedOrder);
  }

  function completeDeliverable(orderId, deliverableId) {
    return updateDeliverable(orderId, deliverableId, { completed: true });
  }

  function payDeliverable(orderId, deliverableId) {
    return updateDeliverable(orderId, deliverableId, { paid: true });
  }

  function approveDeliverable(orderId, deliverableId) {
    return updateDeliverable(orderId, deliverableId, { approved: true });
  }

  function leaveReview(orderId, deliverableId, review) {
    // review: { rating, comment, author? }
    let updatedOrder = null;
    setOrders((prev) => {
      const arr = prev.map((o) => {
        if (o.id !== orderId) return o;
        const ds = (o.deliverables || []).map((d) => {
          if (d.id !== deliverableId) return d;
          const r = { id: `r_${Date.now()}`, rating: review.rating || 0, comment: review.comment || '', author: (profile && profile.displayName) || review.author || 'Anonymous', date: new Date().toISOString() };
          const reviews = Array.isArray(d.reviews) ? [...d.reviews, r] : [r];
          return { ...d, reviews };
        });
        updatedOrder = { ...o, deliverables: ds };
        return updatedOrder;
      });
      return arr;
    });
    return Promise.resolve(updatedOrder);
  }

  function listMessages(orderId) {
    return Promise.resolve(messages[orderId] || []);
  }

  function sendMessage(orderId, message) {
    const msg = { id: `m_${Date.now()}`, ...message };
    setMessages((prev) => ({ ...prev, [orderId]: [...(prev[orderId] || []), msg] }));
    return Promise.resolve(msg);
  }

  function listConversations() {
    return Promise.resolve(conversations);
  }

  function getConversation(id) {
    const c = conversations.find((x) => x.id === id);
    return Promise.resolve(c || null);
  }

  function listPayments() {
    return Promise.resolve(payments);
  }

  function getProfile() {
    return Promise.resolve(profile);
  }

  function updateProfile(patch) {
    const updated = { ...profile, ...patch };
    setProfile(updated);
    return Promise.resolve(updated);
  }

  function getDashboardStats() {
    return Promise.resolve(sampleDashboard);
  }

  return (
    <MockApiContext.Provider value={{
      listOrders,
      getOrder,
      createOrder,
      updateDeliverable,
      completeDeliverable,
      payDeliverable,
  approveDeliverable,
  leaveReview,
      listMessages,
      sendMessage,
      listConversations,
      getConversation,
      listPayments,
      getProfile,
      updateProfile,
      getDashboardStats,
    }}>
      {children}
    </MockApiContext.Provider>
  );
}

export const useMockApi = () => useContext(MockApiContext);
