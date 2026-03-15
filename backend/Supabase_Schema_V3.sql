-- Run this snippet in your Supabase SQL Editor to add the Dynamic Employee Profile capabilities!

-- 1. Add jsonb column to support entirely custom unstructured profile attributes
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "customData" JSONB DEFAULT '{}'::jsonb;
