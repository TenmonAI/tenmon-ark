CREATE TABLE `embeds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`uniqueId` varchar(64) NOT NULL,
	`type` enum('chat','qa') NOT NULL DEFAULT 'chat',
	`config` text,
	`theme` enum('dark','light') NOT NULL DEFAULT 'dark',
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `embeds_id` PRIMARY KEY(`id`),
	CONSTRAINT `embeds_uniqueId_unique` UNIQUE(`uniqueId`)
);
