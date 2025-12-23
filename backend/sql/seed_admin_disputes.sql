-- Seed data for Admin Dispute Review demo
-- Safe to run multiple times (guards via WHERE NOT EXISTS)

-- 1) Users: client, freelancer, admin
WITH ins_users AS (
  INSERT INTO "User" (email, password)
  SELECT * FROM (VALUES
    ('client@example.com','x'),
    ('freelancer@example.com','x'),
    ('admin@example.com','x')
  ) v(email,password)
  ON CONFLICT (email) DO NOTHING
  RETURNING user_id, email
)
SELECT 1;

-- map to ids
WITH ids AS (
  SELECT
    (SELECT user_id FROM "User" WHERE email='client@example.com') AS client_id,
    (SELECT user_id FROM "User" WHERE email='freelancer@example.com') AS freelancer_id,
    (SELECT user_id FROM "User" WHERE email='admin@example.com') AS admin_id
)
-- 2) NonAdmin + roles
INSERT INTO "NonAdmin" (user_id, name)
SELECT client_id, 'Client One' FROM ids WHERE NOT EXISTS (
  SELECT 1 FROM "NonAdmin" WHERE user_id = (SELECT client_id FROM ids)
);

INSERT INTO "NonAdmin" (user_id, name)
SELECT freelancer_id, 'Freelancer One' FROM ids WHERE NOT EXISTS (
  SELECT 1 FROM "NonAdmin" WHERE user_id = (SELECT freelancer_id FROM ids)
);

INSERT INTO "Client" (user_id, display_name)
SELECT client_id, 'client_one' FROM ids WHERE NOT EXISTS (
  SELECT 1 FROM "Client" WHERE user_id = (SELECT client_id FROM ids)
);

INSERT INTO "Freelancer" (user_id, tagline)
SELECT freelancer_id, 'I deliver quality' FROM ids WHERE NOT EXISTS (
  SELECT 1 FROM "Freelancer" WHERE user_id = (SELECT freelancer_id FROM ids)
);

INSERT INTO "Admin" (user_id, username)
SELECT admin_id, 'admin1' FROM ids WHERE NOT EXISTS (
  SELECT 1 FROM "Admin" WHERE user_id = (SELECT admin_id FROM ids)
);

-- 3) Service
INSERT INTO "Service" (title, category, description, delivery_time, hourly_price, package_tier)
SELECT 'Logo Design','Design','Simple logo',3,100,'basic'
WHERE NOT EXISTS (
  SELECT 1 FROM "Service" WHERE title='Logo Design'
);

-- 4) Order + make_order + finish_order + payment
WITH svc AS (
  SELECT service_id FROM "Service" WHERE title='Logo Design' LIMIT 1
), ids AS (
  SELECT
    (SELECT user_id FROM "User" WHERE email='client@example.com') AS client_id,
    (SELECT user_id FROM "User" WHERE email='freelancer@example.com') AS freelancer_id
)
INSERT INTO "Order" (status, total_price, required_hours, requirements)
SELECT 'pending', 250, 5, 'Brand brief attached'
WHERE NOT EXISTS (
  SELECT 1 FROM "Order" o JOIN make_order mo ON mo.order_id=o.order_id
  JOIN "Service" s ON s.service_id=mo.service_id
  WHERE s.title='Logo Design'
);

WITH ord AS (
  SELECT o.order_id FROM "Order" o
  LEFT JOIN make_order mo ON mo.order_id=o.order_id
  WHERE mo.order_id IS NULL
  ORDER BY o.order_id DESC
  LIMIT 1
), svc AS (
  SELECT service_id FROM "Service" WHERE title='Logo Design' LIMIT 1
), ids AS (
  SELECT
    (SELECT user_id FROM "User" WHERE email='client@example.com') AS client_id,
    (SELECT user_id FROM "User" WHERE email='freelancer@example.com') AS freelancer_id
)
INSERT INTO make_order (order_id, client_id, service_id)
SELECT (SELECT order_id FROM ord), (SELECT client_id FROM ids), (SELECT service_id FROM svc)
WHERE NOT EXISTS (
  SELECT 1 FROM make_order WHERE order_id = (SELECT order_id FROM ord)
);

-- link payment + freelancer via finish_order
WITH ord AS (
  SELECT order_id FROM make_order ORDER BY order_id DESC LIMIT 1
), ids AS (
  SELECT
    (SELECT user_id FROM "User" WHERE email='freelancer@example.com') AS freelancer_id
), pay AS (
  INSERT INTO "Payment" (amount, released)
  VALUES (250, FALSE)
  RETURNING payment_id
)
INSERT INTO finish_order (order_id, payment_id, freelancer_id)
SELECT (SELECT order_id FROM ord), (SELECT payment_id FROM pay), (SELECT freelancer_id FROM ids)
WHERE NOT EXISTS (
  SELECT 1 FROM finish_order WHERE order_id = (SELECT order_id FROM ord)
);

