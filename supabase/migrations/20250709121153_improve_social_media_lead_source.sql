-- Improve Social Media lead source with additional keywords
-- Migration: 20250709121153_improve_social_media_lead_source.sql

-- Update Social Media lead source with more comprehensive keywords
UPDATE lead_sources 
SET keywords = ARRAY['social media', 'facebook', 'instagram', 'linkedin', 'twitter', 'tiktok', 'inquiry', 'interested', 'property', 'house', 'home', 'real estate', 'agent', 'help', 'question', 'information', 'contact', 'message', 'dm', 'direct message']
WHERE name = 'Social Media'; 