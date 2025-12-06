CREATE TABLE `selfEvolutionRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`evolutionType` enum('behavior_learning','response_improvement','soul_sync','preference_adaptation') NOT NULL,
	`description` text NOT NULL,
	`beforeState` text NOT NULL,
	`afterState` text NOT NULL,
	`improvementMetrics` text,
	`status` enum('active','rolled_back') NOT NULL DEFAULT 'active',
	`rolledBackAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `selfEvolutionRecords_id` PRIMARY KEY(`id`)
);
