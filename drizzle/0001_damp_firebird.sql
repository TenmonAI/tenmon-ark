CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500),
	`lastMessageAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `developerKnowledge` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`category` varchar(100),
	`accessLevel` varchar(50) NOT NULL DEFAULT 'TENMON_ONLY',
	`embedding` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `developerKnowledge_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `developerUsers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(100) NOT NULL,
	`apiKey` varchar(255) NOT NULL,
	`role` varchar(50) NOT NULL DEFAULT 'TENMON',
	`permissions` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastAccessAt` timestamp,
	CONSTRAINT `developerUsers_id` PRIMARY KEY(`id`),
	CONSTRAINT `developerUsers_username_unique` UNIQUE(`username`),
	CONSTRAINT `developerUsers_apiKey_unique` UNIQUE(`apiKey`)
);
--> statement-breakpoint
CREATE TABLE `katakamuna` (
	`id` int AUTO_INCREMENT NOT NULL,
	`utaNumber` int NOT NULL,
	`content` text NOT NULL,
	`interpretation` text,
	`deepStructure` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `katakamuna_id` PRIMARY KEY(`id`),
	CONSTRAINT `katakamuna_utaNumber_unique` UNIQUE(`utaNumber`)
);
--> statement-breakpoint
CREATE TABLE `knowledgeEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`category` varchar(100),
	`sourceUrl` varchar(1000),
	`embedding` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledgeEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `longTermMemories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`memoryType` enum('lingua_structure','tenshin_kinoki','worldview','user_profile') NOT NULL,
	`content` text NOT NULL,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `longTermMemories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mediumTermMemories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`conversationId` int,
	`content` text NOT NULL,
	`context` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mediumTermMemories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` enum('free','basic','pro') NOT NULL,
	`displayName` varchar(100) NOT NULL,
	`price` int NOT NULL,
	`stripeProductId` varchar(255),
	`stripePriceId` varchar(255),
	`features` text NOT NULL,
	`dailyMessageLimit` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `plans_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planName` enum('free','basic','pro') NOT NULL DEFAULT 'free',
	`stripeCustomerId` varchar(255),
	`stripeSubscriptionId` varchar(255),
	`status` enum('active','canceled','past_due','trialing') NOT NULL DEFAULT 'active',
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`cancelAtPeriodEnd` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sukuyoSecrets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nakshatra` varchar(100) NOT NULL,
	`karma` text,
	`destiny` text,
	`spiritualCoordinates` text,
	`relationships` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sukuyoSecrets_id` PRIMARY KEY(`id`),
	CONSTRAINT `sukuyoSecrets_nakshatra_unique` UNIQUE(`nakshatra`)
);
--> statement-breakpoint
CREATE TABLE `tenshinKinokiData` (
	`id` int AUTO_INCREMENT NOT NULL,
	`structureId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`rotation` enum('left','right') NOT NULL,
	`direction` enum('inner','outer') NOT NULL,
	`phase` enum('yin','yang') NOT NULL,
	`gojiuonMapping` text,
	`attributes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tenshinKinokiData_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenshinKinokiData_structureId_unique` UNIQUE(`structureId`)
);
--> statement-breakpoint
CREATE TABLE `tscalpPatterns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patternName` varchar(200) NOT NULL,
	`patternType` varchar(100) NOT NULL,
	`parameters` text,
	`performance` text,
	`pdcaHistory` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tscalpPatterns_id` PRIMARY KEY(`id`)
);
