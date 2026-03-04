
const { createClient } = require('@supabase/supabase-client');
require('dotenv').config({ path: '.env.local' });

async function checkStatus() {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    console.log(`Using Supabase URL: ${process.env.SUPABASE_URL}`);

    const { data: daily, error: dailyErr } = await supabase
        .from('gsc_daily_metrics')
        .select('date')
        .order('date', { ascending: false })
        .limit(1);

    const { data: weekly, error: weeklyErr } = await supabase
        .from('weekly_page_summary')
        .select('week_start')
        .order('week_start', { ascending: false })
        .limit(1);

    console.log('Last Daily Data:', daily?.[0]?.date || 'None', dailyErr ? `(Error: ${dailyErr.message})` : '');
    console.log('Last Weekly Summary:', weekly?.[0]?.week_start || 'None', weeklyErr ? `(Error: ${weeklyErr.message})` : '');
}

checkStatus();
