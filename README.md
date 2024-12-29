# Esports Ecosystem Platform

A comprehensive platform for managing esports tournaments and competitions.

## 🚀 Getting Started

These instructions will help you set up the project on your local machine for development purposes.

### Prerequisites

Before you begin, ensure you have the following installed:
- Node.js and npm
- PostgreSQL
- Git

### Environment Setup

1. Clone the repository:
```bash
git clone [your-repository-url]
cd esports-ecosystem
```

2. Install dependencies:
```bash
npm install
```

3. Create two environment files in your root directory:

#### `.env`
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

#### `.env.local`
```env
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
EMAIL_USER=
EMAIL_PASSWORD=
RECIPIENT_EMAIL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### 🔑 Obtaining Credentials

#### 1. PostgreSQL Database URL
1. Download and install [PostgreSQL](https://postgresql.org)
2. Create a new database
3. Format your URL: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
   - Example: `postgresql://postgres:yourpassword@localhost:5432/yourdatabase`

#### 2. Google OAuth Credentials
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth 2.0 Client ID"
5. Select "Web Application"
6. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
7. Save your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

#### 3. NextAuth Secret
Generate a secure random string:
```bash
openssl rand -base64 32
```

#### 4. Gmail App Password
1. Go to your Google Account settings
2. Enable 2-Step Verification
3. Navigate to Security > 2-Step Verification > App passwords
4. Select "Other" from the dropdown
5. Name your app
6. Use the generated 16-character password
   - `EMAIL_USER`: Your Gmail address
   - `EMAIL_PASSWORD`: The generated app password

#### 5. Cloudinary Setup
1. Sign up at [Cloudinary](https://cloudinary.com)
2. Access your dashboard to find:
   - Cloud name (`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`)
   - API Key (`CLOUDINARY_API_KEY`)
   - API Secret (`CLOUDINARY_API_SECRET`)

### ⚙️ Database Setup

Initialize your database with Prisma:
```bash
npx prisma generate
npx prisma db push
```

### 🏃‍♂️ Running the Application

Start the development server:
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

## 🛠️ Built With

- [Next.js](https://nextjs.org/) - The React framework
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Prisma](https://www.prisma.io/) - ORM
- [NextAuth.js](https://next-auth.js.org/) - Authentication
- [Cloudinary](https://cloudinary.com/) - Media management


---
⭐️ If you find this project useful, please consider giving it a star!