-- Supabase (PostgreSQL) Schema for Mee Event

-- Enable the uuid-ossp extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: banners
CREATE TABLE IF NOT EXISTS public.banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    image TEXT NOT NULL,
    button_text TEXT NOT NULL,
    button_link TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: categories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    image TEXT NOT NULL,
    icon TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: subcategories
CREATE TABLE IF NOT EXISTS public.subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image TEXT NOT NULL,
    description TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: The `subCategories` List<String> in SubcategoryModel could be a separate one-to-many table 
-- or a simple jsonb/text array if it just holds names.
ALTER TABLE public.subcategories ADD COLUMN IF NOT EXISTS child_categories TEXT[] DEFAULT '{}';

-- Table: announcements
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: vendors
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    image TEXT NOT NULL,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 0.0,
    location TEXT NOT NULL,
    starting_price TEXT NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: trending_services
CREATE TABLE IF NOT EXISTS public.trending_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    image TEXT NOT NULL,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 0.0,
    price TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: reviews
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name TEXT NOT NULL,
    customer_photo TEXT NOT NULL,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 0.0,
    review_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: event_services (Maps to 'Events/{eventId}/subcategories' in Firestore)
CREATE TABLE IF NOT EXISTS public.event_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id TEXT NOT NULL, -- Can map to an events table later if created
    name TEXT NOT NULL,
    image TEXT NOT NULL,
    short_description TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) Policies - Initially allowing public read access for mobile app
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only access." ON public.banners FOR SELECT USING (true);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only access." ON public.categories FOR SELECT USING (true);

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only access." ON public.subcategories FOR SELECT USING (true);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only access." ON public.announcements FOR SELECT USING (true);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only access." ON public.vendors FOR SELECT USING (true);

ALTER TABLE public.trending_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only access." ON public.trending_services FOR SELECT USING (true);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only access." ON public.reviews FOR SELECT USING (true);

ALTER TABLE public.event_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-only access." ON public.event_services FOR SELECT USING (true);
