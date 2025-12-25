import re

with open('backend/routers/orders.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all "SELECT order_id FROM finish_order WHERE order_id = %s AND freelancer_id = %s"
content = content.replace(
    "SELECT order_id FROM finish_order WHERE order_id = %s AND freelancer_id = %s",
    'SELECT order_id FROM "Order" WHERE order_id = %s AND freelancer_id = %s'
)

# Replace "SELECT client_id FROM make_order WHERE order_id = %s"
content = content.replace(
    "SELECT client_id FROM make_order WHERE order_id = %s",
    'SELECT client_id FROM "Order" WHERE order_id = %s'
)

with open('backend/routers/orders.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed junction table queries in orders.py")
