-- Finance v2 : montant versé sur chaque placement, pour suivre la plus-value.
-- Rejouable sans risque.

alter table finance_holding_values add column if not exists invested numeric;
