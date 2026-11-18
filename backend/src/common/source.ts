/** Where a piece of content comes from: typed in the admin, or synced from GitHub. */
export const CONTENT_SOURCES = ['manual', 'github'] as const;
export type ContentSource = (typeof CONTENT_SOURCES)[number];
