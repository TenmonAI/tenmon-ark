CREATE TABLE `conversationModes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`currentMode` enum('general','intermediate','expert') NOT NULL DEFAULT 'general',
	`autoDetect` int NOT NULL DEFAULT 1,
	`cognitiveLevel` int NOT NULL DEFAULT 1,
	`averageSentenceLength` int DEFAULT 0,
	`vocabularyComplexity` int DEFAULT 0,
	`thinkingSpeed` int DEFAULT 50,
	`emotionalStability` int DEFAULT 50,
	`interestDepth` int DEFAULT 0,
	`japaneseProficiency` int DEFAULT 50,
	`complexTopicTolerance` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversationModes_id` PRIMARY KEY(`id`),
	CONSTRAINT `conversationModes_userId_unique` UNIQUE(`userId`)
);
