import { createClient } from '@supabase/supabase-js';

// Substitua pelos seus dados REAIS do painel do Supabase
const supabaseUrl = 'https://zzywoanycsvxgoxhvzyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6eXdvYW55Y3N2eGdveGh2enlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMDQyOTgsImV4cCI6MjA3OTU4MDI5OH0.dZcysxvad8Gvqg0zI6VJl7yURgk3dKjP1ZGot6iFm2M';

export const supabase = createClient(supabaseUrl, supabaseKey);