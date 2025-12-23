# Admin Dispute Resolution - API Reference

## Overview
Enhanced dispute management API endpoints for admin dispute resolution interface.

## Endpoints

### List All Disputes
```
GET /api/disputes?status={status}
```

**Query Parameters:**
- `status` (optional): Filter by status - `"open"` or `"resolved"`

**Response:**
```json
[
  {
    "dispute_id": 1,
    "status": "open",
    "decision": null,
    "resolution_date": null,
    "order_id": 5,
    "client_id": 2,
    "admin_id": null,
    "client_name": "John Client",
    "admin_name": null
  }
]
```

---

### Get Dispute Detail
```
GET /api/disputes/{dispute_id}
```

**Path Parameters:**
- `dispute_id` (required): The dispute ID

**Response:**
```json
{
  "dispute_id": 1,
  "status": "open",
  "decision": "Initial complaint about delivery quality",
  "resolution_date": null,
  "order_id": 5,
  "client_id": 2,
  "admin_id": 3,
  "client_name": "John Client",
  "admin_name": "Admin Sarah"
}
```

---

### Assign Dispute to Admin
```
PATCH /api/disputes/{dispute_id}/assign?admin_id={admin_id}
```

**Path Parameters:**
- `dispute_id` (required): The dispute ID

**Query Parameters:**
- `admin_id` (required): The admin user ID to assign to

**Response:**
```json
{
  "dispute_id": 1,
  "status": "open",
  "decision": "Initial complaint about delivery quality",
  "resolution_date": null,
  "order_id": 5,
  "client_id": 2,
  "admin_id": 3,
  "client_name": "John Client",
  "admin_name": "Admin Sarah"
}
```

**Errors:**
- `404`: Dispute not found
- `404`: Admin not found
- `400`: Failed to assign dispute

---

### Resolve Dispute
```
PATCH /api/disputes/{dispute_id}/resolve?admin_id={admin_id}
```

**Path Parameters:**
- `dispute_id` (required): The dispute ID

**Query Parameters:**
- `admin_id` (required): The admin resolving the dispute

**Request Body:**
```json
{
  "decision": "After reviewing evidence, client's claims are valid. Freelancer failed to meet quality standards.",
  "outcome": "refund"
}
```

**Outcome Values:**
- `"refund"`: Refund client - sets order status to "cancelled"
- `"release"`: Release payment to freelancer - sets order status to "completed"

**Response:**
```json
{
  "dispute_id": 1,
  "status": "resolved",
  "decision": "After reviewing evidence, client's claims are valid. Freelancer failed to meet quality standards.",
  "resolution_date": "2025-12-23T10:30:00",
  "order_id": 5,
  "client_id": 2,
  "admin_id": 3,
  "client_name": "John Client",
  "admin_name": "Admin Sarah"
}
```

**Errors:**
- `403`: Only assigned admin can resolve
- `404`: Dispute or admin not found
- `400`: Invalid outcome or missing decision
- `400`: Failed to resolve dispute

---

### Add Admin Notes (NEW)
```
POST /api/disputes/{dispute_id}/notes?admin_id={admin_id}&note={note}
```

**Path Parameters:**
- `dispute_id` (required): The dispute ID

**Query Parameters:**
- `admin_id` (required): The admin adding the note
- `note` (required): The note text

**Response:**
```json
{
  "status": "success",
  "message": "Note added to dispute"
}
```

**Errors:**
- `403`: Only assigned admin can add notes
- `404`: Dispute not found
- `400`: Failed to add note

---

## Supporting Endpoints

### Get Order Details
```
GET /api/orders/{order_id}
```

Used to retrieve full order information including:
- Service details
- Client and freelancer names
- Order status
- Timeline information
- Revision count
- Total price

See Orders API for full documentation.

---

## Field Reference

### Dispute Status Values
- `"open"`: Dispute is active and awaiting resolution
- `"resolved"`: Dispute has been resolved by admin

### Order Status Values (after resolution)
- `"cancelled"`: Order cancelled due to refund resolution
- `"completed"`: Order completed with payment released
- `"disputed"`: Order in dispute (before resolution)

### Outcome Values
- `"refund"`: Client receives refund, freelancer not paid
- `"release"`: Freelancer receives payment, client dispute denied

---

## Admin Authorization

All endpoints require admin role verification at the API level. The frontend handles:
1. Role-based UI display
2. Admin ID passing via query parameters
3. User context validation

Backend validates:
1. User is an admin
2. Admin is assigned to dispute (for resolution)
3. All transaction integrity

---

## Error Handling

All endpoints return standard HTTP status codes:

- `200`: Successful GET/PATCH
- `201`: Successful POST
- `400`: Bad request or validation error
- `403`: Forbidden (not authorized)
- `404`: Not found

Error response format:
```json
{
  "detail": "Error message describing what went wrong"
}
```

---

## Example Workflows

### Workflow 1: Assign and Resolve
```bash
# 1. List open disputes
curl GET /api/disputes?status=open

# 2. Assign dispute 1 to admin 3
curl PATCH /api/disputes/1/assign?admin_id=3

# 3. Resolve dispute with refund
curl PATCH /api/disputes/1/resolve?admin_id=3 \
  -H "Content-Type: application/json" \
  -d '{
    "outcome": "refund",
    "decision": "Client was not satisfied with deliverable quality. Refunding order."
  }'
```

### Workflow 2: Add Notes
```bash
# Add internal notes to dispute 1
curl POST /api/disputes/1/notes?admin_id=3&note="Need%20to%20verify%20freelancer%20credentials"
```

---

## Database Impact

### Dispute Table Updates
When a dispute is resolved:
- `decision` field: Updated with admin's decision note
- `status` field: Changed to "resolved"
- `resolution_date` field: Set to current timestamp

### Order Table Updates
When a dispute is resolved:
- `status` field: Updated based on outcome
  - Refund outcome → "cancelled"
  - Release outcome → "completed"

### Reported Table Updates
- `admin_id` field: Set when dispute is assigned

---

## Rate Limiting

No specific rate limits on dispute endpoints, but general API rate limits apply.

---

## Version History

### v1.0 (Current)
- Initial dispute resolution API
- Support for assign, resolve, and notes
- Full dispute detail retrieval
- Status filtering on list endpoint

---

## Best Practices

1. **Always pass admin_id**: Required for audit trail and authorization
2. **Validate outcome**: Use only "refund" or "release"
3. **Detailed decisions**: Always provide comprehensive decision notes
4. **Check status first**: Verify dispute is "open" before attempting resolution
5. **Use internal notes**: Add notes to disputes for team communication
6. **Assign before resolving**: Ensure dispute is assigned before taking action

---

## Integration Notes

The frontend AdminDisputes component handles all the orchestration:
1. Lists disputes with filtering
2. Loads order details via `/api/orders/{order_id}`
3. Manages tab navigation
4. Collects admin input
5. Submits decisions via resolve endpoint
6. Updates UI based on responses
7. Shows loading states and error messages

---

**Last Updated**: December 23, 2025
**API Version**: 1.0
**Status**: Production Ready
