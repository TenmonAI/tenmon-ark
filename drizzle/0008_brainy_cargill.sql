CREATE TABLE `selfHealRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`errorType` enum('runtime','logic','data','integration','performance') NOT NULL,
	`errorMessage` text NOT NULL,
	`errorStack` text,
	`context` text NOT NULL,
	`repairAttempts` int NOT NULL DEFAULT 0,
	`repairStatus` enum('pending','in_progress','success','failed','manus_requested') NOT NULL DEFAULT 'pending',
	`repairActions` text,
	`manusHelpRequested` int NOT NULL DEFAULT 0,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `selfHealRecords_id` PRIMARY KEY(`id`)
);
