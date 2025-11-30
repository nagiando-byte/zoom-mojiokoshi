CREATE TABLE `actionItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingId` int NOT NULL,
	`description` text NOT NULL,
	`assignee` text,
	`dueDate` timestamp,
	`priority` enum('low','medium','high') DEFAULT 'medium',
	`status` enum('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `actionItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meetings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`zoomMeetingId` varchar(64) NOT NULL,
	`zoomRecordingId` varchar(64),
	`zoomUuid` varchar(128),
	`topic` text,
	`hostId` varchar(64),
	`hostEmail` varchar(320),
	`startTime` timestamp,
	`duration` int,
	`shareUrl` text,
	`downloadUrl` text,
	`downloadToken` text,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`processingError` text,
	`meetingType` enum('unknown','interview','internal_meeting','client_meeting','one_on_one','training','presentation','other') DEFAULT 'unknown',
	`interviewStage` enum('first','second','final','other'),
	`meetingSubType` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meetings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `minutes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingId` int NOT NULL,
	`summary` text,
	`keyPoints` text,
	`decisions` text,
	`candidateName` text,
	`evaluationPoints` text,
	`recommendation` text,
	`lineMessage` text,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`customPrompt` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `minutes_id` PRIMARY KEY(`id`),
	CONSTRAINT `minutes_meetingId_unique` UNIQUE(`meetingId`)
);
--> statement-breakpoint
CREATE TABLE `promptTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('interview_first','interview_second','regular_meeting','custom') NOT NULL,
	`systemPrompt` text NOT NULL,
	`userPromptTemplate` text NOT NULL,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promptTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transcripts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingId` int NOT NULL,
	`fullText` text NOT NULL,
	`vttContent` text,
	`language` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transcripts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
