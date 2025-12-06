CREATE TABLE `lpSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`messages` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lpSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `lpSessions_sessionId_unique` UNIQUE(`sessionId`)
);
