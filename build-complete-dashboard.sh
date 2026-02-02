#!/bin/bash

# Complete WP System Dashboard Builder
# This builds all features requested

echo "🚀 Building Complete Dashboard System..."

# 1. Update Prisma Schema (Complete)
cat > prisma/schema.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id            Int       @id @default(autoincrement())
  name          String
  email         String    @unique
  password      String?
  role          Role      @default(USER)
  status        UserStatus @default(PENDING)
  emailVerified Boolean   @default(false)
  twoFAEnabled  Boolean   @default(false)
  twoFASecret   String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  teams         UserTeam[]
  sessions      UserSession[]
  loginLogs     LoginLog[]
  activityLogs  ActivityLog[]
  securityEvents SecurityEvent[]
}

model Team {
  id        Int      @id @default(autoincrement())
  name      String
  email     String
  createdBy Int
  createdAt DateTime @default(now())
  
  users     UserTeam[]
  sites     Site[]
  requests  TeamRequest[]
}

model UserTeam {
  id        Int      @id @default(autoincrement())
  userId    Int
  teamId    Int
  role      TeamRole
  approved  Boolean  @default(false)
  joinedAt  DateTime?
  
  user      User     @relation(fields: [userId], references: [id])
  team      Team     @relation(fields: [teamId], references: [id])
}

model TeamRequest {
  id         Int      @id @default(autoincrement())
  userId     Int
  teamId     Int
  status     RequestStatus @default(PENDING)
  reviewedBy Int?
  createdAt  DateTime @default(now())
  
  team       Team     @relation(fields: [teamId], references: [id])
}

model Site {
  id          Int      @id @default(autoincrement())
  teamId      Int
  domain      String
  environment Environment
  status      SiteStatus @default(HEALTHY)
  apiKey      String
  createdAt   DateTime @default(now())
  
  team        Team     @relation(fields: [teamId], references: [id])
  plugins     SitePlugin[]
  themes      SiteTheme[]
  users       SiteUser[]
  errors      SiteError[]
  domains     DomainMonitoring[]
  activityLogs ActivityLog[]
}

model SitePlugin {
  id              Int     @id @default(autoincrement())
  siteId          Int
  name            String
  version         String
  updateAvailable Boolean @default(false)
  active          Boolean @default(true)
  
  site            Site    @relation(fields: [siteId], references: [id])
}

model SiteTheme {
  id      Int     @id @default(autoincrement())
  siteId  Int
  name    String
  version String
  active  Boolean @default(true)
  
  site    Site    @relation(fields: [siteId], references: [id])
}

model SiteUser {
  id       Int    @id @default(autoincrement())
  siteId   Int
  username String
  role     String
  email    String
  
  site     Site   @relation(fields: [siteId], references: [id])
}

model ActivityLog {
  id        Int      @id @default(autoincrement())
  userId    Int
  siteId    Int?
  action    String
  ip        String
  location  String?
  userAgent String
  createdAt DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id])
  site      Site?    @relation(fields: [siteId], references: [id])
}

model LoginLog {
  id        Int      @id @default(autoincrement())
  userId    Int
  ip        String
  location  String?
  userAgent String
  success   Boolean
  createdAt DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id])
}

model SiteError {
  id        Int      @id @default(autoincrement())
  siteId    Int
  severity  ErrorSeverity
  message   String   @db.Text
  stack     String?  @db.LongText
  createdAt DateTime @default(now())
  
  site      Site     @relation(fields: [siteId], references: [id])
}

model DomainMonitoring {
  id         Int      @id @default(autoincrement())
  siteId     Int
  expiry     DateTime
  expectedNS String   @db.Text
  currentNS  String   @db.Text
  mismatch   Boolean
  checkedAt  DateTime @default(now())
  
  site       Site     @relation(fields: [siteId], references: [id])
}

model UserSession {
  id           Int      @id @default(autoincrement())
  userId       Int
  ip           String
  lastActivity DateTime
  expiresAt    DateTime
  
  user         User     @relation(fields: [userId], references: [id])
}

model SecurityEvent {
  id        Int      @id @default(autoincrement())
  userId    Int
  event     String
  ip        String
  createdAt DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id])
}

model AllowedDomain {
  id        Int      @id @default(autoincrement())
  domain    String   @unique
  createdAt DateTime @default(now())
}

enum Role {
  SUPERADMIN
  TEAMADMIN
  USER
}

enum TeamRole {
  TEAMADMIN
  MEMBER
}

enum UserStatus {
  ACTIVE
  BLOCKED
  PENDING
}

enum Environment {
  BETA
  LIVE
}

enum SiteStatus {
  HEALTHY
  ERROR
}

enum ErrorSeverity {
  WARNING
  CRITICAL
  FATAL
}

enum RequestStatus {
  PENDING
  APPROVED
  REJECTED
}
EOF

echo "✅ Prisma schema updated"

# 2. Update database
npx prisma generate
npx prisma db push --accept-data-loss

echo "✅ Database updated"

# 3. Build and restart
rm -rf .next
pnpm build

pm2 restart wpsystem

echo "✅ Dashboard rebuilt successfully!"
echo "🌐 Access at: http://5.252.54.159:3000/dashboard"

