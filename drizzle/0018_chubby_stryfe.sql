CREATE TABLE `billingHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`subscriptionId` int,
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'JPY',
	`stripePaymentIntentId` varchar(255),
	`stripeInvoiceId` varchar(255),
	`status` enum('pending','succeeded','failed','refunded') NOT NULL,
	`description` text,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `billingHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `plans` MODIFY COLUMN `name` enum('free','basic','pro','founder') NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` MODIFY COLUMN `features` text;--> statement-breakpoint
ALTER TABLE `subscriptions` MODIFY COLUMN `planName` enum('free','basic','pro','founder') NOT NULL DEFAULT 'free';--> statement-breakpoint
ALTER TABLE `subscriptions` MODIFY COLUMN `status` enum('active','canceled','past_due','trialing','expired') NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `plans` ADD `description` text;--> statement-breakpoint
ALTER TABLE `plans` ADD `billingCycle` enum('monthly','yearly','lifetime') DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `maxFileUploads` int DEFAULT -1 NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `maxFileStorageBytes` bigint DEFAULT -1 NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `maxConversations` int DEFAULT -1 NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `maxMemoryItems` int DEFAULT -1 NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `canUseFileUpload` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `canUseMemorySave` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `canUseKnowledgeEngine` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `canUseULCE` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `canUseArkBrowser` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `canUseMT5Trading` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `canUseFounderFeatures` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `responseSpeedMultiplier` int DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `thinkingDepthLevel` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `twinCoreAnalysisDepth` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `isActive` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `sortOrder` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `planId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `stripePaymentIntentId` varchar(255);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `canceledAt` timestamp;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `currentFileUploads` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `currentFileStorageBytes` bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `currentConversations` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `currentMemoryItems` int DEFAULT 0 NOT NULL;