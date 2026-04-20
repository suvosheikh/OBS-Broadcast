-- Create the broadcast_items table
CREATE TABLE IF NOT EXISTS broadcast_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  is_visible BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE broadcast_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own items
CREATE POLICY "Users can only see their own items"
  ON broadcast_items
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own items
CREATE POLICY "Users can insert their own items"
  ON broadcast_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own items
CREATE POLICY "Users can update their own items"
  ON broadcast_items
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own items
CREATE POLICY "Users can delete their own items"
  ON broadcast_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- Special Policy for Overlay View: 
-- In a real production app, you might want to use a unique overlay token.
-- For this simplified version, we'll allow public READ if we have a specific user_id filter.
-- Or just allow public read for now if we want it simple for OBS.
-- Let's make it more secure by allowing reading if we have the ID, 
-- but since OBS browser source is a client, we'll need a way to authenticate it.
-- Most OBS overlays use a query param `?user=uuid`.
-- Let's allow public read for `broadcast_items` where it's visible, 
-- but filtering by user_id in the query is the user's responsibility to keep their URL secret.

CREATE POLICY "Allow public read for visible items"
  ON broadcast_items
  FOR SELECT
  USING (is_visible = true);

-- New Table for 16:9 Image Overlay Settings
CREATE TABLE IF NOT EXISTS image_overlays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT,
  location_name TEXT DEFAULT 'Ryans Operations Office',
  footer_heading TEXT DEFAULT 'Our team is actively working to serve you better.',
  footer_description TEXT DEFAULT 'Ensuring faster support & service for customers across Bangladesh.',
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE image_overlays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own image overlays"
  ON image_overlays
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow public read for active image overlays"
  ON image_overlays
  FOR SELECT
  USING (is_active = true);
