import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Paper, Divider, Button } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useMockApi } from '../context/MockApiProvider';
import ChatComposer from '../components/ChatComposer';

export default function OrderDetail(){
  const { orderId } = useParams();
  const { getOrder, listMessages, sendMessage } = useMockApi();
  const [order, setOrder] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(()=>{
    getOrder(orderId).then(setOrder);
    listMessages(orderId).then(setMessages);
  }, [orderId]);

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
          {order.deliveries && order.deliveries.length > 0 ? (
            order.deliveries.map(d => (
              <Box key={d.id} sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Delivered at {new Date(d.at).toLocaleString()}</Typography>
                <Typography variant="body2">{d.message}</Typography>
                {d.files && d.files.map(f => (
                  <Box key={f.name} sx={{ mt: 1 }}>
                    <Button size="small" onClick={() => alert('Download ' + f.name)}>{f.name}</Button>
                  </Box>
                ))}
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
