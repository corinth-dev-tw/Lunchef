# Lunchef - B2B Lunch Ordering Platform

A LINE Mini App for B2B lunch ordering, targeting company secretaries who place bulk orders from department store restaurants.

## Architecture

- **Frontend**: LINE Mini App (React + Vite + TypeScript + Tailwind CSS)
- **Backend**: Cloudflare Workers (Hono framework)
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV
- **Storage**: Cloudflare R2 (for menu images)
- **Notifications**: LINE Bot API (Flex Messages)

## Project Structure

```
lunchef/
├── backend/          # Cloudflare Workers API
├── frontend/         # LINE Mini App (Customer)
├── dashboard/        # Restaurant Dashboard
└── database/         # D1 Schema & Migrations
```

## Setup Instructions

### 1. Backend Setup

```bash
cd backend
npm install

# Configure wrangler.toml with your D1 database ID and KV namespace ID
# Deploy database schema
wrangler d1 create lunchef-db
wrangler d1 execute lunchef-db --file=../database/schema.sql

# Set secrets
wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
wrangler secret put LINE_CHANNEL_SECRET

# Deploy
wrangler deploy
```

### 2. Frontend Setup (LINE Mini App)

```bash
cd frontend
npm install

# Create .env file
echo "VITE_API_URL=https://your-worker.your-subdomain.workers.dev" > .env
echo "VITE_LIFF_ID=your-liff-id" >> .env

# Run locally
npm run dev

# Deploy to Cloudflare Pages
npm run build
wrangler pages deploy dist
```

### 3. Dashboard Setup

```bash
cd dashboard
npm install

# Create .env file
echo "VITE_API_URL=https://your-worker.your-subdomain.workers.dev" > .env

# Run locally
npm run dev

# Deploy to Cloudflare Pages
npm run build
wrangler pages deploy dist
```

### 4. LINE Mini App Configuration

1. Go to [LINE Developers Console](https://developers.line.biz/console/)
2. Create a new provider
3. Create a LINE MINI App channel
4. Set endpoint URL to your frontend URL
5. Configure LIFF app with your frontend URL

## Features

### Customer Flow
1. Login with LINE
2. Select office building location
3. View available restaurants
4. Browse menu and add items
5. Select pickup time
6. Review and confirm order
7. Track order status

### Restaurant Dashboard
1. Login with restaurant credentials
2. View today's orders
3. Update order status (pending → confirmed → preparing → arrived → completed)
4. Cancel orders with reason
5. Print order details

### Notifications
- LINE Bot notification to restaurant on new order
- LINE Bot notification to customer on status update

## API Endpoints

### Locations
- `GET /api/locations` - List all locations

### Restaurants
- `GET /api/restaurants?location_id={id}` - List restaurants for location
- `GET /api/restaurants/:id` - Get restaurant details

### Menu
- `GET /api/menu?restaurant_id={id}` - List menu items

### Orders
- `GET /api/orders?company_id={id}` - List orders
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create order
- `PUT /api/orders/:id/status` - Update order status

### Dashboard
- `GET /api/dashboard/orders?restaurant_id={id}&date={date}` - List restaurant orders
- `GET /api/dashboard/orders/:id` - Get order details
- `PUT /api/dashboard/orders/:id/status` - Update order status
- `GET /api/dashboard/stats?restaurant_id={id}&date={date}` - Get stats

## Order Status Flow

```
pending → confirmed → preparing → arrived → completed
```

Orders can be cancelled at any time by the restaurant.

## Data Model

- **Locations**: Office buildings (Taipei 101, ATT 4 FUN, etc.)
- **Companies**: B2B clients with tax ID
- **Users**: Company secretaries (linked to LINE account)
- **Restaurants**: Department store vendors
- **Menu Items**: Food items with pricing
- **Orders**: Bulk lunch orders with formatted IDs (LCE-YYYYMMDD-NNN)

## Minimum Order Requirements

Restaurants can configure:
- Minimum items (e.g., 10 items)
- Minimum amount (e.g., $3000)

## Environment Variables

### Backend (Secrets)
- `LINE_CHANNEL_ACCESS_TOKEN` - LINE Bot access token
- `LINE_CHANNEL_SECRET` - LINE Bot channel secret

### Frontend
- `VITE_API_URL` - Backend API URL
- `VITE_LIFF_ID` - LIFF App ID

## License

MIT