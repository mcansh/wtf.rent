import { belongsTo, column as c, hasMany, table } from "remix/data-table"
import type { ColumnBuilder, TableRow } from "remix/data-table"

export const REPORT_CATEGORIES = [
  "MAINTENANCE",
  "RENT_INCREASE",
  "FEES_OR_DEPOSIT",
  "SAFETY",
  "COMMUNICATION",
  "GOOD_EXPERIENCE",
  "OTHER",
] as const

export const REPORT_STATUSES = ["PUBLISHED", "HIDDEN"] as const

function timestamp() {
  // SAFETY: The PostgreSQL driver returns timestamp columns as Date objects.
  return c.timestamp({ precision: 3 }) as ColumnBuilder<Date>
}

export const users = table({
  name: "User",
  columns: {
    id: c.text().notNull().primaryKey(),
    username: c.text().notNull().unique("User_username_key"),
    email: c.text().notNull().unique("User_email_key"),
    password: c.text().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull(),
  },
  timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  beforeWrite({ operation, value }) {
    if (operation === "create" && value.id === undefined) {
      return { value: { ...value, id: crypto.randomUUID() } }
    }

    return { value }
  },
})

export const posts = table({
  name: "Post",
  columns: {
    id: c.text().notNull().primaryKey(),
    title: c.text().notNull(),
    content: c.text().notNull(),
    address: c.text().nullable(),
    city: c.text().nullable(),
    region: c.text().nullable(),
    landlordName: c.text().nullable(),
    category: c.enum(REPORT_CATEGORIES).nullable(),
    rating: c.integer().nullable().check('"rating" between 1 and 5', "Post_rating_check"),
    latitude: c.decimal(10, 7).nullable(),
    longitude: c.decimal(11, 7).nullable(),
    experienceConfirmedAt: timestamp().nullable(),
    status: c.enum(REPORT_STATUSES).notNull().default("PUBLISHED"),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull(),
    authorId: c
      .text()
      .notNull()
      .references("User", "id", "Post_authorId_fkey")
      .onDelete("restrict")
      .onUpdate("cascade"),
  },
  timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  beforeWrite({ operation, value }) {
    if (operation === "create" && value.id === undefined) {
      return { value: { ...value, id: crypto.randomUUID() } }
    }

    return { value }
  },
})

export const comments = table({
  name: "Comment",
  columns: {
    id: c.text().notNull().primaryKey(),
    content: c.text().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp().notNull(),
    authorId: c
      .text()
      .notNull()
      .references("User", "id", "Comment_authorId_fkey")
      .onDelete("restrict")
      .onUpdate("cascade"),
    postId: c
      .text()
      .notNull()
      .references("Post", "id", "Comment_postId_fkey")
      .onDelete("cascade")
      .onUpdate("cascade"),
  },
  timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  beforeWrite({ operation, value }) {
    if (operation === "create" && value.id === undefined) {
      return { value: { ...value, id: crypto.randomUUID() } }
    }

    return { value }
  },
})

export const userPosts = hasMany(users, posts, { foreignKey: "authorId" })
export const userComments = hasMany(users, comments, { foreignKey: "authorId" })
export const postAuthor = belongsTo(posts, users, { foreignKey: "authorId" })
export const postComments = hasMany(posts, comments, { foreignKey: "postId" })
export const commentAuthor = belongsTo(comments, users, { foreignKey: "authorId" })
export const commentPost = belongsTo(comments, posts, { foreignKey: "postId" })

export type User = TableRow<typeof users>
export type Post = TableRow<typeof posts>
export type Comment = TableRow<typeof comments>
