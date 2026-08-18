-- data-table/transaction: required
-- Add structured renter-report fields without invalidating legacy Post or Comment rows.

alter table "Post"
  add column "address" text,
  add column "city" text,
  add column "region" text,
  add column "landlordName" text,
  add column "category" text,
  add column "rating" integer,
  add column "experienceConfirmedAt" timestamp(3),
  add column "status" text not null default 'PUBLISHED',
  add constraint "Post_category_check"
    check (
      "category" is null
      or "category" in (
        'MAINTENANCE',
        'RENT_INCREASE',
        'FEES_OR_DEPOSIT',
        'SAFETY',
        'COMMUNICATION',
        'GOOD_EXPERIENCE',
        'OTHER'
      )
    ),
  add constraint "Post_rating_check"
    check ("rating" is null or "rating" between 1 and 5),
  add constraint "Post_status_check"
    check ("status" in ('PUBLISHED', 'HIDDEN'));

create index "Post_public_feed_idx"
  on "Post" ("status", "createdAt" desc, "id" desc);
