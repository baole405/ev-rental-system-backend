# PayOS Payment Verification API

## ✅ SOLUTION IMPLEMENTED

The **Payment Verification API** has been successfully created to solve the polling issue!

---

## 🎯 Problem Solved

**Before**: Frontend kept polling `GET /api/bookings/:id` because webhook couldn't reach localhost
**After**: Frontend calls `POST /api/payos/verify-payment` which directly queries PayOS API

---

## 📡 API Endpoint

### `POST /api/payos/verify-payment`

Verify payment status directly from PayOS and update booking status if needed.

#### Request Body

```json
{
  "bookingId": "690b99875f2ee7b357a59978",
  "orderCode": "368371868"
}
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "verified": true,
    "paymentStatus": "PAID",
    "bookingStatus": "PAID",
    "amount": 500000,
    "transactionDate": "2025-11-05T18:59:59Z",
    "orderCode": "368371868"
  }
}
```

#### Error Responses

**400 Bad Request** - Missing required fields

```json
{
  "success": false,
  "message": "bookingId and orderCode are required"
}
```

**404 Not Found** - Payment intent or booking not found

```json
{
  "success": false,
  "message": "Payment intent not found"
}
```

**502 Bad Gateway** - PayOS API error

```json
{
  "success": false,
  "message": "Failed to verify payment with PayOS",
  "detail": "Network error or PayOS service unavailable"
}
```

---

## 🔄 Complete Payment Flow

### 1. **Create Booking & Checkout**

```typescript
// Frontend creates booking
const booking = await createBooking(bookingData);

// Approve booking and get payment link
const checkout = await createPayOSCheckout({ bookingId: booking._id });
// Response: { orderCode: "368371868", checkoutData: { checkoutUrl: "..." } }

// Redirect user to PayOS payment page
window.location.href = checkout.checkoutData.checkoutUrl;
```

### 2. **User Completes Payment on PayOS**

- User scans QR or enters card details
- PayOS processes payment
- PayOS redirects to: `http://localhost:4200/payos/return?b={bookingId}&code=00&status=PAID&orderCode={orderCode}`

### 3. **Frontend Verifies Payment (NEW!)**

```typescript
// In /payos/return page
const urlParams = new URLSearchParams(window.location.search);
const bookingId = urlParams.get("b");
const orderCode = urlParams.get("orderCode");
const status = urlParams.get("status"); // from PayOS URL

if (status === "PAID") {
  // Call verification API instead of polling
  const result = await verifyPayOSPayment({ bookingId, orderCode });

  if (result.data.bookingStatus === "PAID") {
    // ✅ Payment confirmed!
    toast.success("Payment successful!");
    navigate(`/bookings/${bookingId}`);
  }
}
```

---

## 🛠️ Frontend Implementation

### Add to `payment.api.tsx`

```typescript
export interface PayOSVerifyRequest {
  bookingId: string;
  orderCode: string;
}

export interface PayOSVerifyResponse {
  success: boolean;
  data: {
    verified: boolean;
    paymentStatus: string;
    bookingStatus: string;
    amount: number;
    transactionDate: string;
    orderCode: string;
  };
}

export const verifyPayOSPayment = async (
  payload: PayOSVerifyRequest
): Promise<PayOSVerifyResponse> => {
  const response = await apiRequest.post<PayOSVerifyResponse>(
    "/api/payos/verify-payment",
    payload
  );
  return response;
};
```

### Update `/payos/return.tsx`

**BEFORE (Polling 20 times)**:

```typescript
const checkBookingStatus = async () => {
  const booking = await getBookingById(bookingId);
  if (booking.status === "PAID") {
    // Success!
  }
};

// Poll every 2 seconds, 20 times
const interval = setInterval(checkBookingStatus, 2000);
```

**AFTER (Single API call)** ⭐:

```typescript
const verifyPayment = async () => {
  try {
    const result = await verifyPayOSPayment({
      bookingId,
      orderCode,
    });

    if (
      result.data.paymentStatus === "PAID" &&
      result.data.bookingStatus === "PAID"
    ) {
      toast.success("Payment verified successfully!");
      navigate(`/bookings/${bookingId}`);
    } else {
      toast.error("Payment verification failed");
    }
  } catch (error) {
    toast.error("Failed to verify payment");
  }
};

// Call once when component mounts
useEffect(() => {
  if (bookingId && orderCode && status === "PAID") {
    verifyPayment();
  }
}, [bookingId, orderCode, status]);
```

---

## 🔍 Backend Logic Explained

### What the API Does:

