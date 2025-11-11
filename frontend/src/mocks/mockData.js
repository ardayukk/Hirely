export const sampleOrders = [
  {
    id: 'ord_1',
    title: 'Design Landing Page',
    seller: { id: 'u2', name: 'Jane Doe', avatar: '' },
    tier: { id: 't1', name: 'Standard', price: 150, deliveryDays: 5 },
    price: { subtotal: 150, fees: 5, tax: 0, total: 155, currency: 'USD' },
    status: 'in_progress',
    dueDate: '2025-11-20T23:59:59Z',
    updatedAt: '2025-11-12T10:00:00Z',
    revisionsAllowed: 2,
    revisionsRemaining: 2,
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
