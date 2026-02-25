<a id="readme-top"></a>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/github_username/repo_name">
    <img src="./docs/markdown-assets/logo.png" alt="Logo" width="250" height="50">
  </a>

<h3 align="center">Trendtrove Wears</h3>

  <p align="center">
    TrendTroove is a functional and user-friendly B-2-C e-commerce app designed to provide a seamless shopping experience for customers with robust administrative capabilities.
    <br />
    <a href="https://github.com/techemmy/TrendTrove-Wears/blob/main/README.md"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    ·
    <a href="https://trendtrovewears.onrender.com/">Visit website</a>
    ·

  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

TrendTrove Wears is a functional and user-friendly B-2-C e-commerce app designed to provide a seamless shopping experience for customers with robust administrative capabilities. It sells clothing and wears for different categories (Men, Women and Children).
<div>
    <img src="./docs/markdown-assets/product-screenshot.png" alt="Logo">
</div>


## Summary of the features
- Authentication and Authorization: Utilizing Password Auth & OAuth for secure user access control.

- Responsive Front-end: A mobile & desktop responsive front-end interface for effortless customer interaction.

- Product Inventory: Browse and add a wide range of clothing and wear items to your cart.

- Efficient Search: Search functionality for finding products quickly and easily.

- Pagination: Smooth navigation through product listings with pagination.

- Advanced Filters: Refine your product search by categories, price range, size, and the latest arrivals

- Sorting Options: Sort products alphabetically (descending or ascending), and by price (high to low or low to high).

- Shopping Cart: Conveniently manage items you wish to purchase.

- Seamless Checkout: Streamlined checkout process for a hassle-free buying experience.

- Coupon Discounts: Apply coupons to enjoy discounts on your cart total

- Payment Integration: Secure Stripe payment integration to complete your purchase

- User Profiles: Personalized profiles for customers to track order history, save shipping details, and manage preferences.

- Admin Interface: An intuitive admin panel to manage orders, product listings and coupons effortlessly (view, add, modify, and delete).

- Wishlist: Giving users the option to add items to a wishlist for future purchases can encourage repeat visits and purchases.

- Email Notification System: Admin users get mailed whenever there's a successful payment. Customers and admin users get mailed an invoice after their order gets processed by the admin.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



## Auth Service Split (Kubernetes)

This repo now supports running auth as a separate service with shared sessions. The main app keeps using server-side sessions, and the auth service handles `/auth/*` routes.

### Environment variables (both services)
- `SESSION_SECRET` must be identical in both services.
- `MONGO_URI` must point to the same MongoDB instance (shared session store).
- `APP_DOMAIN` should be your external site URL (used by Stripe and emails).
- `GOOGLE_CALLBACK_URL` should be `https://<your-domain>/auth/google/callback`.

Optional cookie settings (recommended for production ingress):
- `SESSION_COOKIE_SECURE=true`
- `SESSION_COOKIE_DOMAIN=<your-domain>`
- `SESSION_COOKIE_SAME_SITE=lax` (or `none` if you must support cross-site flows)

### Main app only
- `AUTH_SERVICE_URL` should be your external site base URL (same domain as the app), for example `https://your-domain.com`.

### Docker builds
From repo root:
```sh
# Main app
docker build -t trendtrove-app .

# Auth service
docker build -f "micro services/auth service/Dockerfile" -t trendtrove-auth .
```

### Ingress routing (example)
Route `/auth` to the auth service and everything else to the main app:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: trendtrove
spec:
  rules:
    - host: your-domain.com
      http:
        paths:
          - path: /auth
            pathType: Prefix
            backend:
              service:
                name: auth-service
                port:
                  number: 3000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app-service
                port:
                  number: 3000
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Product Service Split (Kubernetes)

Product catalog and search can run as a separate service. The main app forwards `/products/*` to it when `PRODUCT_SERVICE_URL` is set.

### Environment variables
- Same core env as the main app (Postgres, Mongo for sessions, Stripe, OAuth, mailer).
- Main app only: `PRODUCT_SERVICE_URL` set to your external site base URL, for example `https://your-domain.com`.

### Docker builds
```sh
# Product service
docker build -f "micro services/product service/Dockerfile" -t trendtrove-product .
docker push <registry>/trendtrove-product:latest
```

### Ingress routing (example)
Route `/auth` to auth service, `/products` to product service, and everything else to the main app:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: trendtrove
spec:
  rules:
    - host: your-domain.com
      http:
        paths:
          - path: /auth
            pathType: Prefix
            backend:
              service:
                name: auth-service
                port:
                  number: 3000
          - path: /products
            pathType: Prefix
            backend:
              service:
                name: product-service
                port:
                  number: 3000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app-service
                port:
                  number: 3000
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

