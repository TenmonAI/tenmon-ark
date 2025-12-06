CREATE TABLE `gojuon_master` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kana` varchar(10) NOT NULL,
	`romaji` varchar(10) NOT NULL,
	`position` varchar(20) NOT NULL,
	`gyou` varchar(10) NOT NULL,
	`dan` varchar(10) NOT NULL,
	`suika_type` enum('水','火','空','中','正','影','昇','濁') NOT NULL,
	`suika_detail` text,
	`ongi` text NOT NULL,
	`hatsu_you` text,
	`kana_form` text,
	`gikun_examples` text,
	`source_pages` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gojuon_master_id` PRIMARY KEY(`id`),
	CONSTRAINT `gojuon_master_kana_unique` UNIQUE(`kana`)
);
--> statement-breakpoint
CREATE TABLE `kotodama_interpretation` (
	`id` int AUTO_INCREMENT NOT NULL,
	`word` varchar(100) NOT NULL,
	`word_kyuji` varchar(100),
	`interpretation` text NOT NULL,
	`related_kana` text,
	`source_section` varchar(200),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kotodama_interpretation_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kyuji_mapping` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shinji_tai` varchar(10) NOT NULL,
	`kyuji_tai` varchar(10) NOT NULL,
	`category` varchar(50),
	`priority` int DEFAULT 0,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kyuji_mapping_id` PRIMARY KEY(`id`),
	CONSTRAINT `kyuji_mapping_shinji_tai_unique` UNIQUE(`shinji_tai`)
);
--> statement-breakpoint
CREATE TABLE `suika_law` (
	`id` int AUTO_INCREMENT NOT NULL,
	`law_name` varchar(100) NOT NULL,
	`law_type` enum('運動','配置','変化','相互作用') NOT NULL,
	`description` text NOT NULL,
	`diagram` text,
	`related_kana` text,
	`source_section` varchar(200),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suika_law_id` PRIMARY KEY(`id`)
);
