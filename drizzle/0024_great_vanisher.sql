CREATE TABLE `customArks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`systemPrompt` text NOT NULL,
	`knowledgeBase` text,
	`isPublic` int NOT NULL DEFAULT 0,
	`shareUrl` varchar(500),
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customArks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `founderFeedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` enum('feature_request','bug_report','improvement') NOT NULL,
	`title` varchar(200) NOT NULL,
	`message` text NOT NULL,
	`status` enum('pending','approved','implemented','rejected') NOT NULL DEFAULT 'pending',
	`adminResponse` text,
	`priority` int NOT NULL DEFAULT 3,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `founderFeedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `plan` enum('free','basic','pro','founder','dev') DEFAULT 'free' NOT NULL;