-- 5) Messages (order chat)
WITH ord AS (
  SELECT order_id FROM make_order ORDER BY order_id DESC LIMIT 1
), ids AS (
  SELECT
    (SELECT user_id FROM "User" WHERE email='client@example.com') AS client_id,
    (SELECT user_id FROM "User" WHERE email='freelancer@example.com') AS freelancer_id
)
INSERT INTO "Messages" (sender_id, receiver_id, message_text, order_id)
SELECT (SELECT client_id FROM ids), (SELECT freelancer_id FROM ids), 'Hi, I need a minimal logo.', (SELECT order_id FROM ord)
WHERE NOT EXISTS (
  SELECT 1 FROM "Messages" WHERE order_id = (SELECT order_id FROM ord)
);

-- 6) Delivery
WITH ord AS (
  SELECT order_id FROM make_order ORDER BY order_id DESC LIMIT 1
), ids AS (
  SELECT
    (SELECT user_id FROM "User" WHERE email='freelancer@example.com') AS freelancer_id
)
INSERT INTO "Delivery" (order_id, freelancer_id, message)
SELECT (SELECT order_id FROM ord), (SELECT freelancer_id FROM ids), 'First draft attached'
WHERE NOT EXISTS (
  SELECT 1 FROM "Delivery" WHERE order_id = (SELECT order_id FROM ord)
);

-- 7) Revision
WITH ord AS (
  SELECT order_id FROM make_order ORDER BY order_id DESC LIMIT 1
), ids AS (
  SELECT
    (SELECT user_id FROM "User" WHERE email='client@example.com') AS client_id
), rev AS (
  INSERT INTO "Revision" (revision_text, revision_no)
  VALUES ('Can we make it more modern?', 1)
  RETURNING revision_id
)
INSERT INTO request_revision (revision_id, client_id, order_id)
SELECT (SELECT revision_id FROM rev), (SELECT client_id FROM ids), (SELECT order_id FROM ord)
WHERE NOT EXISTS (
  SELECT 1 FROM request_revision WHERE order_id = (SELECT order_id FROM ord)
);

-- 8) Dispute + reported + evidence
WITH ord AS (
  SELECT order_id FROM make_order ORDER BY order_id DESC LIMIT 1
), ids AS (
  SELECT
    (SELECT user_id FROM "User" WHERE email='client@example.com') AS client_id
)
INSERT INTO "Dispute" (order_id, status, opened_at, description)
SELECT (SELECT order_id FROM ord), 'OPEN', NOW(), 'Client unhappy with delivery'
WHERE NOT EXISTS (
  SELECT 1 FROM "Dispute" WHERE order_id = (SELECT order_id FROM ord)
);

WITH d AS (
  SELECT dispute_id, order_id FROM "Dispute" ORDER BY dispute_id DESC LIMIT 1
), ids AS (
  SELECT (SELECT user_id FROM "User" WHERE email='client@example.com') AS client_id
)
INSERT INTO reported (dispute_id, client_id, admin_id, order_id)
SELECT (SELECT dispute_id FROM d), (SELECT client_id FROM ids), NULL, (SELECT order_id FROM d)
WHERE NOT EXISTS (
  SELECT 1 FROM reported WHERE dispute_id = (SELECT dispute_id FROM d)
);

WITH d AS (
  SELECT dispute_id FROM "Dispute" ORDER BY dispute_id DESC LIMIT 1
), ids AS (
  SELECT
    (SELECT user_id FROM "User" WHERE email='client@example.com') AS client_id,
    (SELECT user_id FROM "User" WHERE email='freelancer@example.com') AS freelancer_id
)
INSERT INTO "DisputeEvidence" (dispute_id, submitted_by_user_id, description, file_url)
SELECT (SELECT dispute_id FROM d), (SELECT client_id FROM ids), 'Screenshots of conversation', 'https://example.com/client_evidence.png'
WHERE NOT EXISTS (
  SELECT 1 FROM "DisputeEvidence" WHERE dispute_id = (SELECT dispute_id FROM d) AND submitted_by_user_id = (SELECT client_id FROM ids)
);

WITH d AS (
  SELECT dispute_id FROM "Dispute" ORDER BY dispute_id DESC LIMIT 1
), ids AS (
  SELECT
    (SELECT user_id FROM "User" WHERE email='freelancer@example.com') AS freelancer_id
)
INSERT INTO "DisputeEvidence" (dispute_id, submitted_by_user_id, description, file_url)
SELECT (SELECT dispute_id FROM d), (SELECT freelancer_id FROM ids), 'Project files and delivery proof', 'https://example.com/freelancer_evidence.zip'
WHERE NOT EXISTS (
  SELECT 1 FROM "DisputeEvidence" WHERE dispute_id = (SELECT dispute_id FROM d) AND submitted_by_user_id = (SELECT freelancer_id FROM ids)
);
