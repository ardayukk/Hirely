export const sampleOrders = [
  {
    id: 'ord_1',
    title: 'Design Landing Page',
    orderType: 'small', // 'small' | 'big'
    seller: { id: 'u2', name: 'Jane Doe', avatar: '' },
    tier: { id: 't1', name: 'Standard', price: 150, deliveryDays: 5 },
    price: { subtotal: 150, fees: 5, tax: 0, total: 155, currency: 'USD' },
    status: 'in_progress',
    dueDate: '2025-11-20T23:59:59Z',
    updatedAt: '2025-11-12T10:00:00Z',
    revisionsAllowed: 2,
    revisionsRemaining: 2,
    timeline: [
      { id: 'ev1', type: 'order_created', actor: 'buyer', time: '2025-11-11T09:00:00Z', data: { note: 'Order placed' } },
      { id: 'ev2', type: 'payment', actor: 'system', time: '2025-11-11T09:01:00Z', data: { note: 'Payment received' } },
      { id: 'ev3', type: 'work_started', actor: 'seller', time: '2025-11-12T10:00:00Z', data: { note: 'Seller started work' } },
    ],
    // small orders have a single deliverable
    deliverables: [
      { id: 'd_small_1', dueDate: '2025-11-20T23:59:59Z', description: 'Final landing page', amount: 155, completed: false, paid: true, approved: false, reviews: [] },
    ],
  },
  {
    id: 'ord_2',
    title: 'Build React App',
    seller: { id: 'u3', name: 'Acme Devs', avatar: '' },
    tier: { id: 't2', name: 'Premium', price: 600, deliveryDays: 10 },
    price: { subtotal: 600, fees: 20, tax: 0, total: 620, currency: 'USD' },
    status: 'delivered',
    dueDate: '2025-11-15T23:59:59Z',
    updatedAt: '2025-11-13T12:00:00Z',
    revisionsAllowed: 1,
    revisionsRemaining: 1,
    timeline: [
      { id: 'ev1', type: 'order_created', actor: 'buyer', time: '2025-11-10T09:00:00Z', data: { note: 'Order placed' } },
      { id: 'ev2', type: 'payment', actor: 'system', time: '2025-11-10T09:01:00Z', data: { note: 'Payment received' } },
      { id: 'ev3', type: 'delivery', actor: 'seller', time: '2025-11-13T11:00:00Z', data: { note: 'Initial delivery', files: [{ id: 'f1', name: 'final.zip', url: '#' }] } },
    ],
    orderType: 'big',
    // big orders have multiple deliverables, each with own amount/date
    deliverables: [
      { id: 'bd1', dueDate: '2025-11-13T11:00:00Z', description: 'Initial milestone - MVP', amount: 300, completed: true, paid: true, approved: true, files: [{ name: 'final.zip', url: '#' }], reviews: [{ id: 'r1', rating: 5, comment: 'Great work on the MVP', author: 'Demo Client', date: '2025-11-14T10:00:00Z' }] },
      { id: 'bd2', dueDate: '2025-11-20T23:59:59Z', description: 'Final polish and QA', amount: 320, completed: false, paid: false, approved: false, reviews: [] },
    ],
  },
];

export const sampleMessages = {
  ord_1: [
    { id: 'm1', sender: 'seller', text: 'Started the design', createdAt: '2025-11-12T10:01:00Z' },
    { id: 'm2', sender: 'buyer', text: 'Thanks — please use blue tones', createdAt: '2025-11-12T10:05:00Z' },
  ],
  ord_2: [
    { id: 'm3', sender: 'seller', text: 'Delivery uploaded', createdAt: '2025-11-13T11:00:00Z' },
  ],
};

export const sampleConversations = [
  {
    id: 'c_ord_1',
    orderId: 'ord_1',
    partner: { id: 'u2', name: 'Jane Doe' },
    lastMessage: 'Thanks — please use blue tones',
    updatedAt: '2025-11-12T10:05:00Z',
    unread: 1,
  },
  {
    id: 'c_ord_2',
    orderId: 'ord_2',
    partner: { id: 'u3', name: 'Acme Devs' },
    lastMessage: 'Delivery uploaded',
    updatedAt: '2025-11-13T11:00:00Z',
    unread: 0,
  },
];

export const samplePayments = [
  { id: 'pay_1', type: 'charge', amount: 155, currency: 'USD', date: '2025-11-11T09:00:00Z', orderId: 'ord_1', status: 'succeeded' },
  { id: 'pay_2', type: 'charge', amount: 620, currency: 'USD', date: '2025-11-13T12:00:00Z', orderId: 'ord_2', status: 'succeeded' },
  { id: 'pay_3', type: 'refund', amount: 50, currency: 'USD', date: '2025-11-14T08:00:00Z', orderId: null, status: 'issued' },
];

export const sampleProfile = {
  id: 'u1',
  displayName: 'Demo Client',
  email: 'demo@local',
  location: 'Istanbul, TR',
  notifications: {
    orders: true,
    messages: true,
    promotions: false,
  },
  security: {
    twoFactor: false,
  },
};

export const sampleDashboard = {
  activeOrders: 2,
  unreadMessages: 1,
  pendingPayments: 0,
  completedThisMonth: 3,
};
