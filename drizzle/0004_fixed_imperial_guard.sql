CREATE TABLE `editResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`taskId` int NOT NULL,
	`resultType` enum('cut_points','subtitles','bgm','narration') NOT NULL,
	`data` text NOT NULL,
	`s3Key` varchar(500),
	`s3Url` varchar(1000),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `editResults_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `editTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`analysisId` int NOT NULL,
	`taskType` enum('auto_cut','auto_subtitle','auto_bgm','auto_narration') NOT NULL,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`parameters` text,
	`result` text,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `editTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kotodamaAnalysis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`transcriptionId` int NOT NULL,
	`center` text,
	`fire` text,
	`water` text,
	`spiral` text,
	`rhythm` text,
	`kotodama` text,
	`sequence` text,
	`breathPoints` text,
	`storyStructure` text,
	`energyBalance` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `kotodamaAnalysis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `processingQueue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`queueType` enum('transcription','analysis','edit','render') NOT NULL,
	`priority` int NOT NULL DEFAULT 5,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`retryCount` int NOT NULL DEFAULT 0,
	`maxRetries` int NOT NULL DEFAULT 3,
	`errorMessage` text,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `processingQueue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transcriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`language` varchar(10),
	`rawText` text NOT NULL,
	`segments` text NOT NULL,
	`refinedText` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transcriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `videoFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`fileType` enum('original','audio','processed') NOT NULL,
	`s3Key` varchar(500) NOT NULL,
	`s3Url` varchar(1000) NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`duration` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `videoFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `videoProjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`sourceType` enum('upload','youtube','vimeo') NOT NULL,
	`sourceUrl` varchar(1000),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `videoProjects_id` PRIMARY KEY(`id`)
);