- ![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
- ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
- ![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
- ![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
- ![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
- ![Sequelize](https://img.shields.io/badge/Sequelize-52B0E7?style=for-the-badge&logo=Sequelize&logoColor=white)
- ![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
- ![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
- ![Bootstrap](https://img.shields.io/badge/bootstrap-%238511FA.svg?style=for-the-badge&logo=bootstrap&logoColor=white)
- ![Nodemon](https://img.shields.io/badge/NODEMON-%23323330.svg?style=for-the-badge&logo=nodemon&logoColor=%BBDEAD)
- ![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=for-the-badge&logo=eslint&logoColor=white)


<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started

This section will guide you on how to get the app running on your local machine

### Prerequisites

Here's a list of all the softwares you need to install
- [NodeJs v18](https://nodejs.org/dist/v18.16.0/) for running app
- [PostgreSQL](https://www.postgresql.org/download/) for the database

To use the enable the mailer system, make sure you create an App password on google and update the `MAILER_USER` with your email and `MAILER_PASSWORD` with the new app's password.


### Installation
1. Clone the repo
   ```sh
   https://github.com/techemmy/TrendTrove-Wears.git
   ```
2. Enter the project directory
    ```sh
    cd Trendtrove-Wears
    ```
3. Copy the `.example.env` file into `.env` fill it appropriately
    ```sh
    cp .example.env .env
    ```
4. Install NPM packages
   ```sh
   npm install
   ```
5. Make sure you have your PostgreSQL server running
6. Start the development server
   ```js
   npm run dev
   ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTACT -->
## Contact

Emmanuel Oloyede - [@itechemmy](https://twitter.com/@itechemmy) - emmanueltopea@gmail.com

Project Link: [https://github.com/techemmy/trendTrove-Wears/](https://github.com/techemmy/trendTrove-Wears/)


<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- KUBERNETES SETUP -->
## Kubernetes Setup Guide

This guide describes how to deploy the app, auth, product, cart, and mail services to a Kubernetes cluster.

### 1) Build and push images
Build from repo root and push to your registry (Docker Hub, GHCR, etc.).
```sh
# Main app image
docker build -t <registry>/trendtrove-app:latest .
docker push <registry>/trendtrove-app:latest

# Auth service image
docker build -f "micro services/auth service/Dockerfile" -t <registry>/trendtrove-auth:latest .
docker push <registry>/trendtrove-auth:latest

# Product service image
docker build -f "micro services/product service/Dockerfile" -t <registry>/trendtrove-product:latest .
docker push <registry>/trendtrove-product:latest

# Cart service image
docker build -f "micro services/cart service/Dockerfile" -t <registry>/trendtrove-cart:latest .
docker push <registry>/trendtrove-cart:latest

# Mail service image
docker build -f "micro services/mail service/Dockerfile" -t <registry>/trendtrove-mail:latest .
docker push <registry>/trendtrove-mail:latest
```

### 2) Create Secrets and Config
Create secrets for DB credentials, OAuth, and mailer values.
```sh
kubectl create secret generic trendtrove-secrets \
  --from-literal=SESSION_SECRET=change_me \
  --from-literal=DATABASE_URL=postgres://postgres:12345678@postgres:5432/ecommerce_dev \
  --from-literal=MONGO_URI=mongodb://mongodb:27017/ecommerce_dev \
  --from-literal=STRIPE_API_KEY=sk_test_xxx \
  --from-literal=GOOGLE_CLIENT_ID=xxx \
  --from-literal=GOOGLE_CLIENT_SECRET=xxx \
  --from-literal=MAILER_USER=you@example.com \
  --from-literal=MAILER_PASSWORD=app_password
```

Optional cookie settings for production ingress:
```sh
kubectl create configmap trendtrove-config \
  --from-literal=NODE_ENV=production \
  --from-literal=APP_DOMAIN=https://your-domain.com \
  --from-literal=GOOGLE_CALLBACK_URL=https://your-domain.com/auth/google/callback \
  --from-literal=SESSION_COOKIE_SECURE=true \
  --from-literal=SESSION_COOKIE_DOMAIN=your-domain.com \
  --from-literal=SESSION_COOKIE_SAME_SITE=lax
```

### 3) Deploy databases (example)
If you already have managed Postgres/MongoDB, skip this. Otherwise, create basic deployments/services or use Helm charts.

### 4) Deploy the app, auth, product, cart, and mail services
Create five deployments and services. Example (replace image names):
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trendtrove-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: trendtrove-app
  template:
    metadata:
      labels:
        app: trendtrove-app
    spec:
      containers:
        - name: app
          image: <registry>/trendtrove-app:latest
          ports:
            - containerPort: 3000
          envFrom:
            - secretRef:
                name: trendtrove-secrets
            - configMapRef:
                name: trendtrove-config
          env:
            - name: AUTH_SERVICE_URL
              value: https://your-domain.com
            - name: PRODUCT_SERVICE_URL
              value: https://your-domain.com
            - name: CART_SERVICE_URL
              value: https://your-domain.com
---
apiVersion: v1
kind: Service
metadata:
  name: app-service
spec:
  selector:
    app: trendtrove-app
  ports:
    - port: 3000
      targetPort: 3000
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trendtrove-auth
spec:
  replicas: 2
  selector:
    matchLabels:
      app: trendtrove-auth
  template:
    metadata:
      labels:
        app: trendtrove-auth
    spec:
      containers:
        - name: auth
          image: <registry>/trendtrove-auth:latest
          ports:
            - containerPort: 3000
          envFrom:
            - secretRef:
                name: trendtrove-secrets
            - configMapRef:
                name: trendtrove-config
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
spec:
  selector:
    app: trendtrove-auth
  ports:
    - port: 3000
      targetPort: 3000
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trendtrove-product
spec:
  replicas: 2
  selector:
    matchLabels:
      app: trendtrove-product
  template:
    metadata:
      labels:
        app: trendtrove-product
    spec:
      containers:
        - name: product
          image: <registry>/trendtrove-product:latest
      ports:
        - containerPort: 3000
      envFrom:
        - secretRef:
            name: trendtrove-secrets
        - configMapRef:
            name: trendtrove-config
---
apiVersion: v1
kind: Service
metadata:
  name: product-service
spec:
  selector:
    app: trendtrove-product
  ports:
    - port: 3000
      targetPort: 3000

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trendtrove-cart
spec:
  replicas: 2
  selector:
    matchLabels:
      app: trendtrove-cart
  template:
    metadata:
      labels:
        app: trendtrove-cart
    spec:
      containers:
        - name: cart
          image: <registry>/trendtrove-cart:latest
          ports:
            - containerPort: 3000
          envFrom:
            - secretRef:
                name: trendtrove-secrets
            - configMapRef:
                name: trendtrove-config
---
apiVersion: v1
kind: Service
metadata:
  name: cart-service
spec:
  selector:
    app: trendtrove-cart
  ports:
    - port: 3000
      targetPort: 3000

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trendtrove-mail
spec:
  replicas: 2
  selector:
    matchLabels:
      app: trendtrove-mail
  template:
    metadata:
      labels:
        app: trendtrove-mail
    spec:
      containers:
        - name: mail
          image: <registry>/trendtrove-mail:latest
          ports:
            - containerPort: 3000
          envFrom:
            - secretRef:
                name: trendtrove-secrets
            - configMapRef:
                name: trendtrove-config
---
apiVersion: v1
kind: Service
metadata:
  name: mail-service
spec:
  selector:
    app: trendtrove-mail
  ports:
    - port: 3000
      targetPort: 3000
```

## Cart / Orders Service Split (Kubernetes)

Cart, checkout, and order state handling can run as a separate service. The main app forwards `/cart/*` to it when `CART_SERVICE_URL` is set.

### Environment variables
- Same core env as the main app (Postgres, Mongo for sessions, Stripe, OAuth, mailer).
- Main app only: `CART_SERVICE_URL` set to your external site base URL, for example `https://your-domain.com`.

### Docker builds
```sh
# Cart service
docker build -f "micro services/cart service/Dockerfile" -t trendtrove-cart .
docker push <registry>/trendtrove-cart:latest
```

### Ingress routing (example)
Route `/auth` to auth service, `/products` to product service, `/cart` to cart service, and everything else to the main app:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: trendtrove
spec:
  rules:
    - host: your-domain.com
      http:
        paths:
          - path: /auth
            pathType: Prefix
            backend:
              service:
                name: auth-service
                port:
                  number: 3000
          - path: /products
            pathType: Prefix
            backend:
              service:
                name: product-service
                port:
                  number: 3000
          - path: /cart
            pathType: Prefix
            backend:
              service:
                name: cart-service
                port:
                  number: 3000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app-service
                port:
                  number: 3000
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Mail / Notification Service Split (Kubernetes)

Email sending can run as a separate service. The main app proxies all emails to it when `MAIL_SERVICE_URL` is set.

### Environment variables
- Same mailer env as the main app: `MAILER_USER`, `MAILER_PASSWORD`.
- Main app only: `MAIL_SERVICE_URL` should point to the mail service DNS inside the cluster, for example `http://mail-service:3000`.

### Docker builds
```sh
# Mail service
docker build -f "micro services/mail service/Dockerfile" -t trendtrove-mail .
docker push <registry>/trendtrove-mail:latest
```

### Routing
No ingress path needed; the main app calls the mail service over the cluster network.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### 5) Ingress routing
Route `/auth` to the auth service, `/products` to the product service, `/cart` to the cart service, and everything else to the main app.
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: trendtrove
spec:
  rules:
    - host: your-domain.com
      http:
        paths:
          - path: /auth
            pathType: Prefix
            backend:
              service:
                name: auth-service
                port:
                  number: 3000
          - path: /products
            pathType: Prefix
            backend:
              service:
                name: product-service
                port:
                  number: 3000
          - path: /cart
            pathType: Prefix
            backend:
              service:
                name: cart-service
                port:
                  number: 3000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app-service
                port:
                  number: 3000
```

### 6) Apply manifests
```sh
kubectl apply -f k8deploy/
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>
