CREATE TABLE `amatsuKanagiPatterns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`number` int NOT NULL,
	`sound` varchar(10) NOT NULL,
	`category` varchar(50) NOT NULL,
	`type` varchar(100),
	`pattern` varchar(255) NOT NULL,
	`movements` text NOT NULL,
	`meaning` text,
	`special` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `amatsuKanagiPatterns_id` PRIMARY KEY(`id`),
	CONSTRAINT `amatsuKanagiPatterns_number_unique` UNIQUE(`number`)
);
--> statement-breakpoint
CREATE TABLE `basicMovements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`reading` varchar(100) NOT NULL,
	`direction` varchar(50) NOT NULL,
	`energy` varchar(100) NOT NULL,
	`element` varchar(100) NOT NULL,
	`properties` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `basicMovements_id` PRIMARY KEY(`id`),
	CONSTRAINT `basicMovements_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `irohaInterpretations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`character` varchar(10) NOT NULL,
	`order` int NOT NULL,
	`reading` varchar(100),
	`interpretation` text,
	`lifePrinciple` text,
	`relatedPatterns` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `irohaInterpretations_id` PRIMARY KEY(`id`),
	CONSTRAINT `irohaInterpretations_character_unique` UNIQUE(`character`),
	CONSTRAINT `irohaInterpretations_order_unique` UNIQUE(`order`)
);
