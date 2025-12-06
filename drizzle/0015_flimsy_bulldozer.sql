ALTER TABLE `conversations` ADD `shukuyo` varchar(50);--> statement-breakpoint
ALTER TABLE `conversations` ADD `conversationMode` enum('general','intermediate','expert') DEFAULT 'general' NOT NULL;