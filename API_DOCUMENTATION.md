# API Documentation

## Base URL

**Development:**
- Local: `http://localhost:3000/api`
- Android Emulator: `http://10.0.2.2:3000/api`
- Real Device: `http://YOUR_IP:3000/api`

**Production:**
- `https://your-backend-url.com/api`

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### POST /api/auth/register

Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com"
  }
}
```

**Error Responses:**
- `400`: Invalid input
- `409`: Email already exists
- `500`: Server error

---

### POST /api/auth/login

Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com"
  }
}
```

**Error Responses:**
- `400`: Email and password required
- `401`: Invalid credentials
- `500`: Server error

---

### GET /api/auth/me

Get current user information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com"
  }
}
```

**Error Responses:**
- `401`: Missing or invalid token

---

## Expense Endpoints

### GET /api/expenses

Get all expenses for the current user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "expenses": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "userId": "507f1f77bcf86cd799439011",
      "amount": 120.50,
      "category": "Food",
      "date": "2025-11-15T08:00:00.000Z",
      "location": {
        "lat": 22.468385,
        "lng": 114.002064
      },
      "locationName": "Starbucks, Central",
      "note": "Morning coffee",
      "receiptImage": "data:image/jpeg;base64,...",
      "createdAt": "2025-11-15T08:00:00.000Z",
      "updatedAt": "2025-11-15T08:00:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `401`: Unauthorized
- `500`: Server error

---

### POST /api/expenses

Create a new expense.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 120.50,
  "category": "Food",
  "date": "2025-11-15T08:00:00.000Z",
  "location": {
    "lat": 22.468385,
    "lng": 114.002064
  },
  "locationName": "Starbucks, Central",
  "note": "Morning coffee",
  "receiptImage": "data:image/jpeg;base64,..."
}
```

**Response (201):**
```json
{
  "expense": {
    "_id": "507f1f77bcf86cd799439012",
    "userId": "507f1f77bcf86cd799439011",
    "amount": 120.50,
    "category": "Food",
    "date": "2025-11-15T08:00:00.000Z",
    "location": {
      "lat": 22.468385,
      "lng": 114.002064
    },
    "locationName": "Starbucks, Central",
    "note": "Morning coffee",
    "receiptImage": "data:image/jpeg;base64,...",
    "createdAt": "2025-11-15T08:00:00.000Z",
    "updatedAt": "2025-11-15T08:00:00.000Z"
  },
  "alert": {
    "type": "budget_warning",
    "category": "Food",
    "percent": 85,
    "spent": 1700,
    "limit": 2000
  }
}
```

**Note:** `alert` is optional and only returned if budget threshold is reached (80% or 100%).

**Error Responses:**
- `400`: Invalid amount or category
- `401`: Unauthorized
- `500`: Server error

---

### PUT /api/expenses/:id

Update an existing expense.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 150.00,
  "category": "Food",
  "note": "Updated note",
  "receiptImage": "data:image/jpeg;base64,..."
}
```

**Response (200):**
```json
{
  "expense": {
    "_id": "507f1f77bcf86cd799439012",
    "amount": 150.00,
    "category": "Food",
    "note": "Updated note",
    ...
  }
}
```

**Error Responses:**
- `400`: Invalid input
- `401`: Unauthorized
- `404`: Expense not found
- `500`: Server error

---

### DELETE /api/expenses/:id

Delete an expense.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "ok": true
}
```

**Error Responses:**
- `401`: Unauthorized
- `404`: Expense not found
- `500`: Server error

---

## Budget Endpoints

### GET /api/budgets

Get all budgets for the current user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "budgets": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "userId": "507f1f77bcf86cd799439011",
      "category": "ALL",
      "limit": 10000,
      "period": "monthly",
      "createdAt": "2025-11-01T00:00:00.000Z",
      "updatedAt": "2025-11-01T00:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439014",
      "userId": "507f1f77bcf86cd799439011",
      "category": "Food",
      "limit": 2000,
      "period": "monthly",
      "createdAt": "2025-11-01T00:00:00.000Z",
      "updatedAt": "2025-11-01T00:00:00.000Z"
    }
  ]
}
```

---

### POST /api/budgets

Create or update a budget.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "category": "Food",
  "limit": 2000,
  "period": "monthly"
}
```

**Response (200):**
```json
{
  "budget": {
    "_id": "507f1f77bcf86cd799439014",
    "userId": "507f1f77bcf86cd799439011",
    "category": "Food",
    "limit": 2000,
    "period": "monthly",
    "createdAt": "2025-11-01T00:00:00.000Z",
    "updatedAt": "2025-11-01T00:00:00.000Z"
  }
}
```

---

### DELETE /api/budgets

Delete a budget.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "category": "Food"
}
```

**Response (200):**
```json
{
  "ok": true
}
```

**Error Responses:**
- `400`: Cannot delete ALL category
- `404`: Budget not found

---

### GET /api/budgets/status

Get budget status (spent vs limit) for current month.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "status": [
    {
      "category": "ALL",
      "limit": 10000,
      "spent": 6000,
      "ratio": 0.6
    },
    {
      "category": "Food",
      "limit": 2000,
      "spent": 1700,
      "ratio": 0.85
    }
  ]
}
```

---

## Forecast Endpoints

### GET /api/forecast

Get monthly spending forecast.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "month": 11,
  "spent": 6000,
  "avgPerDay": 200,
  "forecast": 6000
}
```

---

## Currency Endpoints

### GET /api/currency/rates

Get exchange rates.

**Query Parameters:**
- `base` (optional): Base currency (default: USD)

**Response (200):**
```json
{
  "rates": {
    "USD": 1,
    "HKD": 7.8,
    "CNY": 7.2,
    "EUR": 0.92
  }
}
```

---

### GET /api/currency/convert

Convert currency amount.

**Query Parameters:**
- `amount`: Amount to convert
- `from`: Source currency
- `to`: Target currency

**Response (200):**
```json
{
  "amount": 100,
  "from": "USD",
  "to": "HKD",
  "converted": 780
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "Error message"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `413`: Payload Too Large
- `500`: Server Error
- `503`: Service Unavailable (Database not available)

---

## Rate Limiting

Currently, there is no rate limiting implemented. For production, consider implementing rate limiting to prevent abuse.

---

## CORS

CORS is enabled for all origins. For production, restrict to specific domains.

---

## Request Size Limits

- JSON body: 50MB (for receipt images)
- URL-encoded: 50MB

---

## Testing with Postman

1. **Register/Login:**
   - POST to `/api/auth/register` or `/api/auth/login`
   - Copy the `token` from response

2. **Use Token:**
   - Add header: `Authorization: Bearer <token>`
   - Make requests to protected endpoints

3. **Example Collection:**
   ```json
   {
     "name": "Finance App API",
     "requests": [
       {
         "name": "Register",
         "method": "POST",
         "url": "http://localhost:3000/api/auth/register",
         "body": {
           "email": "test@example.com",
           "password": "test123"
         }
       }
     ]
   }
   ```

