-- Migration: Add company_name and tax_id columns to orders table
-- Run this against your production D1 database before deploying the company info feature

ALTER TABLE orders ADD COLUMN company_name TEXT;
ALTER TABLE orders ADD COLUMN tax_id TEXT;
