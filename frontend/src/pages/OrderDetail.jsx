import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Paper, Divider, Button } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useMockApi } from '../context/MockApiProvider';
import ChatComposer from '../components/ChatComposer';

export default function OrderDetail(){
  const { orderId } = useParams();
  const { getOrder, listMessages, sendMessage, completeDeliverable, payDeliverable, approveDeliverable, leaveReview } = useMockApi();
  const [order, setOrder] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(()=>{
    getOrder(orderId).then(setOrder);
    listMessages(orderId).then(setMessages);
  }, [orderId]);

  // refresh helper
  const refresh = () => getOrder(orderId).then(setOrder);

  const handleSend = async (msg) => {
    const m = await sendMessage(orderId, { ...msg, sender: 'buyer' });
    setMessages((s)=>[...s, m]);
  };

  if(!order) return <Container sx={{ mt: 4 }}>Loading...</Container>;

  return (
    <Container sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">{order.title}</Typography>
        <Typography variant="body2" color="text.secondary">Status: {order.status}</Typography>
      </Box>
      <Divider sx={{ my: 2 }} />

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Timeline</Typography>
        <Box sx={{ mt: 1 }}>
          {order.timeline && order.timeline.map(ev => (
            <Box key={ev.id} sx={{ mb: 1 }}>
              <Typography variant="subtitle2">{ev.type.replace('_',' ')}</Typography>
              <Typography variant="body2" color="text.secondary">{ev.data?.note}</Typography>
              <Typography variant="caption" color="text.secondary">{new Date(ev.time).toLocaleString()}</Typography>
            </Box>
          ))}
        </Box>
        <Button sx={{ mt: 1 }} onClick={()=>alert('Request Revision (mock)')}>Request Revision</Button>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Deliverables</Typography>
        <Box sx={{ mt: 1 }}>
          {order.deliverables && order.deliverables.length > 0 ? (
            order.deliverables.map(d => (
              <Box key={d.id} sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2">{d.description || 'Deliverable'}</Typography>
                  <Typography variant="body2">Due: {d.dueDate ? new Date(d.dueDate).toLocaleString() : '—'}</Typography>
                  <Typography variant="caption" color="text.secondary">Amount: {d.amount} {order.price?.currency || ''}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color={d.completed ? 'success.main' : 'text.secondary'} sx={{ display: 'block' }}>{d.completed ? 'Completed' : 'Pending'}</Typography>
                  <Typography variant="caption" color={d.paid ? 'success.main' : 'text.secondary'} sx={{ display: 'block' }}>{d.paid ? 'Paid' : 'Unpaid'}</Typography>
                  <Typography variant="caption" color={d.approved ? 'success.main' : 'text.secondary'} sx={{ display: 'block' }}>{d.approved ? 'Approved' : 'Not approved'}</Typography>
                  <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    {!d.completed && <Button size="small" onClick={async ()=>{ await completeDeliverable(order.id, d.id); await refresh(); }}>Mark completed</Button>}
                    {!d.paid && <Button size="small" onClick={async ()=>{ await payDeliverable(order.id, d.id); await refresh(); }}>Mark paid</Button>}
                    {!d.approved && <Button size="small" onClick={async ()=>{ await approveDeliverable(order.id, d.id); await refresh(); }}>Approve completion</Button>}
                    <Button size="small" onClick={async ()=>{
                      const comment = prompt('Leave a short review/comment (mock)');
                      if (comment !== null) {
                        const ratingRaw = prompt('Rating 1-5 (optional)');
                        const rating = ratingRaw ? Number(ratingRaw) : 0;
                        await leaveReview(order.id, d.id, { rating, comment });
                        await refresh();
                      }
                    }}>Leave review</Button>
                  </Box>

                  {d.reviews && d.reviews.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="subtitle2">Reviews</Typography>
                      {d.reviews.map(r => (
                        <Box key={r.id} sx={{ mt: 1 }}>
                          <Typography variant="body2"><strong>{r.author}</strong> — {r.rating ? `${r.rating}/5` : ''}</Typography>
                          <Typography variant="body2">{r.comment}</Typography>
                          <Typography variant="caption" color="text.secondary">{new Date(r.date).toLocaleString()}</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
            ))
          ) : (
            <Typography color="text.secondary">No deliverables yet.</Typography>
          )}
        </Box>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Messages</Typography>
        <Box sx={{ maxHeight: 300, overflow: 'auto', my: 1 }}>
          {messages.map(m=> (
            <Box key={m.id} sx={{ mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{m.sender}</Typography>
              <Typography variant="body1">{m.text}</Typography>
              <Typography variant="caption" color="text.secondary">{new Date(m.createdAt).toLocaleString()}</Typography>
            </Box>
          ))}
        </Box>
        <ChatComposer onSend={handleSend} />
      </Paper>
    </Container>
  );
}
