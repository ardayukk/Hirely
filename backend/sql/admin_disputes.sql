-- Admin Dispute Review Queries (for documentation/demo)

-- Query A: Open Disputes List
-- Outputs: dispute_id, opened_at, order info, parties
SELECT
  d.dispute_id,
  d.opened_at,
  d.status,
  d.order_id,
  o.status AS order_status,
  o.total_price,
  r.client_id,
  fo.freelancer_id,
  nac.name AS client_name,
  naf.name AS freelancer_name
FROM "Dispute" d
JOIN "Order" o ON d.order_id = o.order_id
JOIN reported r ON r.dispute_id = d.dispute_id AND r.order_id = d.order_id
LEFT JOIN finish_order fo ON fo.order_id = d.order_id
LEFT JOIN "NonAdmin" nac ON nac.user_id = r.client_id
LEFT JOIN "NonAdmin" naf ON naf.user_id = fo.freelancer_id
WHERE UPPER(d.status) = 'OPEN'
ORDER BY d.opened_at DESC;

-- Query B: Dispute detail header (Dispute + Order + Parties)
SELECT
  d.dispute_id,
  d.status,
  d.opened_at,
  d.admin_notes,
  d.description,
  d.admin_id,
  o.order_id,
  o.status AS order_status,
  o.total_price,
  o.order_date,
  r.client_id,
  fo.freelancer_id,
  nac.name AS client_name,
  naf.name AS freelancer_name
FROM "Dispute" d
JOIN "Order" o ON d.order_id = o.order_id
JOIN reported r ON r.dispute_id = d.dispute_id AND r.order_id = d.order_id
LEFT JOIN finish_order fo ON fo.order_id = d.order_id
LEFT JOIN "NonAdmin" nac ON nac.user_id = r.client_id
LEFT JOIN "NonAdmin" naf ON naf.user_id = fo.freelancer_id
WHERE d.dispute_id = $1;

-- Query C: Messages for the order
SELECT * FROM "Messages"
WHERE order_id = $1
ORDER BY timestamp ASC;

-- Query D: Deliverables (using actual deliveries)
SELECT d.delivery_id, d.order_id, d.freelancer_id, d.message, d.created_at
FROM "Delivery" d
WHERE d.order_id = $1
ORDER BY d.created_at ASC;

-- Query E: Revisions for the order
SELECT r.revision_id, r.revision_text, r.revision_no, r.created_at
FROM request_revision rr
JOIN "Revision" r ON r.revision_id = rr.revision_id
WHERE rr.order_id = $1
ORDER BY r.created_at ASC;

-- Query F: Dispute evidence
SELECT * FROM "DisputeEvidence"
WHERE dispute_id = $1
ORDER BY created_at ASC;

-- Query G: Timeline (event_type, event_time, actor_id, details)
(
  SELECT 'ORDER_CREATED' AS event_type, o.order_date AS event_time, NULL::INT AS actor_id, 'Order created' AS details
  FROM "Order" o
  WHERE o.order_id = $1
)
UNION ALL
(
  SELECT 'MESSAGE', m.timestamp, m.sender_id, COALESCE(m.message_text,'')
  FROM "Messages" m
  WHERE m.order_id = $1
)
UNION ALL
(
  SELECT 'DELIVERY', d.created_at, d.freelancer_id, COALESCE(d.message,'')
  FROM "Delivery" d
  WHERE d.order_id = $1
)
UNION ALL
(
  SELECT 'REVISION', r.created_at, rr.client_id, COALESCE(r.revision_text,'')
  FROM request_revision rr
  JOIN "Revision" r ON r.revision_id = rr.revision_id
  WHERE rr.order_id = $1
)
UNION ALL
(
  SELECT 'DISPUTE_OPENED', d.opened_at, r.client_id, COALESCE(d.description,'')
  FROM "Dispute" d
  JOIN reported r ON r.dispute_id = d.dispute_id AND r.order_id = d.order_id
  WHERE d.order_id = $1
)
ORDER BY event_time ASC;