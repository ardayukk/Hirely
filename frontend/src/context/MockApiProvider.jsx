import React, { createContext, useContext, useState } from 'react';
import { sampleOrders, sampleMessages } from '../mocks/mockData';

const MockApiContext = createContext(null);

export function MockApiProvider({ children }) {
  const [orders, setOrders] = useState(sampleOrders);
  const [messages, setMessages] = useState(sampleMessages);

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
      tier: payload.tier || { id: 't1', name: 'Standard', price: 100, deliveryDays: 5 },
      price: payload.price || { subtotal: 100, fees: 5, tax: 0, total: 105, currency: 'USD' },
      status: 'submitted',
      dueDate: payload.deadline || null,
      revisionsAllowed: 2,
      revisionsRemaining: 2,
    };
    setOrders((s) => [newOrder, ...s]);
    return Promise.resolve(newOrder);
  }

  function listMessages(orderId) {
    return Promise.resolve(messages[orderId] || []);
  }

  function sendMessage(orderId, message) {
    const msg = { id: `m_${Date.now()}`, ...message };
    setMessages((prev) => ({ ...prev, [orderId]: [...(prev[orderId] || []), msg] }));
    return Promise.resolve(msg);
  }

  return (
    <MockApiContext.Provider value={{ listOrders, getOrder, createOrder, listMessages, sendMessage }}>
      {children}
    </MockApiContext.Provider>
  );
}

export const useMockApi = () => useContext(MockApiContext);
