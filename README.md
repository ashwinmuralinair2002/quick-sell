# QuickSell - Second-Hand Electronics Marketplace

QuickSell is a full-stack marketplace application for buying and selling pre-owned electronic devices. Users can browse products, create listings, manage shopping carts, and place orders through a single platform.

## Features

### User Authentication
- User registration and login.
- JWT-based authentication.
- Access and refresh token management.
- HTTP-only cookies for refresh-token storage.
- Protected routes and authenticated API endpoints.

### Marketplace
- Browse available electronics listings.
- Search products by keywords.
- Filter products by category and price range.
- Sort listings by price and date.
- Paginated product listings.
- View individual product details.

### Seller Features
- Create new product listings.
- Upload multiple product images.
- Edit existing listings.
- Delete product listings.
- View and manage personal listings.
- Track available and sold products.
- View sales information.

### Shopping and Orders
- Add products to the shopping cart.
- Remove products from the cart.
- Manage delivery addresses.
- Review order details during checkout.
- Calculate subtotal and GST.
- Place orders and view order information.
- Automatically update purchased listings as sold.

## Technology Stack

### Frontend
- React 19
- TypeScript
- Vite
- Redux Toolkit
- React Redux
- React Router DOM
- Axios
- React Hook Form
- Bootstrap 5

### Backend
- Node.js
- Express 5
- TypeScript
- MongoDB
- Mongoose
- JSON Web Tokens (JWT)
- bcrypt
- Cloudinary
- Multer
- Express Validator

## Project Structure

```text
quick-sell/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── server.ts
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── store/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
│
└── README.md
```

## Getting Started

### Prerequisites

- Node.js
- npm
- MongoDB database
- Cloudinary account

### 1. Clone the repository

```bash
git clone https://github.com/ashwinmuralinair2002/quick-sell.git
cd quick-sell
```

### 2. Configure the Backend

Navigate to the backend directory:

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` directory:

```env
PORT=5000
CLIENT_URL=http://localhost:5173

MONGODB_URI=your_mongodb_connection_string

JWT_ACCESS_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

Start the backend development server:

```bash
npm run dev
```

### 3. Configure the Frontend

Open another terminal and navigate to the frontend directory:

```bash
cd quick-sell/frontend
npm install
```

Start the frontend development server:

```bash
npm run dev
```

The frontend will be available at:

```text
http://localhost:5173
```

The backend runs on:

```text
http://localhost:5000
```

## Available Scripts

### Frontend

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the production frontend |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

### Backend

| Command | Description |
|---|---|
| `npm run dev` | Start the backend using TSX watch mode |
| `npm run build` | Compile TypeScript |
| `npm start` | Start the compiled backend |

## Database

QuickSell uses MongoDB to store user accounts, product listings, shopping carts, delivery addresses, and order information.

Mongoose is used for database schemas and data operations.

## Image Storage

Cloudinary is used to upload and manage product images.

## Authentication and Security

- Password hashing using bcrypt.
- JWT-based access authentication.
- Refresh tokens stored in HTTP-only cookies.
- Refresh-token rotation.
- Protected API routes.
- Ownership validation for product operations.

## Author

**Ashwin Murali Nair**

[GitHub Profile](https://github.com/ashwinmuralinair2002)

---

Developed as a full-stack marketplace project while learning the MERN stack.
