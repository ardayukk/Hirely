# Testing Guide - All Schema Features

This guide walks through each schema feature to verify it's working in the UI.

## Prerequisites
1. Backend running: `python main.py` (from `backend/` directory)
2. Frontend running: `npm run dev` (from `frontend/` directory)
3. Database seeded with sample data from `seed_all_features.py`
4. Logged in as a client or freelancer user

---

## Feature Testing Checklist

### 1. ✅ Service Add-ons
**Path**: Browse Services → Click any service detail
**What to Test**:
- [ ] "Add-ons" section appears with 2+ items
- [ ] Each add-on shows title, description, price, delivery extension
- [ ] Checkboxes allow selecting/deselecting add-ons
- [ ] Selected add-ons are passed to checkout
**Expected Data**: ServiceAddon table with linked services

---

### 2. ✅ Favorites (Services & Freelancers)
**Path 1**: Service Detail → "Favorite" button
**Path 2**: Navbar (if client) → "Favorites"
**What to Test**:
- [ ] "Favorite" button saves service
- [ ] Button shows success/error message
- [ ] Favorites page loads with saved services
- [ ] Can delete favorite from the list
- [ ] Cards show service/freelancer info with links
**Expected Data**: Favorite table with client_id, service_id, freelancer_id

---

### 3. ✅ Freelancer Portfolio
**Path 1**: Service Detail → "Portfolio" button
**Path 2**: `/portfolio/{freelancerId}` directly
**What to Test**:
- [ ] Portfolio page loads with freelancer info
- [ ] Portfolio items display with images/descriptions
- [ ] Tags shown for each portfolio item
- [ ] Project URLs are clickable links
- [ ] Creation dates displayed
**Expected Data**: Portfolio, PortfolioTag, PortfolioTagMapping tables

---

### 4. ✅ Sample Work
**Path**: Service Detail page (scroll to "Sample Work" section)
**What to Test**:
- [ ] "Sample Work" section visible on service detail
- [ ] Contains text description from freelancer
- [ ] Displays sample work content accurately
**Expected Data**: SampleWork table with service_id FK

---

### 5. ✅ Availability Slots
**Path 1**: Service Detail → "Availability" button
**Path 2**: `/availability/{freelancerId}` directly
**What to Test**:
- [ ] Availability page loads with freelancer schedule
- [ ] Available slots shown with date/time ranges
- [ ] Booked slots marked differently with status
- [ ] Booked slots link to order_id
**Expected Data**: AvailabilitySlot table with is_booked flag

---

### 6. ✅ Pricing History
**Path 1**: Service Detail → "Pricing History" button
**Path 2**: `/pricing-history/{serviceId}` directly
**What to Test**:
- [ ] Pricing History page loads
- [ ] Current price highlighted at top
- [ ] Table shows all historical prices
- [ ] Columns: Date, Price, Multiplier, Active Orders, Reason
- [ ] Sorted newest to oldest
- [ ] Reason chips color-coded (demand/discount/manual)
**Expected Data**: PricingHistory table with demand_multiplier, active_orders_count

---

### 7. ✅ Service Version History
**Path 1**: Service Detail → "Version History" button
**Path 2**: `/service-versions/{serviceId}` directly
**What to Test**:
- [ ] Version History page loads with timeline
- [ ] Each version shows number, date, features, changes
- [ ] Current version highlighted with badge
- [ ] Timeline visualization with visual separators
- [ ] Versions ordered newest first
**Expected Data**: ServiceVersion table with version_number, features, change_description

---

### 8. ✅ Warranty & Claims
**Path 1**: Orders page → Click completed order → "View Warranty & Claims"
**Path 2**: `/warranty/{orderId}` directly
**What to Test**:
- [ ] Warranty details load (duration, terms, dates)
- [ ] Claims section shows all filed claims
- [ ] Can file new warranty claim with description
- [ ] Claims show status (pending/approved/rejected)
- [ ] Resolution notes display if claim resolved
**Expected Data**: ServiceWarranty, WarrantyClaim tables with claim_date, status, resolution

---

### 9. ✅ Reviews
**Path**: Service Detail page (scroll to "Reviews" section)
**What to Test**:
- [ ] "Reviews" section shows count
- [ ] Each review displays rating (stars), comment, client ID
- [ ] Multiple reviews load if present
- [ ] Reviews come from orders for this service
**Expected Data**: Review table joined via Order.service_id

