CREATE TABLE `selfBuildPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`goal` text NOT NULL,
	`status` enum('draft','pending_approval','approved','rejected','in_progress','completed','failed') NOT NULL DEFAULT 'draft',
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectedBy` int,
	`rejectedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `selfBuildPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `selfBuildTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`taskType` enum('code_generation','file_creation','module_integration','dependency_resolution') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`inputData` text NOT NULL,
	`outputData` text,
	`status` enum('pending','in_progress','completed','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `selfBuildTasks_id` PRIMARY KEY(`id`)
);
