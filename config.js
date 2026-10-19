/* Zaythadi frontend configuration.
   Uses the existing Supabase project and public publishable/anon key only.
   Never place a service_role or secret key in browser code. */
window.ZAYTHADI_CONFIG = {
  supabaseUrl: 'https://zkbthficvnutulwkqbge.supabase.co',
  // If your current working dashboard uses a different publishable/anon key,
  // copy that same PUBLIC key here. Do not use a service_role/secret key.
  supabaseKey: 'sb_publishable_Cnm3BpH7gOcEJJGHVfBhYw_G2ufcg_s',
  table: 'price_reports'
};
