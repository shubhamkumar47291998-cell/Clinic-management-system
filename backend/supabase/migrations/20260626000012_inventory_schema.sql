-- Create inventory_items table
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics not null,
  name text not null,
  category text check (category in ('supplies', 'equipment', 'consumables', 'office')) not null,
  stock_qty integer not null default 0 check (stock_qty >= 0),
  min_stock_alert integer not null default 5 check (min_stock_alert >= 0),
  price_per_unit numeric(10, 2) not null check (price_per_unit >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create inventory_transactions table
create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics not null,
  item_id uuid references public.inventory_items on delete cascade not null,
  transaction_type text check (transaction_type in ('in', 'out', 'adjustment')) not null,
  quantity integer not null check (quantity > 0),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.inventory_items enable row level security;
alter table public.inventory_transactions enable row level security;

-- Policies for inventory_items
create policy "Allow clinical users to manage inventory items"
  on public.inventory_items for all
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'staff'))
  with check (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'staff'));

-- Policies for inventory_transactions
create policy "Allow clinical users to manage inventory transactions"
  on public.inventory_transactions for all
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'staff'))
  with check (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'staff'));

-- Trigger function for audit logging
create or replace function public.log_inventory_change()
returns trigger
language plpgsql
security definer
as $$
declare
  current_clinic_id uuid;
begin
  if (TG_TABLE_NAME = 'inventory_items') then
    if (TG_OP = 'DELETE') then
      current_clinic_id := OLD.clinic_id;
      insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
      values (current_clinic_id, auth.uid(), 'inventory_item_delete', OLD.id, to_jsonb(OLD));
      return OLD;
    elsif (TG_OP = 'UPDATE') then
      current_clinic_id := NEW.clinic_id;
      insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
      values (current_clinic_id, auth.uid(), 'inventory_item_update', NEW.id, jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
      return NEW;
    elsif (TG_OP = 'INSERT') then
      current_clinic_id := NEW.clinic_id;
      insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
      values (current_clinic_id, auth.uid(), 'inventory_item_create', NEW.id, to_jsonb(NEW));
      return NEW;
    end if;
  elsif (TG_TABLE_NAME = 'inventory_transactions') then
    if (TG_OP = 'DELETE') then
      current_clinic_id := OLD.clinic_id;
      insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
      values (current_clinic_id, auth.uid(), 'inventory_transaction_delete', OLD.id, to_jsonb(OLD));
      return OLD;
    elsif (TG_OP = 'UPDATE') then
      current_clinic_id := NEW.clinic_id;
      insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
      values (current_clinic_id, auth.uid(), 'inventory_transaction_update', NEW.id, jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
      return NEW;
    elsif (TG_OP = 'INSERT') then
      current_clinic_id := NEW.clinic_id;
      insert into public.audit_logs (clinic_id, actor_id, action, target_id, details)
      values (current_clinic_id, auth.uid(), 'inventory_transaction_create', NEW.id, to_jsonb(NEW));
      return NEW;
    end if;
  end if;
  return null;
end;
$$;

-- Triggers
create trigger inventory_item_audit_trigger
  after insert or update or delete on public.inventory_items
  for each row execute procedure public.log_inventory_change();

create trigger inventory_transaction_audit_trigger
  after insert or update or delete on public.inventory_transactions
  for each row execute procedure public.log_inventory_change();
