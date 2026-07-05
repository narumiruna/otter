CREATE TABLE trip_exchange_rates (
  trip_id text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  currency text NOT NULL CHECK (currency IN ('TWD', 'JPY', 'USD', 'EUR')),
  rate_to_base numeric(18, 8) NOT NULL CHECK (rate_to_base > 0),
  PRIMARY KEY (trip_id, currency)
);
