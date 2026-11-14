-- Mail settings: where booking enquiries are sent, and the SMTP account that
-- sends them. One row, edited from Admin > Settings.
--
-- Kept out of the public `settings` table on purpose: that table is readable
-- with the website's anonymous key, and this one holds a password. Only
-- signed-in staff can read or change it; the public site reads it server-side
-- with its service-role key when it sends an enquiry.
--
-- Supabase > SQL Editor > paste > Run. Safe to run more than once.

create table if not exists mail_settings (
  id            smallint     primary key default 1 check (id = 1),
  to_address    text         not null default '',
  smtp_host     text         not null default '',
  smtp_port     integer      not null default 465 check (smtp_port between 1 and 65535),
  smtp_user     text         not null default '',
  smtp_password text         not null default '',
  from_name     text         not null default 'Website enquiry',
  updated_at    timestamptz  not null default now()
);

alter table mail_settings enable row level security;

drop policy if exists staff_manage_mail_settings on mail_settings;
create policy staff_manage_mail_settings on mail_settings
  for all to authenticated using (true) with check (true);

revoke all on mail_settings from anon;
grant all on mail_settings to authenticated, service_role;

insert into mail_settings (id) values (1) on conflict (id) do nothing;