---

### 10. ✅ Deliverables (Big Orders)
**Path**: Orders page → Click a big order → "Deliverables" section
**What to Test**:
- [ ] Deliverables section visible for multi-milestone orders
- [ ] Shows description, due date, payment amount, status
- [ ] Deliverables from Deliverable table
- [ ] Linked to BigOrder via FK
**Expected Data**: Deliverable table with order_id, phase_number

---

### 11. ✅ Order Lifecycle (Small vs Big)
**Path**: Orders page or Create Order
**What to Test**:
- [ ] Can create SmallOrder (single delivery date)
- [ ] Can create BigOrder (milestone-based)
- [ ] Order status progresses: pending → accepted → in_progress → delivered → completed
- [ ] Revision requests work (revision_count tracked)
- [ ] Only "completed" orders can be reviewed
**Expected Data**: Order, SmallOrder, BigOrder tables

---

### 12. ✅ Messaging with Files
**Path**: Order Detail page → "Chat" or scroll to messages section
**What to Test**:
- [ ] Can send text messages
- [ ] Can attach files with messages
- [ ] Messages display for both parties
- [ ] Files are downloadable
- [ ] Message timestamps visible
**Expected Data**: Messages, File tables with file_name, file_path

---

### 13. ✅ Disputes
**Path**: Order Detail page → "Open Dispute" button
**What to Test**:
- [ ] Can open dispute when order not disputed
- [ ] Dispute shows status and timestamps
- [ ] Freelancer can respond to dispute (DisputeEvidence)
- [ ] Can attach evidence files
- [ ] Admin can resolve disputes
**Expected Data**: Dispute, DisputeEvidence tables

---

### 14. ✅ Notifications
**Path**: Navbar → "Notifications"
**What to Test**:
- [ ] Notifications page loads
- [ ] Lists all notifications with types (order, dispute, message, etc)
- [ ] Timestamps and descriptions shown
- [ ] Can see unread status
**Expected Data**: Notification table with notification_type, created_at

---

### 15. ✅ Analytics (Admin View)
**Path**: Admin panel or Analytics pages (if role is admin)
**What to Test**:
- [ ] Can view various analytics reports
- [ ] Pricing analytics summary available
- [ ] Dispute analytics tracked
- [ ] Satisfaction metrics shown
**Expected Data**: AnalyticsReport table

---

## Test Data Verification

Run this SQL to verify seeded data exists:

```sql
SELECT 'User' as table_name, COUNT(*) as count FROM "User"
UNION
SELECT 'Service', COUNT(*) FROM "Service"
UNION
SELECT 'ServiceAddon', COUNT(*) FROM "ServiceAddon"
UNION
SELECT 'Order', COUNT(*) FROM "Order"
UNION
SELECT 'Portfolio', COUNT(*) FROM "Portfolio"
UNION
SELECT 'AvailabilitySlot', COUNT(*) FROM "AvailabilitySlot"
UNION
SELECT 'PricingHistory', COUNT(*) FROM "PricingHistory"
UNION
SELECT 'ServiceVersion', COUNT(*) FROM "ServiceVersion"
UNION
SELECT 'ServiceWarranty', COUNT(*) FROM "ServiceWarranty"
UNION
SELECT 'Review', COUNT(*) FROM "Review"
UNION
SELECT 'Notification', COUNT(*) FROM "Notification";
```

Expected results show data in at least 10+ tables.

---

## Common Issues & Fixes

### "Service not found" errors
- Ensure database seeding completed: `python seed_all_features.py`
- Check that service_id exists in database

### "Pricing history empty"
- Normal if no historical price changes made
- Check PricingHistory table has entries
- Use `/api/pricing-history/1` to test with seed service_id=1

### "No portfolio items"
- Ensure Portfolio table has data from seed script
- Verify freelancer_id matches an actual Freelancer user

### "Warranty not found"
- Not all services have warranties
- Check ServiceWarranty table for entries
- Try with service_id that has warranty in database

---

## Success Criteria

✅ **All schema features visible**: Every table in schema.sql can be demonstrated in UI
✅ **Navigation working**: Buttons/links between related features work correctly
✅ **Data display accurate**: UI shows correct information from database
✅ **No 500 errors**: All endpoints return proper responses or 404s

Once all tests pass, the application fully demonstrates all schema features.
