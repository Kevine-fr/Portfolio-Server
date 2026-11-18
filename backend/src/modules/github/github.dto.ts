import {
  ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min,
} from 'class-validator';

// GitHub logins: alphanumeric + single hyphens, max 39 chars
const GITHUB_LOGIN = /^$|^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const REPO_NAME = /^[\w.-]{1,100}$/;

export class UpdateGithubSettingsDto {
  @IsOptional() @IsString() @Matches(GITHUB_LOGIN, { message: 'Identifiant GitHub invalide' }) username?: string;
  @IsOptional() @IsString() @MaxLength(50) @Matches(/^$|^[a-z0-9][a-z0-9-]*$/i, { message: 'Topic invalide' })
  topic?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(200) @Matches(REPO_NAME, { each: true }) selectedRepos?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(200) @Matches(REPO_NAME, { each: true }) excludedRepos?: string[];
  @IsOptional() @IsBoolean() includeForks?: boolean;
  @IsOptional() @IsBoolean() syncProjects?: boolean;
  @IsOptional() @IsBoolean() syncSkills?: boolean;
  @IsOptional() @IsBoolean() syncProfile?: boolean;
  @IsOptional() @IsString() @Matches(/^$|^[\w.-]{1,100}$/, { message: 'Nom de dépôt invalide' }) profileRepo?: string;
  @IsOptional() @IsInt() @Min(0) @Max(50) minLanguagePercent?: number;
  @IsOptional() @IsBoolean() autoSync?: boolean;
  @IsOptional() @IsInt() @Min(15) @Max(1440) syncIntervalMinutes?: number;
}

export class RepoSelectionDto {
  @IsBoolean() included: boolean;
}

export class ProjectAutoSyncDto {
  @IsBoolean() autoSync: boolean;
}
