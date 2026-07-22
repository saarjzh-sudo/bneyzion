-- הזמנות ומשלוחים (יואב 22.7 07:30): לאדמין לא הייתה שום policy על orders —
-- רק user_own (auth.uid()=user_id), והזמנות-חנות נוצרות עם user_id ריק ⇒
-- עמוד /admin/orders הציג רשימה ריקה, ואי-אפשר היה לסמן "נשלח".
-- (order_items כבר כוללת has_role admin בקריאה — orders פשוט נשכחה.)
drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all"
  on public.orders for all
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));
