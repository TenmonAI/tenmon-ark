CREATE TABLE `coDevHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestType` enum('improvement','bug_fix','feature_request','emergency') NOT NULL,
	`requestDescription` text NOT NULL,
	`requestContext` text NOT NULL,
	`manusResponse` text,
	`status` enum('pending','in_progress','completed','failed') NOT NULL DEFAULT 'pending',
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coDevHistory_id` PRIMARY KEY(`id`)
);
