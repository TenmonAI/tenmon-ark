CREATE TABLE `presenceThresholdChanges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`thresholdPath` varchar(255) NOT NULL,
	`currentValue` text NOT NULL,
	`proposedValue` text NOT NULL,
	`reason` text NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectedBy` int,
	`rejectedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `presenceThresholdChanges_id` PRIMARY KEY(`id`)
);
