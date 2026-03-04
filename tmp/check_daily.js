
const { createClient } = require('@supabase/supabase-client');
require('dotenv').config({ path: '.env.local' });

async function checkDaily() {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
        .from('gsc_daily_metrics')
        .select('date')
        .order('date', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log('Most recent date in gsc_daily_metrics:', data?.[0]?.date || 'No data');
}

checkDaily();
