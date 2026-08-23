-- data-table/transaction: required
-- Add geocoded latitude/longitude columns to support proximity search.

alter table "Post"
  add column "latitude" decimal(10, 7),
  add column "longitude" decimal(11, 7);
