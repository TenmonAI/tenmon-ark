CREATE TABLE `lpQaLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question` text NOT NULL,
	`response` text NOT NULL,
	`depth` varchar(50),
	`fireWaterBalance` varchar(50),
	`userId` int,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lpQaLogs_id` PRIMARY KEY(`id`)
);
