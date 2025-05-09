import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const announcementModel = sqliteTable("announcementmodel", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),

  date: integer("date", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  announcement: text("announcement", {
    length: 128,
  }).notNull()
});

export default announcementModel;
