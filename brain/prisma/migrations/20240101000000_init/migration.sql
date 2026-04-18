CREATE TABLE "YoutubeToken" (
    "id"           SERIAL       NOT NULL,
    "accessToken"  TEXT         NOT NULL,
    "refreshToken" TEXT,
    "scope"        TEXT,
    "tokenType"    TEXT,
    "expiryDate"   BIGINT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YoutubeToken_pkey" PRIMARY KEY ("id")
);