1. **Validate Input**

   - Check `bookingId` and `orderCode` exist
   - Find `PaymentIntent` in database

2. **Query PayOS API**

   - Call `payos.paymentRequests.getPaymentLinkInformation(orderCode)`
   - Get real-time payment status from PayOS

3. **Update Database (If Needed)**

   - If PayOS says "PAID" but booking still "WAITING_PAYMENT"
   - Create payment record
   - Update booking status to "PAID"
   - Update payment intent to "captured"

4. **Return Response**
   - Return verified status to frontend
   - Frontend can immediately show success

---

## 🎨 Console Logs (For Debugging)

When you call the API, you'll see detailed logs:

```bash
🔍 [PayOS Verify] Request for bookingId: 690b99875f2ee7b357a59978, orderCode: 368371868
📋 [PayOS Verify] Found intent for booking: 690b99875f2ee7b357a59978
📄 [PayOS Verify] Current booking status: WAITING_PAYMENT
🌐 [PayOS Verify] Querying PayOS API for orderCode: 368371868
✅ [PayOS Verify] PayOS response: { "status": "PAID", "amount": 500000, ... }
💳 [PayOS Verify] Payment status from PayOS: PAID, isPaid: true
🔄 [PayOS Verify] Payment successful, updating booking status...
✅ [PayOS Verify] Payment record created
✅ [PayOS Verify] Booking status updated to PAID
🎉 [PayOS Verify] Successfully updated booking to PAID
✅ [PayOS Verify] Response: { "success": true, "data": { ... } }
```

---

## 🧪 Testing

### Using cURL

```bash
curl -X POST http://localhost:5000/api/payos/verify-payment \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "690b99875f2ee7b357a59978",
    "orderCode": "368371868"
  }'
```

### Using Postman

1. **Method**: POST
2. **URL**: `http://localhost:5000/api/payos/verify-payment`
3. **Headers**: `Content-Type: application/json`
4. **Body** (raw JSON):

```json
{
  "bookingId": "690b99875f2ee7b357a59978",
  "orderCode": "368371868"
}
```

### Complete Test Flow

1. ✅ Create booking → Status: PENDING
2. ✅ Approve booking → Status: WAITING_PAYMENT
3. ✅ POST `/api/payos/checkout` → Get payment link
4. ✅ Pay on PayOS sandbox → Redirects to return URL
5. ✅ POST `/api/payos/verify-payment` → Booking updated to PAID
6. ✅ Check booking details → Status: PAID ✅

---

## 🔒 Security Features

1. ✅ **Validates payment intent exists** - Prevents fake orderCodes
2. ✅ **Queries PayOS API directly** - Trusts PayOS, not URL params
3. ✅ **Atomic database updates** - Uses MongoDB transactions
4. ✅ **Prevents duplicate updates** - Checks if payment already processed
5. ✅ **Comprehensive logging** - Full audit trail

---

## 📊 Comparison

| Feature         | Old (Polling)   | New (Verify API)   |
| --------------- | --------------- | ------------------ |
| **Requests**    | 20 API calls    | 1 API call         |
| **Time**        | 40 seconds      | 2 seconds          |
| **Reliability** | Timeout issues  | Direct PayOS query |
| **UX**          | Spinner for 40s | Immediate result   |
| **Server Load** | High            | Low                |

---

## ❓ FAQ

### Q: Do I still need webhook?

**A**: Webhook is still useful for redundancy, but verification API is the primary method for local development.

### Q: What if user closes browser before calling verify?

**A**: Webhook will still update the booking (if ngrok is setup). Or user can return later and call verify again.

### Q: Can I call verify multiple times?

**A**: Yes! It's idempotent - safe to call multiple times. It will return current status.

### Q: What if PayOS API is down?

**A**: API returns 502 error. Frontend should show error and allow retry.

---

## 🚀 Next Steps

1. **Update Frontend**:
   - Add `verifyPayOSPayment` to `payment.api.tsx`
   - Replace polling in `/payos/return.tsx` with single verify call
2. **Test Complete Flow**:

   - Create booking → Approve → PayOS → Verify → Success ✅

3. **Deploy** (Optional):
   - Deploy to production for real webhook testing
   - Or use ngrok for local webhook testing

---

## 📝 Files Modified

- ✅ `src/controllers/payos.controller.js` - Added `verifyPayment` function
- ✅ `src/routes/payos.routes.js` - Added `/api/payos/verify-payment` route
- ✅ Server restarted - Endpoint ready to use!

---

**Ready to test!** 🎉

Contact Backend Team if you have questions or need help with integration.
