CREATE TABLE `crawledSites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`siteId` varchar(100) NOT NULL,
	`siteUrl` varchar(1000) NOT NULL,
	`siteName` varchar(500),
	`siteDescription` text,
	`crawlDepth` int NOT NULL DEFAULT 3,
	`maxPages` int NOT NULL DEFAULT 100,
	`status` enum('pending','crawling','completed','failed') NOT NULL DEFAULT 'pending',
	`lastCrawledAt` timestamp,
	`totalPages` int NOT NULL DEFAULT 0,
	`totalErrors` int NOT NULL DEFAULT 0,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crawledSites_id` PRIMARY KEY(`id`),
	CONSTRAINT `crawledSites_siteId_unique` UNIQUE(`siteId`)
);
--> statement-breakpoint
CREATE TABLE `siteMemories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`siteId` varchar(100) NOT NULL,
	`category` enum('serviceSummary','priceList','features','worldview','faq','flow','caution','metadata','other') NOT NULL,
	`title` varchar(500),
	`content` text NOT NULL,
	`structuredData` text,
	`sourcePageId` int,
	`sourceUrl` varchar(1000),
	`priority` int NOT NULL DEFAULT 5,
	`keywords` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `siteMemories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sitePages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`siteId` varchar(100) NOT NULL,
	`url` varchar(1000) NOT NULL,
	`title` varchar(500),
	`description` text,
	`htmlContent` text,
	`textContent` text,
	`headings` text,
	`links` text,
	`images` text,
	`metadata` text,
	`statusCode` int NOT NULL DEFAULT 200,
	`crawledAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sitePages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `siteQAHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`siteId` varchar(100) NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`referencedMemoryIds` text,
	`rating` int,
	`feedback` text,
	`sessionId` varchar(100),
	`ipAddress` varchar(50),
	`userAgent` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `siteQAHistory_id` PRIMARY KEY(`id`)
);
