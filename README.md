# E-Commerce Customer Analytics API

A production-ready RESTful API built with **Node.js, Express, and MongoDB** to ingest, manage, and analyze a dataset of 15,259 customer profiles. The system includes pagination, dynamic query filtering, custom statistics, JWT-based authentication, and multi-stage aggregation pipelines for customer churn and retention analytics.

---

## Technical Stack & Architecture

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose ODM)
- **Security**: JWT-based Authentication, Bcrypt Password Hashing, IP Rate Limiter
- **Structure**: MVC Pattern (Models, Views/Routes, Controllers, Middlewares, Utilities)

---

## Project Folder Structure

```text
customer_churn_dataset/
├── config/
│   └── db.js                   # MongoDB database connection configuration
├── controllers/
│   ├── analytics.controller.js   # Complex MongoDB aggregation pipelines
│   ├── auth.controller.js        # Register, login, logout, verification & OTP handlers
│   ├── customer.controller.js    # CRUD, filtering, segment classification, search
│   └── stats.controller.js       # Quick averages and category count stats
├── middlewares/
│   ├── auth.js                 # JWT verify & Role-Based Access Control (RBAC)
│   ├── errorHandler.js         # Centralized Mongoose/CastError API response mapper
│   ├── logger.js               # Custom console request logger
│   ├── rateLimit.js            # API rate limiter (general and strict auth rules)
│   └── requestTime.js          # Injection of X-Response-Time header
├── models/
│   ├── customer.model.js       # Main customer schema (Analytics metrics & Auth properties)
│   └── revokedToken.model.js   # Revoked JWT token schema with TTL automatic indexes
├── routes/
│   ├── admin.routes.js         # JWT & admin-restricted dashboard endpoints
│   ├── analytics.routes.js     # Grouped analytical endpoints
│   ├── auth.routes.js          # Authentication and credential management
│   ├── customer.routes.js      # Basic CRUD and segment routing
│   ├── jwt.routes.js           # JWT generation, token refresh and revocation
│   ├── middleware.routes.js    # Middleware test endpoints
│   ├── search.routes.js        # Unified keyword/regex search endpoint
│   └── stats.routes.js         # Category distribution and count endpoints
├── utils/
│   ├── asyncHandler.js         # Async middleware exception catcher wrapper
│   ├── filterBuilder.js        # Dynamic MongoDB filter queries builder
│   ├── pagination.js           # Unified page offset validator
│   └── seed.js                 # Batch data mapping & database ingestion script
├── .env                        # Environment configurations (ignored by git)
├── .gitignore                  # System and module git ignore declarations
├── customer-churn-data.json    # Raw customer analytics dataset (15,259 records)
├── package.json                # Project scripts and dependencies
├── server.js                   # Main server startup and middleware pipeline
└── test_endpoints.js           # 51-assertion automated integration test suite
```

---

## API Endpoints

### 1. Authentication (`/auth`)
| Method | Endpoint | Description | Protected |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register a new customer | No |
| `POST` | `/auth/login` | Login and receive JWT tokens | No |
| `POST` | `/auth/logout` | Revoke session and blacklist token | Yes |
| `GET` | `/auth/profile` | Retrieve active user profile | Yes |
| `PATCH` | `/auth/profile` | Update profile fields | Yes |
| `DELETE` | `/auth/profile` | Delete user account | Yes |
| `POST` | `/auth/verify-email` | Validate email using OTP | No |
| `POST` | `/auth/forgot-password`| Request password reset OTP | No |
| `POST` | `/auth/reset-password` | Set new password with OTP | No |

### 2. Customer Collection (`/customers`)
Supports pagination (`page=1&limit=10`), sorting (`sort=lifetimeValue`), and filtering (e.g. `?country=France&gender=Male`).
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/customers` | Fetch all customer records |
| `GET` | `/customers/:id` | Fetch single customer record by ID |
| `POST` | `/customers` | Add a new customer record |
| `PUT` | `/customers/:id` | Replace complete customer record |
| `PATCH` | `/customers/:id` | Update specific customer fields |
| `DELETE` | `/customers/:id` | Remove customer record |
| `GET` | `/customers/exists/:id`| Check whether a customer exists |
| `POST` | `/customers/bulk-create`| Insert multiple customer records |
| `PATCH` | `/customers/bulk-update`| Update multiple customer records |
| `DELETE` | `/customers/bulk-delete`| Delete multiple customer records |

### 3. Customer Info Filters (`/customers/...`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/customers/country/:country` | Filter customers by country |
| `GET` | `/customers/city/:city` | Filter customers by city |
| `GET` | `/customers/gender/:gender` | Filter customers by gender |
| `GET` | `/customers/age/:age` | Filter customers by exact age |
| `GET` | `/customers/signup-quarter/:quarter` | Filter by signup quarter |
| `GET` | `/customers/churn-status/:status` | Filter by churn status |
| `GET` | `/customers/lifetime/:value` | Fetch customers with LTV >= value |
| `GET` | `/customers/purchases/:value` | Fetch customers with purchases >= value |

### 4. Search Routes (`/search`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/search/customers?q=france` | Case-insensitive regex search or special keyword resolution (e.g. `high-value`, `loyal`, `inactive`, `premium`) |

### 5. Stats Routes (`/stats`)
Quick statistics and averages.
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/stats/customers/count` | Total customer count |
| `GET` | `/stats/customers/average-age` | Average age of customer base |
| `GET` | `/stats/customers/average-lifetime` | Average lifetime value |
| `GET` | `/stats/customers/highest-purchases` | Customer profile with most purchases |
| `GET` | `/stats/customers/country-count` | Customer distribution by country |

### 6. Analytics Routes (`/analytics`)
Multi-stage aggregation pipeline results.
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/analytics/customers/churn-analysis` | Aggregate churn statistics and risk |
| `GET` | `/analytics/customers/retention` | Retention trends by membership tiers |
| `GET` | `/analytics/customers/session-analysis` | Session activity & abandonment rate splits |
| `GET` | `/analytics/customers/country-analysis` | LTV & Churn metrics by country |

---

## Verification & Testing
Our automated integration test suite covers **51 test assertions** checking:
- Response timings and metadata headers
- Database queries, pagination, and sorting logic
- Registration, OTP generation, token verification, token blacklisting, and profile deletion
- Global error interceptors mapping CastErrors and ValidationErrors

All tests have been run and passed successfully.
