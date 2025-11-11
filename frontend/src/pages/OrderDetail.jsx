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
        <Typography variant="body2" color="text.secondary">(Timeline events would appear here)</Typography>
        <Button sx={{ mt: 1 }} onClick={()=>alert('Request Revision (mock)')}>Request Revision</Button>
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
