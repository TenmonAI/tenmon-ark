CREATE TABLE `personaModeSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`mode` enum('turbo','normal','quality') NOT NULL DEFAULT 'turbo',
	`momentum` int NOT NULL DEFAULT 15,
	`chunkInterval` int NOT NULL DEFAULT 5,
	`depth` enum('surface-wide','middle','deep') NOT NULL DEFAULT 'surface-wide',
	`guidanceEnabled` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `personaModeSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `personaModeSettings_userId_unique` UNIQUE(`userId`)
);
