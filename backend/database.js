require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
   console.warn("\n=======================================================");
   console.warn("⚠️  WARNING: MISSING SUPABASE CREDENTIALS");
   console.warn("Please add SUPABASE_URL and SUPABASE_ANON_KEY to your .env file!");
   console.warn("Go to your Supabase Project -> Settings -> API to find them.");
   console.warn("=======================================================\n");
}

const supabase = createClient(
    supabaseUrl || 'https://your-project-url.supabase.co', 
    supabaseKey || 'your-public-anon-key'
);

module.exports = supabase;
